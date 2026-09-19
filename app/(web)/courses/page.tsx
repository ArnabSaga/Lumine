import Link from "next/link";
import { prisma } from "@/lib/server/db";
import { PublicShell } from "@/components/ui/shells";
import { GlassCard, PageHeader } from "@/components/ui/primitives";

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
    <PublicShell>
      <section className="lum-public-section">
        <PageHeader
          light
          eyebrow="Course catalog"
          title="Choose the course that matches your next goal"
          description="Browse practical programs with clear module structure, pricing, and a guided enrollment path."
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <GlassCard key={course.id} hover className="flex h-full flex-col">
              <div>
                <div className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.08em] text-amber-800">
                  {course.modules.length} modules
                </div>
                <h2 className="font-display text-2xl font-black text-slate-950">{course.name}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{course.description}</p>
              </div>

              <div className="my-6 rounded-2xl border border-slate-200 bg-white/75 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Curriculum preview</p>
                <ol className="space-y-2">
                  {course.modules.slice(0, 5).map((mod) => (
                    <li key={mod.id} className="flex items-center gap-3 text-sm text-slate-700">
                      <span className="w-6 text-right font-mono text-xs font-black text-amber-700">{mod.order}.</span>
                      <span className="min-w-0 truncate">{mod.title}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-200 pt-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Course fee</p>
                  <p className="mt-1 font-mono text-xl font-black text-slate-950">
                    {course.currency} {Number(course.price).toLocaleString()}
                  </p>
                </div>
                <Link href={`/courses/${course.slug}`} className="lum-btn-primary px-4 py-2 text-sm">
                  View Course
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
