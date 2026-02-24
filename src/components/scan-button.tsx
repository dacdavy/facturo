"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { INVOICE_PROVIDERS } from "@/lib/providers";

interface ScanButtonProps {
  onComplete: () => void;
}

export function ScanButton({ onComplete }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState("");

  async function handleScan() {
    setScanning(true);
    let totalFound = 0;

    try {
      for (let i = 0; i < INVOICE_PROVIDERS.length; i++) {
        const provider = INVOICE_PROVIDERS[i];
        setProgress(`${provider.name} (${i + 1}/${INVOICE_PROVIDERS.length})`);

        try {
          const res = await fetch("/api/gmail/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ providerIndex: i }),
          });

          if (!res.ok) {
            const text = await res.text();
            let errorMsg: string;
            try {
              errorMsg = JSON.parse(text).error || `Error scanning ${provider.name}`;
            } catch {
              errorMsg = `Error scanning ${provider.name} (${res.status})`;
            }
            console.error(errorMsg);
            continue;
          }

          const data = await res.json();
          totalFound += data.processed || 0;
        } catch (err) {
          console.error(`Failed to scan ${provider.name}:`, err);
        }
      }

      if (totalFound > 0) {
        toast.success(`Scan complete! Found ${totalFound} new invoice(s).`);
      } else {
        toast.info("Scan complete. No new invoices found.");
      }
      onComplete();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to scan inbox"
      );
    } finally {
      setScanning(false);
      setProgress("");
    }
  }

  return (
    <Button onClick={handleScan} disabled={scanning}>
      <RefreshCw
        className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : ""}`}
      />
      {scanning
        ? progress
          ? `Scanning ${progress}`
          : "Scanning..."
        : "Scan for Invoices"}
    </Button>
  );
}
