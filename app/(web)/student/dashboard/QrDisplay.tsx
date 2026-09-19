"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrDisplayProps {
  token: string;
}

export default function QrDisplay({ token }: QrDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(token, {
      width: 160,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setDataUrl).catch(console.error);
  }, [token]);

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
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "#94a3b8", marginTop: "0.375rem", textAlign: "center", wordBreak: "break-all", maxWidth: 160 }}>
        {token.slice(0, 16)}…
      </p>
    </div>
  );
}
