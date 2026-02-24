"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UploadPdfButtonProps {
  invoiceId: string;
  onComplete: () => void;
}

export function UploadPdfButton({
  invoiceId,
  onComplete,
}: UploadPdfButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/invoices/${invoiceId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      toast.success("PDF uploaded and processed!");
      onComplete();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload PDF"
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Upload PDF"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
