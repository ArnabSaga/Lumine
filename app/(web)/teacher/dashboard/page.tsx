import Link from "next/link";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getTeacherDashboardEnrollments } from "@/lib/server/services/teacher.service";

export default async function TeacherDashboardPage() {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  const enrollments = await getTeacherDashboardEnrollments(session.user.id);

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            My Assigned Students
          </h1>
          <p className="text-sm text-slate-400">
            Students whose enrollment and payment have been verified and approved by Staff
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          {enrollments.length} Active Enrollments
        </div>
      </div>

      {/* Student List */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-white">
            Active Student Roster
          </h2>
          <p className="text-xs text-slate-400">
            View course syllabus modules and curriculum requirements for your students
          </p>
        </div>

        {enrollments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-200">
              No students assigned yet
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Students assigned to you will appear here once Staff approves their verified enrollment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Student Details
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Course Enrolled
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Reference
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Syllabus Modules
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Approved Date
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Course Syllabus
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {enrollments.map((enr) => (
                  <tr
                    key={enr.enrollmentId}
                    className="transition-colors hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">
                        {enr.studentName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {enr.studentEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-indigo-400">
                      {enr.courseName}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {enr.reference}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {enr.moduleCount} Modules
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {enr.approvedAt ? new Date(enr.approvedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/teacher/enrollments/${enr.enrollmentId}`}
                        className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:border-slate-600 hover:bg-slate-700"
                      >
                        View Curriculum Modules →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
