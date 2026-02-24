import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGmailClient,
  searchEmails,
  getEmailWithAttachments,
  downloadAttachment,
} from "@/lib/gmail";
import { INVOICE_PROVIDERS } from "@/lib/providers";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
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

    const body = await request.json().catch(() => ({}));
    const providerIndex =
      typeof body.providerIndex === "number" ? body.providerIndex : null;

    const providers =
      providerIndex !== null && providerIndex < INVOICE_PROVIDERS.length
        ? [INVOICE_PROVIDERS[providerIndex]]
        : INVOICE_PROVIDERS;

    let totalProcessed = 0;
    const errors: string[] = [];

    for (const account of accounts) {
      const gmail = getGmailClient(
        account.access_token,
        account.refresh_token
      );

      for (const provider of providers) {
        try {
          const messages = await searchEmails(
            gmail,
            provider.searchQuery,
            5
          );

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
              const emailData = await getEmailWithAttachments(
                gmail,
                msg.id
              );

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
                  const { extractTextFromPdf, extractInvoiceData } =
                    await import("@/lib/ai-extract");
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
                  errors.push(
                    `Failed to save invoice from ${provider.name}`
                  );
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
          errors.push(`Failed to search ${provider.name}`);
        }
      }
    }

    return NextResponse.json({
      processed: totalProcessed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Scan route error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
