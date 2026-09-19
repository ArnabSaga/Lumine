import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import SignOutButton from "@/components/SignOutButton";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!course) return { title: "Course Curriculum — Luminedge" };
  return { title: `${course.name} — Curriculum | Luminedge` };
}

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requirePageRole([UserRole.STUDENT], "/student/login");
  const { slug } = await params;

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!student) {
    notFound();
  }

  // Find course
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      modules: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, description: true, order: true },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // Find approved enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: course.id,
      },
    },
    select: {
      id: true,
      reference: true,
      status: true,
      approvedAt: true,
      assignedTeacher: {
        select: { name: true },
      },
    },
  });

  const isApproved = enrollment?.status === "APPROVED";

  return (
    <main style={{ minHeight: "100vh", background: "var(--lum-neutral)", fontFamily: "var(--font-sans)" }}>
      {/* Top Nav */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <Link href="/student/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/logo/logo.png" alt="Luminedge" width={28} height={28} style={{ borderRadius: 6 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--lum-secondary)" }}>Luminedge</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/student/dashboard" style={{ fontSize: "0.8rem", color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
              ← Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {!isApproved ? (
          <div className="lum-card" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(217,119,6,0.1)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                fontSize: "1.25rem",
              }}
            >
              🔒
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 900, marginBottom: "0.5rem" }}>
              Course Access Restricted
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: 480, margin: "0 auto 1.5rem" }}>
              Your enrollment for <strong>{course.name}</strong> is currently{" "}
              <span className="lum-badge lum-badge-pending">
                {enrollment ? enrollment.status : "Not Enrolled"}
              </span>
              . Access to curriculum modules becomes active once your enrollment is verified and approved by staff.
            </p>
            <Link href="/student/dashboard" className="lum-btn-primary">
              Return to Dashboard →
            </Link>
          </div>
        ) : (
          <div>
            {/* Header Banner */}
            <div
              style={{
                background: "var(--lum-secondary)",
                color: "#fff",
                borderRadius: "1rem",
                padding: "2rem",
                marginBottom: "2rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span className="lum-badge lum-badge-approved">Active & Approved</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#94a3b8" }}>
                  REF: {enrollment.reference}
                </span>
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>
                {course.name}
              </h1>
              {course.description && (
                <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 600 }}>
                  {course.description}
                </p>
              )}
              {enrollment.assignedTeacher && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--lum-primary)", fontWeight: 700 }}>
                    Assigned Faculty:
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#f1f5f9" }}>
                    {enrollment.assignedTeacher.name}
                  </span>
                </div>
              )}
            </div>

            {/* Modules Curriculum */}
            <div className="lum-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800 }}>
                  Curriculum Modules
                </h2>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                  {course.modules.length} Core Modules
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {course.modules.map((mod) => (
                  <div
                    key={mod.id}
                    style={{
                      display: "flex",
                      gap: "1.25rem",
                      padding: "1.125rem",
                      background: "#f8fafc",
                      borderRadius: "0.75rem",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "var(--lum-primary)",
                        color: "var(--lum-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 900,
                        fontSize: "0.85rem",
                      }}
                    >
                      {mod.order}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 800, fontSize: "0.95rem", margin: "0 0 0.35rem", color: "var(--lum-secondary)" }}>
                        {mod.title}
                      </h3>
                      {mod.description && (
                        <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.5, margin: 0 }}>
                          {mod.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
