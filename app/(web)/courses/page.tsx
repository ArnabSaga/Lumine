import Link from "next/link";
import { prisma } from "@/lib/server/db";

export const metadata = {
  title: "Courses — Luminedge",
  description: "Browse all available courses at Luminedge. IELTS preparation, Spoken English, and more.",
};

export default async function CoursesPage() {
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
      modules: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
    },
  });

  return (
    <main style={{ minHeight: "100vh", background: "var(--lum-neutral)", fontFamily: "var(--font-sans)" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--lum-secondary)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem" }}>← Luminedge</span>
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>
          All Courses
        </h1>
        <p style={{ color: "#64748b", marginBottom: "2.5rem" }}>Choose the program that fits your goals and enroll in minutes.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
          {courses.map((course) => (
            <div key={course.id} className="lum-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 0.5rem" }}>
                  {course.name}
                </h2>
                <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6 }}>
                  {course.description}
                </p>
              </div>

              {/* Modules list */}
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "0.875rem" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: "0.625rem" }}>
                  {course.modules.length} Modules
                </p>
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {course.modules.map((mod) => (
                    <li key={mod.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#475569" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700, color: "#b45309", minWidth: 18, textAlign: "right" }}>
                        {mod.order}.
                      </span>
                      {mod.title}
                    </li>
                  ))}
                </ol>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", marginTop: "auto" }}>
                <div>
                  <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Course Fee</p>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800 }}>
                    {course.currency} {Number(course.price).toLocaleString()}
                  </span>
                </div>
                <Link href={`/courses/${course.slug}`} className="lum-btn-primary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                  Enroll Now →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
