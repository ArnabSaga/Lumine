import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import QrDisplay from "./QrDisplay";
import EnrollmentActions from "./EnrollmentActions";
import SelectedCourseEnrollment from "./SelectedCourseEnrollment";
import { AppShell } from "@/components/ui/shells";
import { EmptyState, GlassCard, PageHeader, StatusBadge } from "@/components/ui/primitives";

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

  const [enrollments, availableCourses] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        status: true,
        priceAtEnrollment: true,
        currencyAtEnrollment: true,
        createdAt: true,
        course: { select: { id: true, slug: true, name: true } },
        qr: { select: { token: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, amount: true },
        },
        assignedTeacher: { select: { name: true } },
      },
    }),
    prisma.course.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, description: true, price: true, currency: true },
    }),
  ]);

  // Check if courseHint is present and not yet enrolled
  const enrolledCourseSlugs = new Set(enrollments.map((e) => e.course.slug));
  const enrolledCourseIds = new Set(enrollments.map((e) => e.course.id));
  const selectedCourse = courseHint
    ? availableCourses.find((c) => c.slug === courseHint && !enrolledCourseSlugs.has(c.slug))
    : null;

  const unenrolledCourses = availableCourses.filter((c) => !enrolledCourseIds.has(c.id));

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
          description="Manage your enrollments, payment verification, QR code, and approved course access."
        />

        {/* Selected Course Prompt (if navigated with ?course=...) */}
        {selectedCourse && (
          <SelectedCourseEnrollment
            course={{
              id: selectedCourse.id,
              slug: selectedCourse.slug,
              name: selectedCourse.name,
              description: selectedCourse.description,
              price: selectedCourse.price.toString(),
              currency: selectedCourse.currency,
            }}
          />
        )}

        {/* Enrollments */}
        {enrollments.length === 0 && !selectedCourse ? (
          <GlassCard className="mb-6">
            <EmptyState
              title="No enrollments yet"
              description="Browse the course catalog and confirm your first enrollment when you are ready."
              action={<Link href="/courses" className="lum-btn-primary">Browse Courses</Link>}
            />
          </GlassCard>
        ) : (
          <div className="mb-8 flex flex-col gap-5">
            {enrollments.map((enr) => {
              const latestPayment = enr.payments[0];
              const isApproved = enr.status === "APPROVED";
              const isVerified = enr.status === "PAYMENT_VERIFIED";
              const isPending = enr.status === "PENDING_PAYMENT";
              const paymentPaid = latestPayment?.status === "SUCCEEDED";

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

                    {isPending && !paymentPaid && (
                      <EnrollmentActions enrollmentId={enr.id} latestPayment={latestPayment} />
                    )}

                    {isApproved && (
                      <Link href={`/student/courses/${enr.course.slug}`} className="lum-btn-primary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem", marginTop: "0.5rem", display: "inline-flex" }}>
                        Access Course →
                      </Link>
                    )}
                  </div>

                  {/* QR */}
                  {(isVerified || isApproved) && enr.qr?.token && (
                    <div className="rounded-3xl border border-slate-200 bg-white/75 p-4 text-center">
                      <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: "0.5rem" }}>
                        Verification QR
                      </p>
                      <QrDisplay token={enr.qr.token} />
                    </div>
                  )}
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
                    View →
                  </Link>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
    </AppShell>
  );
}
