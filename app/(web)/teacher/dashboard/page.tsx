import Link from "next/link";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getTeacherDashboardEnrollments } from "@/lib/server/services/teacher.service";
import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/ui/primitives";

export default async function TeacherDashboardPage() {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  const enrollments = await getTeacherDashboardEnrollments(session.user.id);

  return (
    <div>
      <PageHeader
        light
        eyebrow="Teacher portal"
        title="Assigned students"
        description="View only approved enrollments assigned to you, with course modules and curriculum details."
      />

      <div className="mb-6 grid gap-5 sm:grid-cols-2">
        <StatCard label="Active enrollments" value={enrollments.length} helper="Assigned and approved students" tone="info" />
        <StatCard
          label="Course access"
          value={enrollments.reduce((sum, enr) => sum + enr.moduleCount, 0)}
          helper="Total visible curriculum modules"
          tone="success"
        />
      </div>

      <SectionCard title="Active student roster" description="Only approved assigned enrollments are listed here.">
        {enrollments.length === 0 ? (
          <EmptyState
            title="No students assigned yet"
            description="Students assigned to you will appear here once staff approves their verified enrollment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="lum-table">
              <thead>
                <tr>
                  {["Student", "Course", "Reference", "Modules", "Approved", "Curriculum"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enr) => (
                  <tr key={enr.enrollmentId}>
                    <td>
                      <p className="font-bold text-slate-950">{enr.studentName}</p>
                      <p className="max-w-[18rem] truncate text-xs text-slate-500">{enr.studentEmail}</p>
                    </td>
                    <td className="font-semibold text-slate-700">{enr.courseName}</td>
                    <td className="font-mono text-xs text-slate-500">{enr.reference}</td>
                    <td>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {enr.moduleCount} modules
                      </span>
                    </td>
                    <td className="text-sm text-slate-500">
                      {enr.approvedAt ? new Date(enr.approvedAt).toLocaleDateString() : "Pending"}
                    </td>
                    <td>
                      <Link href={`/teacher/enrollments/${enr.enrollmentId}`} className="lum-btn-secondary px-3 py-2 text-xs">
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
