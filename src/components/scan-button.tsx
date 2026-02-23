"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ScanButtonProps {
  onComplete: () => void;
}

export function ScanButton({ onComplete }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    setScanning(true);
    toast.info("Scanning your inbox for invoices...");

    try {
      const res = await fetch("/api/gmail/scan", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Scan failed");
      }

      toast.success(
        `Scan complete! Found ${data.processed} new invoice(s).`
      );
      onComplete();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to scan inbox"
      );
    } finally {
      setScanning(false);
    }
  }

  return (
    <Button onClick={handleScan} disabled={scanning}>
      <RefreshCw
        className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : ""}`}
      />
      {scanning ? "Scanning..." : "Scan for Invoices"}
    </Button>
  );
}
