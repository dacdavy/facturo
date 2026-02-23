"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function ConnectGmailButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/gmail/connect");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
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
