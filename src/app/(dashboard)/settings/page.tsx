"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConnectGmailButton } from "@/components/connect-gmail-button";
import { ProviderManager } from "@/components/provider-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  created_at: string;
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from("email_accounts")
      .select("id, provider, email, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching accounts:", error);
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleDisconnect(id: string) {
    const { error } = await supabase
      .from("email_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to disconnect account");
    } else {
      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
      toast.success("Email account disconnected");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your email accounts and invoice providers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Accounts</CardTitle>
          <CardDescription>
            Connect your email to automatically scan for invoices. We only
            request read-only access to your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Mail className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No email accounts connected yet.
              </p>
              <ConnectGmailButton />
            </div>
          ) : (
            <>
              {accounts.map((account) => (
                <div key={account.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{account.email}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {account.provider}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Connected{" "}
                            {new Date(
                              account.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDisconnect(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
              <ConnectGmailButton />
            </>
          )}
        </CardContent>
      </Card>

      <ProviderManager />
    </div>
  );
}
