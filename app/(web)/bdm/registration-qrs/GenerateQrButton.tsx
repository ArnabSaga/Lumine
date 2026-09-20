"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GenerateQrButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createQr() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bdm/registration-qrs", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not create registration QR.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" className="lum-btn-primary" onClick={createQr} disabled={loading}>
        {loading ? "Creating QR..." : "Generate Registration QR"}
      </button>
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
