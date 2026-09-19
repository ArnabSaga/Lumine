"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SelectedCourseEnrollmentProps {
  course: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    price: number | string;
    currency: string;
  };
}

export default function SelectedCourseEnrollment({ course }: SelectedCourseEnrollmentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmEnrollment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/student/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 409) {
        setError(data.error ?? "Failed to create enrollment.");
        setLoading(false);
        return;
      }

      // Success or already enrolled (409 returns existing enrollment) -> refresh dashboard without query param
      router.push("/student/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
      setLoading(false);
    }
  }

  return (
    <div
      className="lum-card"
      style={{
        background: "linear-gradient(135deg, rgba(250,206,57,0.08) 0%, rgba(255,255,255,1) 100%)",
        border: "1.5px solid rgba(250,206,57,0.4)",
        padding: "1.75rem",
        marginBottom: "2rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1.25rem" }}>
        <div>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#d97706",
              display: "inline-block",
              marginBottom: "0.375rem",
            }}
          >
            Selected Course to Enroll
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 900, marginBottom: "0.375rem" }}>
            {course.name}
          </h2>
          {course.description && (
            <p style={{ color: "#64748b", fontSize: "0.875rem", maxWidth: 560, marginBottom: "0.75rem" }}>
              {course.description}
            </p>
          )}
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color: "var(--lum-secondary)" }}>
            Fee: {course.currency} {Number(course.price).toLocaleString()}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          {error && (
            <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
              {error}
            </p>
          )}
          <button
            onClick={handleConfirmEnrollment}
            disabled={loading}
            className="lum-btn-primary"
            style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem" }}
          >
            {loading ? "Confirming..." : "Confirm Enrollment →"}
          </button>
        </div>
      </div>
    </div>
  );
}
