import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getTeacherEnrollmentDetail } from "@/lib/server/services/teacher.service";

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

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/dashboard"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white"
        >
          ← Back to Student Roster
        </Link>
        <span className="text-sm text-slate-500">/</span>
        <h1 className="text-lg font-bold text-white">
          Course Syllabus & Student Overview
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Student Summary Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl h-fit">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 mb-4">
            Student Information
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">
                Student Name
              </span>
              <p className="mt-1 font-semibold text-white">
                {detail.studentName}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">
                Email Address
              </span>
              <p className="mt-1 font-medium text-slate-200">
                {detail.studentEmail}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">
                Enrolled Course
              </span>
              <p className="mt-1 font-bold text-indigo-400">
                {detail.courseName}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">
                Enrollment Reference
              </span>
              <p className="mt-1 font-mono text-xs text-slate-300">
                {detail.reference}
              </p>
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">
                Approved Date
              </span>
              <p className="mt-1 font-medium text-slate-200">
                {detail.approvedAt
                  ? new Date(detail.approvedAt).toLocaleDateString()
                  : "—"}
              </p>
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                ✓ Staff Verified & Active
              </span>
            </div>
          </div>
        </div>

        {/* Course Modules Curriculum Card */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {detail.courseName} — Curriculum Modules
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {detail.courseDescription ||
                    "Official curriculum syllabus and learning requirements"}
                </p>
              </div>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-400">
                {detail.modules.length} Core Modules
              </span>
            </div>
          </div>

          {detail.modules.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              No modules defined for this course.
            </p>
          ) : (
            <div className="space-y-3">
              {detail.modules.map((mod, index) => (
                <div
                  key={mod.id}
                  className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition-colors hover:border-slate-700"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-xs font-bold text-indigo-400 border border-indigo-500/30">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white">
                      {mod.title}
                    </h3>
                    {mod.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {mod.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
