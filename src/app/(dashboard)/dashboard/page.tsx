"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { InvoiceTable, type Invoice } from "@/components/invoice-table";
import { ScanButton } from "@/components/scan-button";
import { ConnectGmailButton } from "@/components/connect-gmail-button";
import { AddInvoiceDialog } from "@/components/add-invoice-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Mail,
} from "lucide-react";

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hasEmailAccount, setHasEmailAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchInvoices = useCallback(async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

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

  const totalAmount = invoices
    .filter((inv) => inv.amount !== null)
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  const addedCount = invoices.filter((inv) => inv.status === "added").length;
  const needsPdfCount = invoices.filter(
    (inv) => inv.status === "needs_pdf"
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
          <AddInvoiceDialog onComplete={fetchInvoices} />
          {!hasEmailAccount && <ConnectGmailButton />}
          {hasEmailAccount && (
            <ScanButton onComplete={fetchInvoices} />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
              }).format(totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Added</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{addedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs PDF</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{needsPdfCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Connected Email
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

      <InvoiceTable invoices={invoices} onRefresh={fetchInvoices} />
    </div>
  );
}
