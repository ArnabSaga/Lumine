"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/primitives";

type Option = { id: string; name: string };

export default function SubmitAdmissionForm({
  admissionId,
  courses,
  teachers,
  disabled,
}: {
  admissionId: string;
  courses: Option[];
  teachers: Option[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/bdm/admissions/${admissionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.get("courseId"),
          admissionAmount: form.get("admissionAmount"),
          paidAmount: form.get("paidAmount"),
          classStartingDate: form.get("classStartingDate"),
          assignedTeacherId: form.get("assignedTeacherId"),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not submit admission.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (disabled) {
    return <Alert tone="info">This admission has already been submitted and is locked for Accounts review.</Alert>;
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <label>
        <span className="lum-label">Course</span>
        <select className="lum-input" name="courseId" required defaultValue="">
          <option value="" disabled>Select course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="lum-label">Admission Amount</span>
          <input className="lum-input" name="admissionAmount" type="number" min="1" step="0.01" required />
        </label>
        <label>
          <span className="lum-label">Paid Amount</span>
          <input className="lum-input" name="paidAmount" type="number" min="0" step="0.01" required />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="lum-label">Class Starting Date</span>
          <input className="lum-input" name="classStartingDate" type="date" required />
        </label>
        <label>
          <span className="lum-label">Teacher</span>
          <select className="lum-input" name="assignedTeacherId" required defaultValue="">
            <option value="" disabled>Select teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
        </label>
      </div>
      <button className="lum-btn-primary w-full justify-center" type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit to Accounts"}
      </button>
    </form>
  );
}
