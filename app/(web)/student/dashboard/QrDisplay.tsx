"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrDisplayProps {
  token: string;
}

export default function QrDisplay({ token }: QrDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    QRCode.toDataURL(token, {
      width: 160,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setDataUrl).catch(console.error);
  }, [token]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  if (!dataUrl) {
    return (
      <div style={{ width: 160, height: 160, background: "#f1f5f9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "#94a3b8" }}>
        Generating QR...
      </div>
    );
  }

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="Enrollment verification QR code"
        width={160}
        height={160}
        style={{ borderRadius: 8, border: "2px solid var(--lum-primary)", display: "block" }}
      />
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "#64748b", marginTop: "0.5rem", textAlign: "center", wordBreak: "break-all", maxWidth: 160 }}>
        {token.slice(0, 16)}…
      </p>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          marginTop: "0.5rem",
          width: 160,
          padding: "0.45rem 0.5rem",
          borderRadius: 6,
          border: "1px solid #cbd5e1",
          background: "#fff",
          color: "var(--lum-secondary)",
          cursor: "pointer",
          fontSize: "0.7rem",
          fontWeight: 700,
        }}
      >
        Copy Verification Code
      </button>
      {copyStatus === "copied" && (
        <p style={{ fontSize: "0.65rem", color: "#059669", marginTop: "0.375rem", maxWidth: 160 }}>
          Verification code copied.
        </p>
      )}
      {copyStatus === "error" && (
        <p style={{ fontSize: "0.65rem", color: "#dc2626", marginTop: "0.375rem", maxWidth: 160 }}>
          Unable to copy automatically. Try again or use the QR scan.
        </p>
      )}
    </div>
  );
}
