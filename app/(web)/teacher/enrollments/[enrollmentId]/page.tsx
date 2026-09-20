import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getTeacherEnrollmentDetail } from "@/lib/server/services/teacher.service";
import { getTeacherEnrollmentProgress } from "@/lib/server/services/course-progress.service";
import { GlassCard, PageHeader } from "@/components/ui/primitives";
import CourseProgressBar from "@/components/course/CourseProgressBar";

export default async function TeacherEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  const { enrollmentId } = await params;
  const detail = await getTeacherEnrollmentDetail(session.user.id, enrollmentId);

  if (!detail) {
    notFound();
  }

  // Read-only learning progress for this assigned approved enrollment.
  const progressView = await getTeacherEnrollmentProgress(session.user.id, enrollmentId);
  const progress = progressView?.progress ?? null;

  return (
    <div>
      <PageHeader
        light
        eyebrow="Course workspace"
        title="Student and curriculum overview"
        description="Assigned approved enrollment details with privacy-minimized student information."
        action={<Link href="/teacher/dashboard" className="lum-btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">Back to roster</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <GlassCard>
          <h2 className="border-b border-slate-200 pb-4 font-display text-xl font-black text-slate-950">Student summary</h2>
          <div className="mt-5 space-y-5 text-sm">
            {[
              ["Student name", detail.studentName],
              ["Email address", detail.studentEmail],
              ["Course", detail.courseName],
              ["Reference", detail.reference],
              ["Approved date", detail.approvedAt ? new Date(detail.approvedAt).toLocaleDateString() : "Pending"],
              ["Class start", detail.classStartingDate ?? "Pending"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
                <p className="mt-1 break-words font-semibold text-slate-950">{value}</p>
              </div>
            ))}
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-emerald-700">
              Staff verified and active
            </span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="lum-eyebrow mb-2">Curriculum</p>
              <h2 className="font-display text-2xl font-black text-slate-950">{detail.courseName}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {detail.courseDescription || "Official curriculum syllabus and learning requirements."}
              </p>
            </div>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {detail.modules.length} modules
            </span>
          </div>

          {detail.modules.length === 0 || !progress ? (
            <p className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-center text-sm text-slate-500">
              No course modules are available yet.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white/75 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <p className="lum-eyebrow">Learning Progress</p>
                  {progress.isComplete ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700">
                      Completed · 100%
                    </span>
                  ) : null}
                </div>
                <CourseProgressBar
                  completed={progress.completedModules}
                  total={progress.totalModules}
                  percentage={progress.percentage}
                />
              </div>
              <div className="space-y-3">
                {progress.modules.map((mod) => (
                  <div key={mod.id} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/75 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--lum-primary)] font-mono text-sm font-black text-slate-950">
                      {mod.order}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-950">
                        {mod.completed ? "✓ " : "○ "}{mod.title}
                      </h3>
                      {mod.description && <p className="mt-1 text-sm leading-6 text-slate-600">{mod.description}</p>}
                      {mod.completed && mod.completedAt && (
                        <p className="mt-1 text-xs font-semibold text-emerald-700">
                          Completed {new Date(mod.completedAt).toLocaleDateString("en-BD")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
