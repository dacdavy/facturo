import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGmailClient,
  searchEmails,
  getEmailWithAttachments,
  downloadAttachment,
} from "@/lib/gmail";
import { extractTextFromPdf, extractInvoiceData } from "@/lib/ai-extract";
import { INVOICE_PROVIDERS } from "@/lib/providers";

export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: accounts } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("user_id", user.id);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json(
      { error: "No email account connected. Please connect Gmail first." },
      { status: 400 }
    );
  }

  let totalProcessed = 0;

  for (const account of accounts) {
    const gmail = getGmailClient(
      account.access_token,
      account.refresh_token
    );

    for (const provider of INVOICE_PROVIDERS) {
      try {
        const messages = await searchEmails(gmail, provider.searchQuery, 10);

        for (const msg of messages) {
          if (!msg.id) continue;

          const { data: existing } = await supabase
            .from("invoices")
            .select("id")
            .eq("gmail_message_id", msg.id)
            .eq("user_id", user.id)
            .limit(1);

          if (existing && existing.length > 0) continue;

          try {
            const emailData = await getEmailWithAttachments(gmail, msg.id);

            if (emailData.attachments.length === 0) continue;

            for (const attachment of emailData.attachments) {
              const pdfBuffer = await downloadAttachment(
                gmail,
                msg.id,
                attachment.attachmentId
              );

              const storagePath = `${user.id}/${msg.id}/${attachment.filename}`;
              const { error: uploadError } = await supabase.storage
                .from("invoices")
                .upload(storagePath, pdfBuffer, {
                  contentType: "application/pdf",
                  upsert: true,
                });

              if (uploadError) {
                console.error("Upload error:", uploadError);
                continue;
              }

              let invoiceData = {
                provider: provider.name,
                amount: null as number | null,
                currency: "EUR",
                invoiceDate: null as string | null,
              };

              try {
                const pdfText = await extractTextFromPdf(pdfBuffer);
                invoiceData = await extractInvoiceData(
                  pdfText,
                  emailData.subject
                );
              } catch (extractErr) {
                console.error("AI extraction error:", extractErr);
              }

              const { error: insertError } = await supabase
                .from("invoices")
                .insert({
                  user_id: user.id,
                  email_account_id: account.id,
                  provider: invoiceData.provider || provider.name,
                  amount: invoiceData.amount,
                  currency: invoiceData.currency || "EUR",
                  invoice_date: invoiceData.invoiceDate,
                  pdf_path: storagePath,
                  pdf_filename: attachment.filename,
                  email_subject: emailData.subject,
                  email_date: emailData.date
                    ? new Date(emailData.date).toISOString()
                    : null,
                  gmail_message_id: msg.id,
                  status: invoiceData.amount ? "processed" : "pending",
                });

              if (insertError) {
                console.error("Insert error:", insertError);
              } else {
                totalProcessed++;
              }
            }
          } catch (emailErr) {
            console.error(
              `Error processing email ${msg.id}:`,
              emailErr
            );
          }
        }
      } catch (searchErr) {
        console.error(
          `Error searching for ${provider.name}:`,
          searchErr
        );
      }
    }
  }

  return NextResponse.json({ processed: totalProcessed });
}
