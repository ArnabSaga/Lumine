import Link from "next/link";
import { UserRole, EnrollmentStatus } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import {
  getStaffEnrollmentFilterOptions,
  getStaffEnrollments,
} from "@/lib/server/services/staff-enrollment.service";
import { staffEnrollmentQuerySchema } from "@/lib/shared/validations/enrollment-query";
import { AppShell } from "@/components/ui/shells";
import { EmptyState, GlassCard, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";

export const metadata = { title: "Enrollment Management — Luminedge Staff" };

function makeHref(params: Record<string, string | number | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      next.set(key, String(value));
    }
  }
  const query = next.toString();
  return query ? `/staff/enrollments?${query}` : "/staff/enrollments";
}

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(payment: { amount: string; currency: string } | null) {
  if (!payment) return "No payment";
  return `${payment.currency} ${Number(payment.amount).toLocaleString("en-BD")}`;
}

export default async function StaffEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePageRole([UserRole.BDM, UserRole.ACCOUNTS], "/staff/login");
  const rawParams = await searchParams;

  const parsed = staffEnrollmentQuerySchema.safeParse({
    q: typeof rawParams.q === "string" ? rawParams.q : undefined,
    status: typeof rawParams.status === "string" ? rawParams.status : undefined,
    courseId: typeof rawParams.courseId === "string" ? rawParams.courseId : undefined,
    teacherId: typeof rawParams.teacherId === "string" ? rawParams.teacherId : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
  });

  const query = parsed.success
    ? parsed.data
    : { q: undefined, status: undefined, courseId: undefined, teacherId: undefined, page: 1 };

  const [result, filters] = await Promise.all([
    getStaffEnrollments(query),
    getStaffEnrollmentFilterOptions(),
  ]);

  const baseParams = {
    q: query.q,
    status: query.status,
    courseId: query.courseId,
    teacherId: query.teacherId,
  };

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
      title="Enrollment Operations"
      activeHref="/staff/enrollments"
    >
      <PageHeader
        light
        eyebrow="Staff operations"
        title="Enrollment Management"
        description="Search verified enrollment records, filter workload, and inspect privacy-safe status history."
      />

      <GlassCard className="mb-6">
        <form action="/staff/enrollments" className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <label className="block">
            <span className="lum-label">Search</span>
            <input
              className="lum-input"
              name="q"
              defaultValue={query.q ?? ""}
              placeholder="Student, email, reference, or course"
            />
          </label>
          <label className="block">
            <span className="lum-label">Status</span>
            <select className="lum-input" name="status" defaultValue={query.status ?? ""}>
              <option value="">All statuses</option>
              {Object.values(EnrollmentStatus).map((status) => (
                <option key={status} value={status}>
                  {status.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="lum-label">Course</span>
            <select className="lum-input" name="courseId" defaultValue={query.courseId ?? ""}>
              <option value="">All courses</option>
              {filters.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="lum-label">Teacher</span>
            <select className="lum-input" name="teacherId" defaultValue={query.teacherId ?? ""}>
              <option value="">All teachers</option>
              {filters.teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button className="lum-btn-primary h-11" type="submit">
              Search
            </button>
            <Link href="/staff/enrollments" className="lum-btn-secondary h-11">
              Reset
            </Link>
          </div>
        </form>
      </GlassCard>

      <SectionCard
        title="Enrollment records"
        description={`Showing ${result.items.length} of ${result.total} matching enrollments`}
      >
        {result.items.length === 0 ? (
          <EmptyState title="No enrollments found" description="Try a different search term or filter combination." />
        ) : (
          <div className="overflow-x-auto">
            <table className="lum-table">
              <thead>
                <tr>
                  {["Student", "Course", "Reference", "Payment", "Status", "Teacher", "Created", "Action"].map((head) => (
                    <th key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>
                      <p className="font-bold text-slate-950">{enrollment.student.name}</p>
                      <p className="max-w-[18rem] truncate text-xs text-slate-500">{enrollment.student.email}</p>
                    </td>
                    <td className="font-semibold text-slate-700">{enrollment.course.name}</td>
                    <td className="font-mono text-xs text-slate-500">{enrollment.reference}</td>
                    <td>
                      <p className="font-mono text-xs font-bold text-slate-700">{formatMoney(enrollment.payment)}</p>
                      {enrollment.payment && <StatusBadge status={enrollment.payment.status} />}
                    </td>
                    <td><StatusBadge status={enrollment.status} /></td>
                    <td>{enrollment.teacher?.name ?? "Not assigned"}</td>
                    <td className="text-sm text-slate-500">{formatDate(enrollment.createdAt)}</td>
                    <td>
                      <Link href={`/staff/enrollments/${enrollment.id}`} className="lum-btn-secondary px-3 py-2 text-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Page {result.page} of {result.totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              aria-disabled={result.page <= 1}
              className={`lum-btn-secondary ${result.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
              href={makeHref({ ...baseParams, page: result.page - 1 })}
            >
              Previous
            </Link>
            <Link
              aria-disabled={result.totalPages === 0 || result.page >= result.totalPages}
              className={`lum-btn-secondary ${
                result.totalPages === 0 || result.page >= result.totalPages ? "pointer-events-none opacity-50" : ""
              }`}
              href={makeHref({ ...baseParams, page: result.page + 1 })}
            >
              Next
            </Link>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
