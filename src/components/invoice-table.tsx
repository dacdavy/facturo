"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { UploadPdfButton } from "@/components/upload-pdf-button";

export interface Invoice {
  id: string;
  provider: string;
  amount: number | null;
  currency: string;
  invoice_date: string | null;
  email_date: string | null;
  pdf_path: string | null;
  pdf_filename: string | null;
  invoice_url: string | null;
  email_subject: string | null;
  status: string;
  created_at: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onRefresh: () => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatAmount(amount: number | null, currency: string) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    processed: "default",
    added: "default",
    needs_pdf: "secondary",
    pending: "outline",
    error: "destructive",
  };

  const labels: Record<string, string> = {
    processed: "Processed",
    added: "Added",
    needs_pdf: "Needs PDF",
    pending: "Pending",
    error: "Error",
  };

  return (
    <Badge variant={variants[status] || "outline"}>
      {labels[status] || status}
    </Badge>
  );
}

export function InvoiceTable({ invoices, onRefresh }: InvoiceTableProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function handleDownload(invoice: Invoice) {
    if (!invoice.pdf_path) return;
    try {
      const res = await fetch(
        `/api/invoices/${invoice.id}`
      );
      if (!res.ok) throw new Error();
      window.open(
        `/api/invoices/${invoice.id}/download`,
        "_blank"
      );
    } catch {
      toast.error("Failed to download");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice?")) return;
    setLoadingAction(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Invoice deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete invoice");
    }
    setLoadingAction(null);
  }

  async function toggleStatus(invoice: Invoice) {
    const newStatus =
      invoice.status === "added" ? "needs_pdf" : "added";
    setLoadingAction(invoice.id + "-toggle");
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(
        newStatus === "added" ? "Marked as added" : "Marked as not added"
      );
      onRefresh();
    } catch {
      toast.error("Failed to update status");
    }
    setLoadingAction(null);
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No invoices yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan your email or add invoices manually to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{invoice.provider}</p>
                  {invoice.email_subject && (
                    <p className="max-w-[250px] truncate text-xs text-muted-foreground">
                      {invoice.email_subject}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono">
                {formatAmount(invoice.amount, invoice.currency)}
              </TableCell>
              <TableCell>
                {formatDate(invoice.invoice_date || invoice.email_date)}
              </TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {/* Toggle added / not added */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleStatus(invoice)}
                    disabled={loadingAction === invoice.id + "-toggle"}
                    title={
                      invoice.status === "added"
                        ? "Mark as not added"
                        : "Mark as added"
                    }
                  >
                    {loadingAction === invoice.id + "-toggle" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : invoice.status === "added" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Upload PDF for needs_pdf rows */}
                  {(invoice.status === "needs_pdf" ||
                    !invoice.pdf_path) && (
                    <UploadPdfButton
                      invoiceId={invoice.id}
                      onComplete={onRefresh}
                    />
                  )}

                  {/* Visit billing page */}
                  {invoice.invoice_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="Open billing page"
                    >
                      <a
                        href={invoice.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}

                  {/* Download PDF */}
                  {invoice.pdf_path && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(invoice)}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(invoice.id)}
                    disabled={loadingAction === invoice.id}
                    title="Delete"
                  >
                    {loadingAction === invoice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
