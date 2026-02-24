"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export function ConnectGmailButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/gmail/connect");
      if (!res.ok) {
        const text = await res.text();
        let errorMsg: string;
        try {
          errorMsg = JSON.parse(text).error || "Failed to connect";
        } catch {
          errorMsg = `Connection failed (${res.status})`;
        }
        toast.error(errorMsg);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to connect Gmail"
      );
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleConnect} disabled={loading} variant="outline">
      <Mail className="mr-2 h-4 w-4" />
      {loading ? "Connecting..." : "Connect Gmail"}
    </Button>
  );
}
