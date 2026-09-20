"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ModuleProgressItem } from "@/lib/server/services/course-progress.service";

type ModuleProgressListProps = {
  enrollmentId: string;
  modules: ModuleProgressItem[];
};

/**
 * Student module completion list. Click → disable → PUT desired state →
 * refresh. Server remains authoritative; no optimistic state.
 */
export default function ModuleProgressList({ enrollmentId, modules }: ModuleProgressListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setCompleted(moduleId: string, completed: boolean) {
    setPendingId(moduleId);
    setError(null);

    try {
      const res = await fetch(`/api/student/enrollments/${enrollmentId}/modules/${moduleId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "error" in data
            ? (data as { error: string }).error
            : "Failed to update module progress.";
        setError(msg);
        setPendingId(null);
        return;
      }

      router.refresh();
    } catch {
      setError("Network error while updating module progress.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="lum-alert lum-alert-error">{error}</div>}
      {modules.map((mod) => {
        const busy = pendingId === mod.id;
        return (
          <div key={mod.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white/75 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--lum-primary)] font-mono text-sm font-black text-slate-950">
              {mod.order}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-950">{mod.title}</h3>
              {mod.description && <p className="mt-1 text-sm leading-6 text-slate-600">{mod.description}</p>}
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {mod.completed ? (
                  <span className="text-emerald-700">
                    ✓ Completed{mod.completedAt ? ` ${new Date(mod.completedAt).toLocaleDateString("en-BD")}` : ""}
                  </span>
                ) : (
                  "Not completed yet"
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-start">
              <button
                type="button"
                disabled={busy}
                onClick={() => setCompleted(mod.id, !mod.completed)}
                className={mod.completed ? "lum-btn-secondary px-3 py-2 text-xs" : "lum-btn-primary px-3 py-2 text-xs"}
              >
                {busy ? "Saving..." : mod.completed ? "Mark Incomplete" : "Mark Complete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
