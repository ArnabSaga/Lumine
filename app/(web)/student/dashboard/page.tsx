import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import QrDisplay from "./QrDisplay";
import EnrollmentActions from "./EnrollmentActions";
import SelectedCourseEnrollment from "./SelectedCourseEnrollment";
import SignOutButton from "@/components/SignOutButton";

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
          select: { id: true, status: true, amount: true, providerPaymentId: true },
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
    <main style={{ minHeight: "100vh", background: "var(--lum-neutral)", fontFamily: "var(--font-sans)" }}>
      {/* Top nav */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/logo/logo.png" alt="Luminedge" width={28} height={28} style={{ borderRadius: 6 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--lum-secondary)" }}>Luminedge</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Page heading */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "0.25rem" }}>
            My Dashboard
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Manage your enrollments and track your learning journey.</p>
        </div>

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
          <div className="lum-card" style={{ textAlign: "center", padding: "3rem", marginBottom: "2rem" }}>
            <p style={{ color: "#94a3b8", marginBottom: "1.25rem" }}>You haven&apos;t enrolled in any courses yet.</p>
            <Link href="/courses" className="lum-btn-primary">Browse Courses →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
            {enrollments.map((enr) => {
              const latestPayment = enr.payments[0];
              const isApproved = enr.status === "APPROVED";
              const isVerified = enr.status === "PAYMENT_VERIFIED";
              const isPending = enr.status === "PENDING_PAYMENT";
              const paymentPaid = latestPayment?.status === "SUCCEEDED";

              return (
                <div key={enr.id} className="lum-card" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1.5rem", alignItems: "start" }}>
                  {/* Left */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 800 }}>{enr.course.name}</span>
                      <span className={`lum-badge ${isApproved ? "lum-badge-approved" : isVerified ? "lum-badge-verified" : "lum-badge-pending"}`}>
                        {isApproved ? "Approved" : isVerified ? "Payment Verified" : "Pending Payment"}
                      </span>
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.5rem" }}>
                      REF: {enr.reference}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
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
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: "0.5rem" }}>
                        Verification QR
                      </p>
                      <QrDisplay token={enr.qr.token} />
                    </div>
                  )}
                </div>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {unenrolledCourses.map((course) => (
                <div key={course.id} className="lum-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 2 }}>{course.name}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#64748b" }}>
                      {course.currency} {Number(course.price).toLocaleString()}
                    </p>
                  </div>
                  <Link href={`/courses/${course.slug}`} className="lum-btn-primary" style={{ fontSize: "0.75rem", padding: "0.4rem 0.875rem" }}>
                    View →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
