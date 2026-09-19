import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug }, select: { name: true, description: true } });
  if (!course) return { title: "Course Not Found" };
  return { title: `${course.name} — Luminedge`, description: course.description ?? undefined };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [course, session] = await Promise.all([
    prisma.course.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        modules: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, description: true, order: true },
        },
      },
    }),
    getCurrentSession(),
  ]);

  if (!course) notFound();

  let enrollUrl = `/register?course=${encodeURIComponent(course.slug)}`;
  let isStaff = false;
  let staffDashboardUrl = "/staff/login";

  if (session?.user) {
    const role = session.user.role;
    if (role === "STUDENT") {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: session.user.id },
      });
      enrollUrl = studentProfile
        ? `/student/dashboard?course=${encodeURIComponent(course.slug)}`
        : `/student/complete-profile?course=${encodeURIComponent(course.slug)}`;
    } else {
      isStaff = true;
      staffDashboardUrl = getDashboardRouteForRole(role);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--lum-neutral)", fontFamily: "var(--font-sans)" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/courses" style={{ textDecoration: "none", color: "#64748b", fontSize: "0.875rem", fontWeight: 600 }}>
            ← All Courses
          </Link>
          {isStaff ? (
            <Link href={staffDashboardUrl} className="lum-btn-secondary" style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}>
              Staff Dashboard →
            </Link>
          ) : (
            <Link href={enrollUrl} className="lum-btn-primary" style={{ fontSize: "0.85rem", padding: "0.5rem 1.25rem" }}>
              Enroll Now →
            </Link>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Hero */}
        <div style={{ background: "var(--lum-secondary)", color: "#fff", borderRadius: "1.25rem", padding: "2.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", marginBottom: "1rem", padding: "0.25rem 0.75rem", background: "rgba(250,206,57,0.15)", borderRadius: 6 }}>
            <span style={{ color: "var(--lum-primary)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {course.modules.length} Modules
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "0.75rem" }}>
            {course.name}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1rem", lineHeight: 1.7, maxWidth: 560, marginBottom: "2rem" }}>
            {course.description}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Course Fee</p>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 900, color: "var(--lum-primary)" }}>
                {course.currency} {Number(course.price).toLocaleString()}
              </span>
            </div>
            {isStaff ? (
              <Link href={staffDashboardUrl} className="lum-btn-secondary" style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}>
                Open Staff Dashboard →
              </Link>
            ) : (
              <Link href={enrollUrl} className="lum-btn-primary" style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}>
                Enroll Now →
              </Link>
            )}
          </div>
        </div>

        {/* Syllabus */}
        <div className="lum-card">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.25rem" }}>
            Course Syllabus & Curriculum
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {course.modules.map((mod) => (
              <div key={mod.id} style={{ display: "flex", gap: "1rem", padding: "0.875rem", background: "#f8fafc", borderRadius: "0.75rem" }}>
                <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: "var(--lum-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 800, color: "var(--lum-secondary)" }}>
                    {mod.order}
                  </span>
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 0.25rem" }}>{mod.title}</p>
                  {mod.description && (
                    <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0 }}>{mod.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
          {isStaff ? (
            <Link href={staffDashboardUrl} className="lum-btn-secondary" style={{ fontSize: "1rem", padding: "0.875rem 2.5rem" }}>
              Staff Workspace →
            </Link>
          ) : (
            <>
              <Link href={enrollUrl} className="lum-btn-primary" style={{ fontSize: "1rem", padding: "0.875rem 2.5rem" }}>
                Enroll in {course.name} →
              </Link>
              {!session?.user && (
                <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#94a3b8" }}>
                  Already have an account?{" "}
                  <Link href={`/student/login?course=${encodeURIComponent(course.slug)}`} style={{ color: "var(--lum-primary)", textDecoration: "none", fontWeight: 600 }}>
                    Sign in
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
