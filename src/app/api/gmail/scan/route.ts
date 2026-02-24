import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGmailClient,
  searchEmails,
  getEmailWithAttachments,
  downloadAttachment,
} from "@/lib/gmail";

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
    const providerId = body.providerId as string | undefined;

    let providers;
    if (providerId) {
      const { data } = await supabase
        .from("providers")
        .select("*")
        .eq("id", providerId)
        .single();
      providers = data ? [data] : [];
    } else {
      const { data } = await supabase
        .from("providers")
        .select("*")
        .or(`is_default.eq.true,user_id.eq.${user.id}`);
      providers = data || [];
    }

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
            provider.search_query,
            10
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

              const hasPdfAttachment = emailData.attachments.length > 0;

              let invoiceData = {
                provider: provider.name,
                amount: null as number | null,
                currency: "EUR",
                invoiceDate: null as string | null,
              };

              let storagePath: string | null = null;
              let pdfFilename: string | null = null;

              if (hasPdfAttachment) {
                const attachment = emailData.attachments[0];
                const pdfBuffer = await downloadAttachment(
                  gmail,
                  msg.id,
                  attachment.attachmentId
                );

                storagePath = `${user.id}/${msg.id}/${attachment.filename}`;
                pdfFilename = attachment.filename;

                const { error: uploadError } = await supabase.storage
                  .from("invoices")
                  .upload(storagePath, pdfBuffer, {
                    contentType: "application/pdf",
                    upsert: true,
                  });

                if (uploadError) {
                  console.error("Upload error:", uploadError);
                  storagePath = null;
                  pdfFilename = null;
                }

                try {
                  const { extractTextFromPdf, extractInvoiceData } =
                    await import("@/lib/ai-extract");
                  const pdfText = await extractTextFromPdf(pdfBuffer);
                  invoiceData = await extractInvoiceData(
                    pdfText,
                    emailData.subject
                  );
                } catch (extractErr) {
                  console.error("PDF extraction error:", extractErr);
                }
              } else if (emailData.bodyText) {
                try {
                  const { extractFromEmailBody } = await import(
                    "@/lib/ai-extract"
                  );
                  invoiceData = await extractFromEmailBody(
                    emailData.bodyText,
                    emailData.subject,
                    provider.name
                  );
                } catch (extractErr) {
                  console.error("Email body extraction error:", extractErr);
                }
              }

              const status = hasPdfAttachment && storagePath
                ? invoiceData.amount
                  ? "processed"
                  : "pending"
                : "needs_pdf";

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
                  pdf_filename: pdfFilename,
                  email_subject: emailData.subject,
                  email_date: emailData.date
                    ? new Date(emailData.date).toISOString()
                    : null,
                  gmail_message_id: msg.id,
                  invoice_url: provider.invoice_url,
                  status,
                });

              if (insertError) {
                console.error("Insert error:", insertError);
                errors.push(
                  `Failed to save invoice from ${provider.name}`
                );
              } else {
                totalProcessed++;
              }
            } catch (emailErr) {
              console.error(
                `Error processing email ${msg.id}:`,
                emailErr
              );
            }
          }
        } catch (searchErr: unknown) {
          const errMsg =
            searchErr instanceof Error ? searchErr.message : String(searchErr);
          console.error(
            `Error searching for ${provider.name}:`,
            searchErr
          );

          if (
            errMsg.includes("insufficient authentication scopes") ||
            errMsg.includes("Insufficient Permission") ||
            errMsg.includes("invalid_grant") ||
            errMsg.includes("Token has been expired or revoked")
          ) {
            return NextResponse.json(
              {
                error: "RECONNECT_REQUIRED",
                message:
                  "Your Gmail connection has expired or lacks permissions. Please disconnect and reconnect Gmail in Settings.",
                processed: totalProcessed,
              },
              { status: 403 }
            );
          }

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
