"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, Globe, Mail } from "lucide-react";
import { toast } from "sonner";
import type { InvoiceProvider } from "@/lib/providers";

export function ProviderManager() {
  const [providers, setProviders] = useState<InvoiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [name, setName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch {
      console.error("Failed to fetch providers");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !senderEmail.trim()) return;

    setFormLoading(true);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sender_email: senderEmail.trim(),
          invoice_url: invoiceUrl.trim() || null,
          logo_url: logoUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add provider");
      }

      toast.success(`${name} added`);
      setDialogOpen(false);
      resetForm();
      fetchProviders();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add provider"
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string, providerName: string) {
    try {
      const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`${providerName} removed`);
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Failed to delete provider");
    }
  }

  function resetForm() {
    setName("");
    setSenderEmail("");
    setInvoiceUrl("");
    setLogoUrl("");
  }

  const defaultProviders = providers.filter((p) => p.is_default);
  const customProviders = providers.filter((p) => !p.is_default);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoice Providers</CardTitle>
            <CardDescription>
              Services to scan for in your inbox. Add custom providers for
              services not listed.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Provider</DialogTitle>
                <DialogDescription>
                  Add a service to scan for invoices in your email.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pname">Service Name *</Label>
                  <Input
                    id="pname"
                    placeholder="e.g. Canva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pemail">Sender Email *</Label>
                  <Input
                    id="pemail"
                    type="email"
                    placeholder="e.g. billing@canva.com"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purl">Invoice / Billing Page URL</Label>
                  <Input
                    id="purl"
                    type="url"
                    placeholder="e.g. https://www.canva.com/settings/billing"
                    value={invoiceUrl}
                    onChange={(e) => setInvoiceUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plogo">Logo URL</Label>
                  <Input
                    id="plogo"
                    type="url"
                    placeholder="Optional logo image URL"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={formLoading}
                >
                  {formLoading ? "Adding..." : "Add Provider"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            {customProviders.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Custom Providers
                </p>
                {customProviders.map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {p.sender_email}
                            {p.invoice_url && (
                              <>
                                <Globe className="ml-1 h-3 w-3" />
                                <a
                                  href={p.invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  Billing page
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                    <Separator className="mt-3" />
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Built-in Providers ({defaultProviders.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {defaultProviders.map((p) => (
                  <Badge key={p.id} variant="secondary">
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
