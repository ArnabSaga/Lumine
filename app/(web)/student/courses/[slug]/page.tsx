import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import { AppShell } from "@/components/ui/shells";
import { EmptyState, GlassCard, PageHeader, StatusBadge } from "@/components/ui/primitives";

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
    <AppShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
      title="Course Workspace"
      activeHref="/student/dashboard"
      student
      maxWidth="max-w-6xl"
    >
      {!isApproved ? (
        <GlassCard>
          <EmptyState
            title="Course Access Restricted"
            description={
              <>
                Your enrollment for <strong>{course.name}</strong> is currently{" "}
                <StatusBadge status={enrollment?.status ?? "Not Enrolled"} />. Access opens after payment verification and staff approval.
              </>
            }
            action={<Link href="/student/dashboard" className="lum-btn-primary">Return to dashboard</Link>}
          />
        </GlassCard>
      ) : (
        <div>
          <PageHeader
            light
            eyebrow="Approved course"
            title={course.name}
            description={course.description ?? "Your approved course workspace and curriculum modules."}
            action={<StatusBadge status="APPROVED" />}
          />

          <GlassCard dark className="mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs font-bold text-slate-400">REF: {enrollment.reference}</p>
                {enrollment.assignedTeacher && (
                  <p className="mt-2 text-sm text-slate-300">
                    Assigned faculty: <strong className="text-white">{enrollment.assignedTeacher.name}</strong>
                  </p>
                )}
              </div>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-emerald-300">
                Active access
              </span>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="lum-eyebrow mb-2">Curriculum</p>
                <h2 className="font-display text-2xl font-black text-slate-950">Curriculum Modules</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-600">
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
      )}
    </AppShell>
  );
}
