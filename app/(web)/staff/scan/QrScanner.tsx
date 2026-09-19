"use client";

import { useState, useRef, useEffect } from "react";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  async function executeScan(tokenToScan: string) {
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
      stopCamera();
    } catch {
      setScanning(false);
      setError("Network error occurred while scanning QR code.");
    }
  }

  async function handleManualScan(e: React.FormEvent) {
    e.preventDefault();
    await executeScan(token);
  }

  async function startCamera() {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported in this browser environment. Please use manual token input.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Setup barcode detector if supported
      if ("BarcodeDetector" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                const detectedVal = barcodes[0].rawValue;
                setToken(detectedVal);
                await executeScan(detectedVal);
              }
            } catch {
              // Ignore frame detection error
            }
          }
        }, 500);
      }
    } catch (err: unknown) {
      console.warn("Camera error:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Permission") || msg.includes("NotAllowedError") || msg.includes("denied")) {
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings or use manual token input.");
      } else {
        setCameraError("Camera device unavailable or not found. Please use manual token input.");
      }
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
      {/* Scanner Input & Camera */}
      <div className="lum-card">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem" }}>
          Scan Enrollment QR
        </h2>

        {/* Camera Scanner Viewfinder */}
        <div style={{ marginBottom: "1.25rem" }}>
          {cameraActive ? (
            <div>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 220,
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  background: "#000",
                }}
              >
                <video
                  ref={videoRef}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  playsInline
                  muted
                />
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
                <div
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: 6,
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.75rem",
                    color: "#92400e",
                    marginBottom: "0.75rem",
                  }}
                >
                  {cameraError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Token Fallback */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
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
          <div style={{ marginTop: "1rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "0.75rem", color: "#dc2626", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}
      </div>

      {/* Result & Approval Form */}
      <div>
        {!result && !approved && (
          <div className="lum-card" style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📷</p>
            <p>Scan or enter a student&apos;s QR code to view their verified enrollment details</p>
          </div>
        )}

        {approved && (
          <div className="lum-card" style={{ textAlign: "center", padding: "2.5rem" }}>
            <p style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</p>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", color: "#059669" }}>Enrollment Approved!</p>
            <button
              onClick={() => { setResult(null); setToken(""); setApproved(false); setSelectedTeacher(""); }}
              className="lum-btn-secondary"
              style={{ marginTop: "1.25rem" }}
            >
              Scan Another QR Code
            </button>
          </div>
        )}

        {result && !approved && (
          <div className="lum-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem" }}>Enrollment Details</h3>
              <span className={`lum-badge ${isPaid ? "lum-badge-verified" : "lum-badge-pending"}`}>
                {result.enrollment.status.replace(/_/g, " ")}
              </span>
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
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
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
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "0.75rem", color: "#059669", fontSize: "0.875rem" }}>
                ✓ Already approved. Assigned to: {result.enrollment.assignedTeacher?.name ?? "N/A"}
              </div>
            )}

            {result.enrollment.status === "PENDING_PAYMENT" && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "0.75rem", color: "#92400e", fontSize: "0.875rem" }}>
                ⚠ Payment not yet verified — cannot approve this enrollment.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
