import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";
import { PublicShell } from "@/components/ui/shells";
import { GlassCard } from "@/components/ui/primitives";

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
    <PublicShell>
      <section className="lum-public-section">
        <Link href="/courses" className="mb-6 inline-flex text-sm font-bold text-slate-300 hover:text-[var(--lum-primary)]">
          Back to courses
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div>
            <GlassCard dark className="mb-6">
              <p className="lum-eyebrow mb-4 text-[var(--lum-primary)]">{course.modules.length} modules</p>
              <h1 className="font-display text-5xl font-black leading-none text-white">{course.name}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">{course.description}</p>
            </GlassCard>

            <GlassCard>
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="lum-eyebrow mb-2">Curriculum</p>
                  <h2 className="font-display text-2xl font-black text-slate-950">What you will cover</h2>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-blue-700">
                  {course.modules.length} modules
                </span>
              </div>
              <div className="space-y-3">
                {course.modules.map((mod) => (
                  <div key={mod.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white/75 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--lum-primary)] font-mono text-sm font-black text-slate-950">
                      {mod.order}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-950">{mod.title}</h3>
                      {mod.description && <p className="mt-1 text-sm leading-6 text-slate-600">{mod.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="sticky top-28">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Course fee</p>
            <p className="mt-2 font-mono text-4xl font-black text-slate-950">
              {course.currency} {Number(course.price).toLocaleString()}
            </p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Enroll securely, complete the demo checkout, then show your verification QR to staff for approval.
            </p>
            {isStaff ? (
              <Link href={staffDashboardUrl} className="lum-btn-secondary mt-6 w-full">
                Open Staff Dashboard
              </Link>
            ) : (
              <Link href={enrollUrl} className="lum-btn-primary mt-6 w-full">
                Enroll Now
              </Link>
            )}
            {!session?.user && !isStaff && (
              <p className="mt-4 text-center text-sm text-slate-500">
                Already registered?{" "}
                <Link href={`/student/login?course=${encodeURIComponent(course.slug)}`} className="font-bold text-amber-700">
                  Sign in
                </Link>
              </p>
            )}
          </GlassCard>
        </div>
      </section>
    </PublicShell>
  );
}
