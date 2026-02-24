"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { InvoiceProvider } from "@/lib/providers";

interface ScanButtonProps {
  onComplete: () => void;
}

export function ScanButton({ onComplete }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState("");
  const [providers, setProviders] = useState<InvoiceProvider[]>([]);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setProviders)
      .catch(() => setProviders([]));
  }, []);

  async function handleScan() {
    setScanning(true);
    let totalProcessed = 0;

    try {
      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        setProgress(`Scanning ${provider.name} (${i + 1}/${providers.length})`);

        try {
          const res = await fetch("/api/gmail/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ providerId: provider.id }),
          });

          let data;
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch {
            console.error("Non-JSON response from scan:", text);
            continue;
          }

          if (data.error === "RECONNECT_REQUIRED") {
            toast.error(
              "Gmail connection expired. Please go to Settings, disconnect Gmail, and reconnect it.",
              { duration: 8000 }
            );
            onComplete();
            return;
          }

          if (data.processed) {
            totalProcessed += data.processed;
          }
        } catch (err) {
          console.error(`Error scanning ${provider.name}:`, err);
        }
      }

      if (totalProcessed > 0) {
        toast.success(
          `Found ${totalProcessed} new invoice${totalProcessed > 1 ? "s" : ""}`
        );
      } else {
        toast.info("No new invoices found");
      }

      onComplete();
    } catch {
      toast.error("Scan failed unexpectedly");
    } finally {
      setScanning(false);
      setProgress("");
    }
  }

  return (
    <Button onClick={handleScan} disabled={scanning}>
      {scanning ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {progress || "Scanning..."}
        </>
      ) : (
        <>
          <Search className="mr-2 h-4 w-4" />
          Scan for Invoices
        </>
      )}
    </Button>
  );
}
