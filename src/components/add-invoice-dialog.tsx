"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddInvoiceDialogProps {
  onComplete: () => void;
}

export function AddInvoiceDialog({ onComplete }: AddInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [invoiceDate, setInvoiceDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider.trim(),
          amount: amount ? parseFloat(amount) : null,
          currency,
          invoice_date: invoiceDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create invoice");
      }

      toast.success("Invoice added");
      setOpen(false);
      setProvider("");
      setAmount("");
      setCurrency("EUR");
      setInvoiceDate("");
      onComplete();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add invoice"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Invoice Manually</DialogTitle>
          <DialogDescription>
            Create an invoice entry. You can upload the PDF later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider *</Label>
            <Input
              id="provider"
              placeholder="e.g. Spotify, Netflix..."
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="9.99"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                placeholder="EUR"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Invoice Date</Label>
            <Input
              id="date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Invoice"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
