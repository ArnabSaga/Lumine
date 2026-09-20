"use client";

/* eslint-disable @next/next/no-img-element -- QR is a generated data URL, not optimizable media */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/primitives";

type RegistrationQrCardQr = {
  id: string;
  url: string;
  createdAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  admission: { id: string; reference: string; status: string } | null;
};

type RegistrationQrCardProps = {
  qr: RegistrationQrCardQr;
  imageSrc: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function RegistrationQrCard({ qr, imageSrc }: RegistrationQrCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const shortId = `RQ-${qr.id.slice(-4).toUpperCase()}`;
  const status = qr.revokedAt ? "REVOKED" : qr.admission || qr.usedAt ? "REGISTERED" : "ACTIVE";
  const fileName = `luminedge-registration-qr-${shortId}.png`;

  async function handleCopy() {
    setCopyError(null);
    const ok = await copyText(qr.url);
    if (!ok) {
      setCopyError("Could not copy the link in this browser.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke() {
    if (!confirmingRevoke) {
      setConfirmingRevoke(true);
      return;
    }
    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await fetch(`/api/bdm/registration-qrs/${qr.id}/revoke`, { method: "POST" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? (data as { error: string }).error
            : "Could not revoke this QR.";
        setRevokeError(msg);
        setRevoking(false);
        setConfirmingRevoke(false);
        return;
      }
      setConfirmingRevoke(false);
      router.refresh();
    } catch {
      setRevokeError("Network error while revoking this QR.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="rounded-[var(--lum-radius-card)] border border-slate-200 bg-white/80 p-4">
      <img src={imageSrc} alt={`Student registration QR ${shortId}`} className={`mx-auto h-44 w-44 rounded-2xl bg-white p-2 ${status === "ACTIVE" ? "" : "opacity-60"}`} />
      <div className="mt-4 flex items-center justify-between gap-3">
        <StatusBadge status={status} />
        <span className="text-xs text-slate-500">{new Date(qr.createdAt).toLocaleDateString("en-BD")}</span>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-950">Registration QR</p>
      <p className="mt-1 font-mono text-xs text-slate-500">QR ID: {shortId}</p>

      {status === "ACTIVE" && (
        <>
          <p className="mt-2 text-xs text-slate-500">Single use — share with one Student only.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleCopy} aria-label="Copy registration link" className="lum-btn-secondary px-3 py-2 text-xs">
              {copied ? "Copied" : "Copy Link"}
            </button>
            <a href={imageSrc} download={fileName} aria-label="Download registration QR" className="lum-btn-secondary px-3 py-2 text-xs">
              Download QR
            </a>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revoking}
              aria-label="Revoke registration QR"
              className="lum-btn-secondary px-3 py-2 text-xs"
            >
              {revoking ? "Revoking..." : confirmingRevoke ? "Confirm revoke?" : "Revoke"}
            </button>
          </div>
          {copyError && <p className="mt-2 text-xs font-semibold text-red-700">{copyError}</p>}
          {revokeError && <p className="mt-2 text-xs font-semibold text-red-700">{revokeError}</p>}
        </>
      )}

      {status === "REGISTERED" && (
        <div className="mt-3">
          <p className="text-sm text-slate-600">Registration completed — this QR cannot be reused.</p>
          {qr.admission && (
            <p className="mt-2 text-sm text-slate-600">
              Admission <span className="font-mono font-black">{qr.admission.reference}</span>
            </p>
          )}
        </div>
      )}

      {status === "REVOKED" && (
        <p className="mt-3 text-sm text-slate-600">This QR can no longer be used.</p>
      )}
    </div>
  );
}
