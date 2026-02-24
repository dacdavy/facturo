import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: invoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "A PDF file is required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || "invoice.pdf";
    const storagePath = `${user.id}/${id}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload PDF: " + uploadError.message },
        { status: 500 }
      );
    }

    let extractedData: Record<string, unknown> = {};
    try {
      const { extractTextFromPdf, extractInvoiceData } = await import(
        "@/lib/ai-extract"
      );
      const pdfText = await extractTextFromPdf(buffer);
      const result = await extractInvoiceData(
        pdfText,
        invoice.email_subject || invoice.provider
      );
      extractedData = {
        amount: result.amount,
        currency: result.currency || "EUR",
        invoice_date: result.invoiceDate,
        provider: result.provider || invoice.provider,
      };
    } catch (err) {
      console.error("AI extraction failed:", err);
    }

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({
        pdf_path: storagePath,
        pdf_filename: filename,
        status: "processed",
        ...extractedData,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
