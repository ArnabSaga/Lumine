"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApproveAdmissionButton({
  admissionId,
  teacherName,
}: {
  admissionId: string;
  teacherName: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  async function approve() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/admissions/${admissionId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not approve admission.");
        return;
      }
      setApproved(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" className="lum-btn-primary w-full justify-center" onClick={approve} disabled={loading}>
        {loading ? "Approving..." : "Approve Admission"}
      </button>
      {approved && !error && (
        <p className="mt-2 text-sm font-semibold text-emerald-700" role="status">
          Admission approved successfully.
          {teacherName ? ` Student assigned to ${teacherName}.` : ""}
        </p>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
