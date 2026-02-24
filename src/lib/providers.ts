export interface InvoiceProvider {
  id: string;
  name: string;
  sender_email: string;
  invoice_url: string | null;
  logo_url: string | null;
  search_query: string;
  is_default: boolean;
  user_id: string | null;
}

export async function fetchProviders(): Promise<InvoiceProvider[]> {
  const res = await fetch("/api/providers");
  if (!res.ok) return [];
  return res.json();
}
