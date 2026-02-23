import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedInvoiceData {
  provider: string;
  amount: number | null;
  currency: string;
  invoiceDate: string | null;
}

export async function extractTextFromPdf(
  pdfBuffer: Buffer
): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

export async function extractInvoiceData(
  pdfText: string,
  emailSubject: string
): Promise<ExtractedInvoiceData> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an invoice data extraction assistant. Extract the following information from this invoice/receipt text.

Return ONLY a valid JSON object with these fields:
- "provider": string (the company/service name, e.g. "Spotify", "Cursor", "Netflix")
- "amount": number or null (the total amount charged, as a decimal number without currency symbol)
- "currency": string (3-letter currency code like "EUR", "USD", "GBP". Default to "EUR" if unclear)
- "invoiceDate": string or null (the invoice/billing date in YYYY-MM-DD format)

Email subject: ${emailSubject}

Invoice/receipt text:
${pdfText.slice(0, 4000)}

Return ONLY the JSON object, no explanation or markdown.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return { provider: "Unknown", amount: null, currency: "EUR", invoiceDate: null };
  }

  try {
    const cleaned = content.text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { provider: "Unknown", amount: null, currency: "EUR", invoiceDate: null };
  }
}
