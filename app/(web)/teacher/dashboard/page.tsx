import Link from "next/link";
import { getCurrentSession } from "@/lib/server/guards/auth";
import {
  getTeacherCourseFilterOptions,
  getTeacherDashboardEnrollments,
} from "@/lib/server/services/teacher.service";
import { getTeacherDashboardMetrics } from "@/lib/server/services/dashboard.service";
import { getTeacherEnrollmentsProgress } from "@/lib/server/services/course-progress.service";
import {
  teacherEnrollmentQuerySchema,
  type TeacherEnrollmentQueryInput,
} from "@/lib/shared/validations/enrollment-query";
import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/ui/primitives";

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession();
  if (!session?.user) return null;
  const rawParams = await searchParams;
  const parsed = teacherEnrollmentQuerySchema.safeParse({
    q: typeof rawParams.q === "string" ? rawParams.q : undefined,
    courseId: typeof rawParams.courseId === "string" ? rawParams.courseId : undefined,
  });
  // Invalid filters never silently become an unscoped query: the roster is
  // not fetched at all and an explicit invalid state is rendered instead.
  const filtersValid = parsed.success;
  const query: TeacherEnrollmentQueryInput = filtersValid ? parsed.data : {};

  const [enrollments, courses, metrics, progressByEnrollment] = await Promise.all([
    filtersValid ? getTeacherDashboardEnrollments(session.user.id, query) : Promise.resolve([]),
    getTeacherCourseFilterOptions(session.user.id),
    getTeacherDashboardMetrics(session.user.id),
    getTeacherEnrollmentsProgress(session.user.id),
  ]);

  return (
    <div>
      <PageHeader
        light
        eyebrow="Teacher portal"
        title="Assigned students"
        description="View only approved enrollments assigned to you, with course modules and curriculum details."
      />

      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard metricId="assigned-students" label="Assigned students" value={metrics.assignedStudents} helper="Approved assigned enrollments" tone="info" />
        <StatCard metricId="courses-teaching" label="Courses teaching" value={metrics.coursesTeaching} helper="Distinct approved courses" tone="success" />
        <StatCard metricId="approved-this-week" label="Approved this week" value={metrics.approvedThisWeek} helper="Bangladesh business week" tone="warning" />
        <StatCard metricId="total-modules" label="Total modules" value={metrics.totalModules} helper="Distinct course modules" tone="neutral" />
      </div>

      <div className="mb-6 rounded-[var(--lum-radius-card)] border border-white/60 bg-white/90 p-5 shadow-[var(--lum-shadow-soft)]">
        <form action="/teacher/dashboard" className="grid gap-4 md:grid-cols-[1fr_18rem_auto]">
          <label>
            <span className="lum-label">Search assigned students</span>
            <input
              className="lum-input"
              name="q"
              defaultValue={query.q ?? ""}
              placeholder="Student, email, reference, or course"
            />
          </label>
          <label>
            <span className="lum-label">Course</span>
            <select className="lum-input" name="courseId" defaultValue={query.courseId ?? ""}>
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className="lum-btn-primary h-11" type="submit">Search</button>
            <Link href="/teacher/dashboard" className="lum-btn-secondary h-11">Reset</Link>
          </div>
        </form>
      </div>

      <SectionCard title="Active student roster" description="Only approved assigned enrollments are listed here.">
        {!filtersValid ? (
          <EmptyState
            title="Invalid filters"
            description="One or more search parameters are invalid. Adjust the search or reset to browse your assigned students."
            action={
              <Link href="/teacher/dashboard" className="lum-btn-primary">
                Back to all students
              </Link>
            }
          />
        ) : enrollments.length === 0 ? (
          <EmptyState
            title="No students assigned yet"
            description="Students assigned to you will appear here once staff approves their verified enrollment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="lum-table">
              <thead>
                <tr>
                  {["Student", "Course", "Reference", "Modules", "Progress", "Approved", "Curriculum"].map((h) => (
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
                    <td>
                      {progressByEnrollment[enr.enrollmentId] ? (
                        <span className="font-mono text-xs font-black text-slate-700">
                          {progressByEnrollment[enr.enrollmentId].percentage}%
                          {progressByEnrollment[enr.enrollmentId].isComplete ? " · Completed" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
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
