import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import { AppShell } from "@/components/ui/shells";
import { EmptyState, GlassCard, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { getEnrollmentHistoryDescription, getEnrollmentHistoryLabel } from "@/lib/shared/enrollment-history";
import { getStudentDashboardProgress } from "@/lib/server/services/course-progress.service";
import CourseProgressBar from "@/components/course/CourseProgressBar";

export const metadata = { title: "My Dashboard — Luminedge" };

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const session = await requirePageRole([UserRole.STUDENT], "/student/login");
  const params = await searchParams;
  const courseHint = params.course;

  // Check profile
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!student) {
    redirect(
      courseHint
        ? `/student/complete-profile?course=${encodeURIComponent(courseHint)}`
        : "/student/complete-profile"
    );
  }

  const [enrollments, admissions, availableCourses] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: student.id },
      // Deterministic tie-breaker: equal createdAt values order repeatably.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        reference: true,
        status: true,
        priceAtEnrollment: true,
        currencyAtEnrollment: true,
        createdAt: true,
        course: { select: { id: true, slug: true, name: true } },
        payments: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, status: true, amount: true },
        },
        assignedTeacher: { select: { name: true } },
        statusHistory: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, toStatus: true, createdAt: true },
        },
      },
    }),
    prisma.admission.findMany({
      where: { studentId: student.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        reference: true,
        status: true,
        admissionAmount: true,
        paidAmount: true,
        currency: true,
        classStartingDate: true,
        createdAt: true,
        course: { select: { slug: true, name: true } },
        statusHistory: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, toStatus: true, createdAt: true },
        },
      },
    }),
    prisma.course.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, description: true, price: true, currency: true },
    }),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course.id));

  const unenrolledCourses = availableCourses.filter((c) => !enrolledCourseIds.has(c.id));

  // Batched learning progress for APPROVED enrollments only (no N+1).
  const progressByEnrollment = await getStudentDashboardProgress(session.user.id);

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
      title="Student Portal"
      activeHref="/student/dashboard"
      student
    >
        <PageHeader
          light
          eyebrow="Student portal"
          title="My dashboard"
          description="Track your BDM registration, Accounts approval, assigned course access, and module progress."
        />

        {admissions.length > 0 && (
          <div className="mb-8 flex flex-col gap-5">
            {admissions.map((admission) => {
              const isApproved = admission.status === "ASSIGNED_TO_TEACHER";
              const journey = [
                { label: "Registration Submitted", state: "done" },
                {
                  label: "BDM Admission Entry",
                  state:
                    admission.status === "PENDING_ACCOUNTS_APPROVAL" || admission.status === "ACCOUNTS_APPROVED" || isApproved
                      ? "done"
                      : "waiting",
                },
                {
                  label: "Accounts Approval",
                  state: admission.status === "ACCOUNTS_APPROVED" || isApproved ? "done" : "locked",
                },
                { label: "Course Access", state: isApproved ? "done" : "locked" },
              ];

              return (
                <GlassCard key={admission.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="lum-eyebrow">Admission</p>
                      <h2 className="mt-2 font-display text-2xl font-black text-slate-950">
                        {admission.course?.name ?? "Course pending"}
                      </h2>
                      <p className="mt-1 font-mono text-xs text-slate-500">REF: {admission.reference}</p>
                    </div>
                    <StatusBadge status={admission.status} />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {journey.map((step) => (
                      <div key={step.label} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{step.label}</p>
                        <p
                          className={`mt-2 text-sm font-black ${
                            step.state === "done"
                              ? "text-emerald-700"
                              : step.state === "waiting"
                              ? "text-amber-700"
                              : "text-slate-400"
                          }`}
                        >
                          {step.state === "done" ? "Complete" : step.state === "waiting" ? "Waiting" : "Locked"}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <p className="text-sm text-slate-600">
                      Admission Amount:{" "}
                      <span className="font-mono font-black">
                        {admission.admissionAmount ? `${admission.currency} ${admission.admissionAmount.toString()}` : "Pending"}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Paid Amount:{" "}
                      <span className="font-mono font-black">
                        {admission.paidAmount ? `${admission.currency} ${admission.paidAmount.toString()}` : "Pending"}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Class Start:{" "}
                      <span className="font-mono font-black">
                        {admission.classStartingDate ? admission.classStartingDate.toISOString().slice(0, 10) : "Pending"}
                      </span>
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Enrollments */}
        {enrollments.length === 0 && admissions.length === 0 ? (
          <GlassCard className="mb-6">
            <EmptyState
              title="No admission yet"
              description="Scan or open the registration QR provided by your Luminedge BDM to start admission."
              action={<Link href="/courses" className="lum-btn-primary">Explore Courses</Link>}
            />
          </GlassCard>
        ) : (
          <div className="mb-8 flex flex-col gap-5">
            {enrollments.map((enr) => {
              const isApproved = enr.status === "APPROVED";
              const isVerified = enr.status === "PAYMENT_VERIFIED";
              const journey = [
                { label: "Enrollment Confirmed", state: "done" },
                { label: "Payment Verified", state: isVerified || isApproved ? "done" : "waiting" },
                { label: "Staff Approval", state: isApproved ? "done" : isVerified ? "waiting" : "locked" },
                { label: "Course Access", state: isApproved ? "done" : "locked" },
              ];

              return (
                <GlassCard key={enr.id} className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
                  {/* Left */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 800 }}>{enr.course.name}</span>
                      <StatusBadge status={enr.status} />
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
                      REF: {enr.reference}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 800, marginBottom: "0.75rem", color: "#0f172a" }}>
                      {enr.currencyAtEnrollment} {Number(enr.priceAtEnrollment).toLocaleString()}
                    </p>

                    {isApproved && enr.assignedTeacher && (
                      <p style={{ fontSize: "0.8rem", color: "#059669", marginBottom: "0.5rem" }}>
                        ✓ Assigned to: <strong>{enr.assignedTeacher.name}</strong>
                      </p>
                    )}

                    {isApproved && (
                      <Link href={`/student/courses/${enr.course.slug}`} className="lum-btn-primary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem", marginTop: "0.5rem", display: "inline-flex" }}>
                        Access Course →
                      </Link>
                    )}

                    {isApproved && progressByEnrollment[enr.id] && (
                      <div className="mt-5 rounded-3xl border border-slate-200 bg-white/70 p-4">
                        <p className="lum-eyebrow mb-3">Course Progress</p>
                        <CourseProgressBar
                          completed={progressByEnrollment[enr.id].completedModules}
                          total={progressByEnrollment[enr.id].totalModules}
                          percentage={progressByEnrollment[enr.id].percentage}
                        />
                      </div>
                    )}

                    <div className="mt-5 rounded-3xl border border-slate-200 bg-white/70 p-4">
                      <p className="lum-eyebrow mb-3">Enrollment Journey</p>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {journey.map((step) => (
                          <div key={step.label} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{step.label}</p>
                            <p
                              className={`mt-2 text-sm font-black ${
                                step.state === "done"
                                  ? "text-emerald-700"
                                  : step.state === "waiting"
                                  ? "text-amber-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {step.state === "done" ? "Complete" : step.state === "waiting" ? "Waiting" : "Locked"}
                            </p>
                          </div>
                        ))}
                      </div>
                      {enr.statusHistory.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {enr.statusHistory.map((entry) => (
                            <p key={entry.id} className="text-xs text-slate-500">
                              <span className="font-bold text-slate-700">{getEnrollmentHistoryLabel(entry.toStatus)}</span>
                              {" · "}
                              {getEnrollmentHistoryDescription(entry.toStatus)}
                              {" · "}
                              {new Date(entry.createdAt).toLocaleDateString("en-BD")}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Available courses to enroll */}
        {unenrolledCourses.length > 0 && (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800, marginBottom: "1rem" }}>
              Enroll in More Courses
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {unenrolledCourses.map((course) => (
                <GlassCard key={course.id} hover className="flex items-center justify-between gap-4">
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 2 }}>{course.name}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#64748b" }}>
                      {course.currency} {Number(course.price).toLocaleString()}
                    </p>
                  </div>
                  <Link href={`/courses/${course.slug}`} className="lum-btn-primary" style={{ fontSize: "0.75rem", padding: "0.4rem 0.875rem" }}>
                    Explore →
                  </Link>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
    </AppShell>
  );
}
