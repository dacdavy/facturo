"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { InvoiceTable, type Invoice } from "@/components/invoice-table";
import { ScanButton } from "@/components/scan-button";
import { ConnectGmailButton } from "@/components/connect-gmail-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, DollarSign, Calendar, Mail } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hasEmailAccount, setHasEmailAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchInvoices = useCallback(async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("invoice_date", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
    } else {
      setInvoices(data || []);
    }
  }, [supabase]);

  const checkEmailAccount = useCallback(async () => {
    const { data } = await supabase
      .from("email_accounts")
      .select("id")
      .limit(1);
    setHasEmailAccount((data?.length ?? 0) > 0);
  }, [supabase]);

  useEffect(() => {
    Promise.all([fetchInvoices(), checkEmailAccount()]).finally(() =>
      setLoading(false)
    );
  }, [fetchInvoices, checkEmailAccount]);

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete invoice");
    } else {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    }
  }

  async function handleDownload(id: string) {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice?.pdf_path) return;

    const { data, error } = await supabase.storage
      .from("invoices")
      .createSignedUrl(invoice.pdf_path, 60);

    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  const totalAmount = invoices
    .filter((inv) => inv.amount !== null)
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  const processedCount = invoices.filter(
    (inv) => inv.status === "processed"
  ).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your invoices at a glance
          </p>
        </div>
        <div className="flex gap-2">
          {!hasEmailAccount && <ConnectGmailButton />}
          {hasEmailAccount && (
            <ScanButton
              onComplete={() => {
                fetchInvoices();
              }}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "EUR",
              }).format(totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Connected Emails
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasEmailAccount ? 1 : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <InvoiceTable
        data={invoices}
        onDelete={handleDelete}
        onDownload={handleDownload}
      />
    </div>
  );
}
