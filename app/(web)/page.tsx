import Image from "next/image";
import Link from "next/link";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";
import { prisma } from "@/lib/server/db";

export const metadata = {
  title: "Luminedge — Language & Communication Courses",
  description: "Browse IELTS, Spoken English, and communication courses. Enroll online and start your journey.",
};

export default async function HomePage() {
  const session = await getCurrentSession();
  const dashboardRoute = session?.user
    ? getDashboardRouteForRole(session.user.role as string)
    : null;

  const courses = await prisma.course.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      _count: { select: { modules: true } },
    },
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--lum-neutral)", color: "var(--lum-secondary)", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <Image src="/logo/logo.png" alt="Luminedge" width={36} height={36} style={{ borderRadius: 8 }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800, color: "var(--lum-secondary)", letterSpacing: "-0.03em" }}>
              Luminedge
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/courses" style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b", textDecoration: "none" }}>
              Courses
            </Link>
            {session?.user && dashboardRoute ? (
              <Link href={dashboardRoute} className="lum-btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem" }}>
                My Dashboard →
              </Link>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link href="/register" className="lum-btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
                  Sign Up
                </Link>
                <Link href="/student/login" className="lum-btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
                  Sign In
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: "var(--lum-secondary)", color: "#fff", padding: "5rem 1.5rem 4rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(250,206,57,0.15)", border: "1px solid rgba(250,206,57,0.3)", borderRadius: 9999, padding: "0.3rem 0.9rem", marginBottom: "1.5rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--lum-primary)", display: "inline-block" }} />
            <span style={{ color: "var(--lum-primary)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Enrollments Open</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.25rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 1.25rem" }}>
            Speak the World&apos;s Language.<br />
            <span style={{ color: "var(--lum-primary)" }}>Start Today.</span>
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#94a3b8", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 2.5rem" }}>
            Expert-led IELTS preparation and spoken English courses designed to get you results. Enroll online in minutes.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/courses" className="lum-btn-primary" style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}>
              Browse Courses →
            </Link>
            <Link href="/register" className="lum-btn-secondary" style={{ fontSize: "1rem", padding: "0.75rem 2rem", background: "transparent", color: "#e2e8f0", borderColor: "#334155" }}>
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Course Cards */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.5rem" }}>
          Our Courses
        </h2>
        <p style={{ color: "#64748b", marginBottom: "2rem" }}>Choose the program that fits your goals</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {courses.map((course) => (
            <div key={course.id} className="lum-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem 0.7rem", background: "rgba(250,206,57,0.1)", borderRadius: 6, marginBottom: "0.75rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700, color: "#b45309", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {course._count.modules} modules
                  </span>
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 0.5rem" }}>
                  {course.name}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
                  {course.description}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color: "var(--lum-secondary)" }}>
                    {course.currency} {Number(course.price).toLocaleString()}
                  </span>
                </div>
                <Link href={`/courses/${course.slug}`} className="lum-btn-primary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Staff Portal */}
      <section style={{ background: "var(--lum-tertiary)", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem" }}>BDM · Accounts · Teacher</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", marginBottom: "1rem" }}>
            Staff Portal
          </h2>
          <Link href="/staff/login" className="lum-btn-primary" style={{ fontSize: "0.875rem" }}>
            Sign in to Staff Workspace →
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "#94a3b8" }}>
        © {new Date().getFullYear()} Luminedge. All rights reserved.
      </footer>
    </main>
  );
}
