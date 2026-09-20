import Link from "next/link";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";
import { prisma } from "@/lib/server/db";
import { PublicShell } from "@/components/ui/shells";
import { GlassCard, PageHeader } from "@/components/ui/primitives";

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
    <PublicShell>
      <section className="lum-public-section pb-8 pt-16 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="lum-eyebrow mb-5 text-[var(--lum-primary)]">Enrollments open</p>
            <h1 className="font-display text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Advance your learning.
              <span className="block text-[var(--lum-primary)]">Build your next skill.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Explore practical language and communication courses designed for focused learning, clear enrollment, and verified access.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/courses" className="lum-btn-primary px-6 py-3 text-base">
                Explore Courses
              </Link>
              {session?.user && dashboardRoute ? (
                <Link href={dashboardRoute} className="lum-btn-secondary border-white/20 bg-white/10 px-6 py-3 text-base text-white hover:bg-white/20">
                  My Dashboard
                </Link>
              ) : (
                <Link href="/student/login" className="lum-btn-secondary border-white/20 bg-white/10 px-6 py-3 text-base text-white hover:bg-white/20">
                  Student Login
                </Link>
              )}
            </div>
          </div>

          <GlassCard dark className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[var(--lum-primary)]/20 blur-3xl" />
            <p className="lum-eyebrow mb-4 text-[var(--lum-primary)]">Admission workflow</p>
            <div className="space-y-4">
              {["BDM issues registration QR", "Student submits registration", "BDM enters admission details", "Accounts approves payment", "Teacher receives assigned student", "Student accesses approved course"].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--lum-primary)] font-mono text-sm font-black text-slate-950">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-100">{step}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      <section className="lum-public-section pt-8">
        <PageHeader
          light
          eyebrow="Courses"
          title="Practical programs with clear next steps"
          description="Each course includes transparent pricing, ordered modules, and a BDM led admission path that keeps student access secure."
          action={<Link href="/courses" className="lum-btn-primary">View all courses</Link>}
        />
        <div className="grid gap-5 md:grid-cols-3">
          {courses.map((course) => (
            <GlassCard key={course.id} hover>
              <div className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.08em] text-amber-800">
                {course._count.modules} modules
              </div>
              <h2 className="font-display text-2xl font-black text-slate-950">{course.name}</h2>
              <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">{course.description}</p>
              <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-200 pt-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Course fee</p>
                  <p className="mt-1 font-mono text-xl font-black text-slate-950">
                    {course.currency} {Number(course.price).toLocaleString()}
                  </p>
                </div>
                <Link href={`/courses/${course.slug}`} className="lum-btn-primary px-4 py-2 text-sm">
                  View
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="lum-public-section pt-0">
        <GlassCard dark>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="lum-eyebrow mb-3 text-[var(--lum-primary)]">Staff verification</p>
              <h2 className="font-display text-3xl font-black text-white">One BDM QR starts admission, Accounts approval opens course access.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Students register through a BDM QR. BDM enters the course and payment details, Accounts approves, and the assigned teacher sees the approved student.
              </p>
            </div>
            <Link href="/staff/login" className="lum-btn-primary">
              Staff Portal
            </Link>
          </div>
        </GlassCard>
      </section>
    </PublicShell>
  );
}
