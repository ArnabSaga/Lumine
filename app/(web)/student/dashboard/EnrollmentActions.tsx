"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EnrollmentActionsProps {
  enrollmentId: string;
  latestPayment?: {
    id: string;
    status: string;
  } | null;
}

export default function EnrollmentActions({ enrollmentId, latestPayment }: EnrollmentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "initiated" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function initiatePayment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/student/enrollments/${enrollmentId}/checkout`, {
        method: "POST",
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? (data as { error: string }).error
            : "Payment initiation failed.";
        setError(msg);
        setLoading(false);
        return;
      }

      setStatus("initiated");
      // Refresh dashboard to display verified status & QR
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch {
      setError("Unexpected network error during payment.");
      setLoading(false);
    }
  }

  if (status === "initiated") {
    return (
      <div
        style={{
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 8,
          padding: "0.75rem 1rem",
          fontSize: "0.875rem",
          color: "#059669",
          marginTop: "0.5rem",
        }}
      >
        ✓ Demo payment verified — loading your QR code...
      </div>
    );
  }

  const isPending = latestPayment?.status === "PENDING";
  const isFailed = latestPayment?.status === "FAILED";

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "0.625rem 0.875rem",
            marginBottom: "0.5rem",
            color: "#dc2626",
            fontSize: "0.8rem",
          }}
        >
          {error}
        </div>
      )}

      {isPending ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "#d97706", fontWeight: 600 }}>
            ⏳ Payment processing...
          </span>
          <button
            onClick={initiatePayment}
            disabled={loading}
            className="lum-btn-primary"
            style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
          >
            {loading ? "Processing..." : "Resume / Retry Payment"}
          </button>
        </div>
      ) : isFailed ? (
        <div>
          <p style={{ fontSize: "0.75rem", color: "#dc2626", marginBottom: "0.375rem" }}>
            Previous payment attempt failed.
          </p>
          <button
            onClick={initiatePayment}
            disabled={loading}
            className="lum-btn-primary"
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
          >
            {loading ? "Processing..." : "Retry Payment (Demo) →"}
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              background: "rgba(250,206,57,0.1)",
              border: "1px solid rgba(250,206,57,0.3)",
              borderRadius: 8,
              padding: "0.625rem 0.875rem",
              marginBottom: "0.75rem",
              fontSize: "0.8rem",
              color: "#92400e",
            }}
          >
            ⚡ <strong>Demo Payment Simulation</strong> — No real money charged.
          </div>
          <button
            onClick={initiatePayment}
            disabled={loading}
            className="lum-btn-primary"
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
          >
            {loading ? "Processing..." : "Pay Now (Demo) →"}
          </button>
        </>
      )}
    </div>
  );
}
