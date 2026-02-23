export interface InvoiceProvider {
  name: string;
  domain: string;
  searchQuery: string;
}

export const INVOICE_PROVIDERS: InvoiceProvider[] = [
  {
    name: "Spotify",
    domain: "spotify.com",
    searchQuery: "from:spotify.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "Cursor",
    domain: "cursor.com",
    searchQuery: "from:cursor.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "Netflix",
    domain: "netflix.com",
    searchQuery: "from:netflix.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "AWS",
    domain: "amazon.com",
    searchQuery:
      "from:aws-receivables-support@email.amazon.com subject:(invoice OR billing)",
  },
  {
    name: "Google",
    domain: "google.com",
    searchQuery:
      "from:payments-noreply@google.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "Apple",
    domain: "apple.com",
    searchQuery:
      "from:no_reply@email.apple.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "GitHub",
    domain: "github.com",
    searchQuery: "from:github.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "Vercel",
    domain: "vercel.com",
    searchQuery: "from:vercel.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "Adobe",
    domain: "adobe.com",
    searchQuery: "from:adobe.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "Notion",
    domain: "notion.so",
    searchQuery: "from:notion.so subject:(receipt OR invoice OR payment)",
  },
  {
    name: "Figma",
    domain: "figma.com",
    searchQuery: "from:figma.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "Slack",
    domain: "slack.com",
    searchQuery: "from:slack.com subject:(receipt OR invoice OR payment)",
  },
  {
    name: "OpenAI",
    domain: "openai.com",
    searchQuery: "from:openai.com subject:(receipt OR invoice OR payment)",
  },
];
