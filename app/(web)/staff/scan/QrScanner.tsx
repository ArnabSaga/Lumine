"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Alert, EmptyState, GlassCard, StatusBadge } from "@/components/ui/primitives";

const QR_READER_ELEMENT_ID = "qr-reader";

interface ScanResult {
  enrollment: {
    id: string;
    reference: string;
    status: string;
    priceAtEnrollment: string;
    currencyAtEnrollment: string;
    course: { name: string; slug: string };
    student: { id: string; name: string; email: string };
    payment: { amount: string; currency: string; verifiedAt: string } | null;
    assignedTeacher: { id: string; name: string } | null;
  };
  qrToken: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface ScannerProps {
  teachers: Teacher[];
}

export default function QrScanner({ teachers }: ScannerProps) {
  const [token, setToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopCamera = useCallback(() => {
    setCameraActive(false);
  }, []);

  const executeScan = useCallback(async (tokenToScan: string) => {
    if (!tokenToScan.trim()) return;
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/staff/enrollments/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToScan.trim() }),
      });
      const data: unknown = await res.json();

      setScanning(false);
      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? (data as { error: string }).error
            : "Invalid or expired QR code.";
        setError(msg);
        return;
      }
      setResult(data as ScanResult);
      // Stop camera once scanned successfully
      setCameraActive(false);
    } catch {
      setScanning(false);
      setError("Network error occurred while scanning QR code.");
    }
  }, []);

  async function handleManualScan(e: React.FormEvent) {
    e.preventDefault();
    await executeScan(token);
  }

  async function startCamera() {
    setCameraError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported in this browser. Please use manual token input below.");
      return;
    }
    // Renders the reader element; the effect below initializes the decoder.
    setCameraActive(true);
  }

  // Initialize / tear down the QR decoder whenever camera mode changes.
  useEffect(() => {
    if (!cameraActive) {
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const scanner = new Html5Qrcode(QR_READER_ELEMENT_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (cancelled || !decodedText) return;
            setToken(decodedText);
            setCameraActive(false);
            await executeScan(decodedText);
          },
          () => {
            // Per-frame decode miss — ignore and keep scanning.
          }
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? `${err.name} ${err.message}` : "";
        if (/NotAllowed|Permission|denied/i.test(message)) {
          setCameraError("Camera permission was denied. Please allow camera access in your browser settings or use manual token input below.");
        } else {
          setCameraError("Camera device unavailable or QR decoding failed to start. Please use manual token input below.");
        }
        setCameraActive(false);
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner
          .stop()
          .catch(() => {
            // Already stopped — safe to ignore.
          })
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              // Element already removed — safe to ignore.
            }
          });
      }
    };
  }, [cameraActive, executeScan]);

  async function handleApprove() {
    if (!result || !selectedTeacher) return;
    setApproving(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/enrollments/${result.enrollment.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTeacherId: selectedTeacher, qrToken: result.qrToken }),
      });
      const data: unknown = await res.json();

      setApproving(false);
      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? (data as { error: string }).error
            : "Approval failed.";
        setError(msg);
        return;
      }
      setApproved(true);
    } catch {
      setApproving(false);
      setError("Network error occurred during approval.");
    }
  }

  const isPaid = result?.enrollment.status === "PAYMENT_VERIFIED" || result?.enrollment.status === "APPROVED";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
      {/* Scanner Input & Camera */}
      <GlassCard>
        <h2 className="font-display text-xl font-black text-slate-950">Scan enrollment QR</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Camera scan is the fastest path. Manual verification remains available for denied or unavailable camera access.</p>

        {/* Camera Scanner Viewfinder */}
        <div className="mt-5 mb-5">
          {cameraActive ? (
            <div>
              <div
                className="relative w-full overflow-hidden rounded-3xl bg-black shadow-[var(--lum-shadow-elevated)]"
              >
                <div id={QR_READER_ELEMENT_ID} style={{ width: "100%" }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 30,
                    border: "2px dashed var(--lum-primary)",
                    borderRadius: 12,
                    pointerEvents: "none",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="lum-btn-secondary"
                style={{ width: "100%", marginTop: "0.5rem", fontSize: "0.8rem", padding: "0.4rem" }}
              >
                Stop Camera
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={startCamera}
                className="lum-btn-secondary"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>📷</span> Open Camera Scanner
              </button>
              {cameraError && (
                <div className="mb-3">
                  <Alert tone="warning">{cameraError}</Alert>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Token Fallback */}
        <div className="border-t border-slate-200 pt-5">
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "0.5rem" }}>
            Manual Token Verification
          </p>
          <form onSubmit={handleManualScan} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div>
              <label htmlFor="qr-token" className="lum-label">QR Token</label>
              <textarea
                id="qr-token"
                rows={2}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste or type QR token here..."
                className="lum-input"
                style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
              />
            </div>
            <button
              type="submit"
              disabled={scanning || !token.trim()}
              className="lum-btn-primary"
              style={{ width: "100%" }}
            >
              {scanning ? "Verifying..." : "Verify Token →"}
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
      </GlassCard>

      {/* Result & Approval Form */}
      <div>
        {!result && !approved && (
          <GlassCard>
            <EmptyState title="Ready to verify" description="Scan or enter a student's QR code to view payment and enrollment details." />
          </GlassCard>
        )}

        {approved && (
          <GlassCard>
            <div className="text-center">
            <p style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✓</p>
            <p className="font-display text-2xl font-black text-emerald-700">Enrollment approved</p>
            <button
              onClick={() => { setResult(null); setToken(""); setApproved(false); setSelectedTeacher(""); }}
              className="lum-btn-secondary"
              style={{ marginTop: "1.25rem" }}
            >
              Scan Another QR Code
            </button>
            </div>
          </GlassCard>
        )}

        {result && !approved && (
          <GlassCard className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-black text-slate-950">Enrollment details</h3>
              <StatusBadge status={result.enrollment.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.85rem" }}>
              <div>
                <p className="lum-label" style={{ marginBottom: 2 }}>Student</p>
                <p style={{ fontWeight: 700 }}>{result.enrollment.student.name}</p>
                <p style={{ color: "#64748b" }}>{result.enrollment.student.email}</p>
              </div>
              <div>
                <p className="lum-label" style={{ marginBottom: 2 }}>Course</p>
                <p style={{ fontWeight: 700 }}>{result.enrollment.course.name}</p>
                <p style={{ fontFamily: "var(--font-mono)", color: "#64748b", fontSize: "0.75rem" }}>{result.enrollment.reference}</p>
              </div>
              <div>
                <p className="lum-label" style={{ marginBottom: 2 }}>Amount</p>
                <p style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {result.enrollment.currencyAtEnrollment} {Number(result.enrollment.priceAtEnrollment).toLocaleString()}
                </p>
              </div>
              {result.enrollment.payment && (
                <div>
                  <p className="lum-label" style={{ marginBottom: 2 }}>Paid</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#059669" }}>
                    {result.enrollment.payment.currency} {Number(result.enrollment.payment.amount).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {isPaid && result.enrollment.status === "PAYMENT_VERIFIED" && (
              <div className="border-t border-slate-200 pt-5">
                <div>
                  <label htmlFor="teacher-select" className="lum-label">Assign Teacher <span style={{ color: "#ef4444" }}>*</span></label>
                  <select
                    id="teacher-select"
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="lum-input"
                  >
                    <option value="">— Select a Teacher —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleApprove}
                  disabled={approving || !selectedTeacher}
                  className="lum-btn-primary"
                  style={{ width: "100%", marginTop: "0.875rem" }}
                >
                  {approving ? "Approving..." : "Approve Enrollment →"}
                </button>
              </div>
            )}

            {result.enrollment.status === "APPROVED" && (
              <Alert tone="success">Already approved. Assigned to: {result.enrollment.assignedTeacher?.name ?? "N/A"}</Alert>
            )}

            {result.enrollment.status === "PENDING_PAYMENT" && (
              <Alert tone="warning">Payment not yet verified. This enrollment cannot be approved.</Alert>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
