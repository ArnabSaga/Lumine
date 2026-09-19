import "server-only";

import { prisma } from "@/lib/server/db";
import { EnrollmentStatus, Prisma } from "@/generated/prisma/client";

export type ModuleProgressItem = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  completed: boolean;
  completedAt: string | null;
};

export type CourseProgressSummary = {
  enrollmentId: string;
  completedModules: number;
  totalModules: number;
  percentage: number;
  isComplete: boolean;
  modules: ModuleProgressItem[];
};

/**
 * Single canonical progress calculation shared by every API, page, and
 * dashboard. A zero-module course is never reported as complete.
 */
export function calculateCourseProgress(
  totalModules: number,
  completedModules: number
): { percentage: number; isComplete: boolean } {
  if (totalModules === 0) {
    return { percentage: 0, isComplete: false };
  }
  return {
    percentage: Math.round((completedModules / totalModules) * 100),
    isComplete: completedModules === totalModules,
  };
}

export type ProgressAccessError = "not-found" | "not-approved" | "invalid-module";

export type ProgressResult =
  | { ok: true; summary: CourseProgressSummary }
  | { ok: false; reason: ProgressAccessError };

type LoadedEnrollment = {
  id: string;
  courseId: string;
  course: {
    modules: Array<{ id: string; title: string; description: string | null; order: number }>;
  };
  moduleProgress: Array<{ moduleId: string; completedAt: Date }>;
};

function toSummary(enrollment: LoadedEnrollment): CourseProgressSummary {
  const completedAtByModule = new Map(enrollment.moduleProgress.map((p) => [p.moduleId, p.completedAt]));
  const modules: ModuleProgressItem[] = enrollment.course.modules.map((m) => {
    const completedAt = completedAtByModule.get(m.id) ?? null;
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      completed: completedAt !== null,
      completedAt: completedAt ? completedAt.toISOString() : null,
    };
  });
  const completedModules = modules.filter((m) => m.completed).length;
  const totalModules = modules.length;
  const { percentage, isComplete } = calculateCourseProgress(totalModules, completedModules);
  return { enrollmentId: enrollment.id, completedModules, totalModules, percentage, isComplete, modules };
}

const courseModulesOrderBy: Prisma.CourseModuleOrderByWithRelationInput[] = [
  { order: "asc" },
  { id: "asc" },
];

const progressSelect = {
  id: true,
  courseId: true,
  course: {
    select: {
      modules: {
        orderBy: courseModulesOrderBy,
        select: { id: true, title: true, description: true, order: true },
      },
    },
  },
  moduleProgress: { select: { moduleId: true, completedAt: true } },
};

/**
 * Student progress with ownership + approval gating.
 * not-found → caller returns safe 404; not-approved → caller returns 403.
 */
export async function getStudentEnrollmentProgress(
  userId: string,
  enrollmentId: string
): Promise<ProgressResult> {
  const owned = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, student: { userId } },
    select: { id: true, status: true },
  });

  if (!owned) {
    return { ok: false, reason: "not-found" };
  }
  if (owned.status !== EnrollmentStatus.APPROVED) {
    return { ok: false, reason: "not-approved" };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: progressSelect,
  });
  if (!enrollment) {
    return { ok: false, reason: "not-found" };
  }
  return { ok: true, summary: toSummary(enrollment) };
}

export type MutationResult =
  | { ok: true; moduleId: string; completed: boolean; completedAt: string | null }
  | { ok: false; reason: ProgressAccessError };

/**
 * Idempotent module completion toggle. Repeated complete calls keep exactly
 * one row with a stable completedAt; repeated uncomplete calls succeed with
 * zero rows. The module must belong to the enrollment's course.
 */
export async function setStudentModuleCompletion(
  userId: string,
  enrollmentId: string,
  moduleId: string,
  completed: boolean
): Promise<MutationResult> {
  const owned = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, student: { userId } },
    select: { id: true, courseId: true, status: true },
  });

  if (!owned) {
    return { ok: false, reason: "not-found" };
  }
  if (owned.status !== EnrollmentStatus.APPROVED) {
    return { ok: false, reason: "not-approved" };
  }

  const targetModule = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    select: { id: true, courseId: true },
  });

  // Unknown module and cross-course module are indistinguishable (safe 404).
  if (!targetModule || targetModule.courseId !== owned.courseId) {
    return { ok: false, reason: "invalid-module" };
  }

  try {
    if (completed) {
      try {
        const row = await prisma.enrollmentModuleProgress.upsert({
          where: { enrollmentId_moduleId: { enrollmentId: owned.id, moduleId: targetModule.id } },
          create: { enrollmentId: owned.id, moduleId: targetModule.id },
          update: {}, // No-op: repeated complete keeps one row + stable completedAt.
          select: { moduleId: true, completedAt: true },
        });
        return { ok: true, moduleId: row.moduleId, completed: true, completedAt: row.completedAt.toISOString() };
      } catch (upsertErr: unknown) {
        // Concurrent complete won the insert race: return the winner's row
        // (stable completedAt, still exactly one row).
        if (
          upsertErr instanceof Prisma.PrismaClientKnownRequestError &&
          upsertErr.code === "P2002"
        ) {
          const existing = await prisma.enrollmentModuleProgress.findUnique({
            where: { enrollmentId_moduleId: { enrollmentId: owned.id, moduleId: targetModule.id } },
            select: { moduleId: true, completedAt: true },
          });
          if (existing) {
            return {
              ok: true,
              moduleId: existing.moduleId,
              completed: true,
              completedAt: existing.completedAt.toISOString(),
            };
          }
        }
        throw upsertErr;
      }
    }

    await prisma.enrollmentModuleProgress.deleteMany({
      where: { enrollmentId: owned.id, moduleId: targetModule.id },
    });
    return { ok: true, moduleId: targetModule.id, completed: false, completedAt: null };
  } catch (err: unknown) {
    // Module or enrollment vanished mid-flight: FK violation reads as not-found.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { ok: false, reason: "not-found" };
    }
    throw err;
  }
}

/**
 * Teacher progress (read-only) with minimal enrollment context.
 * Returns null unless the enrollment is APPROVED and assigned to this
 * teacher; caller maps null to safe 404.
 */
export async function getTeacherEnrollmentProgress(
  teacherId: string,
  enrollmentId: string
): Promise<{
  student: { name: string; email: string };
  course: { name: string; slug: string };
  reference: string;
  progress: CourseProgressSummary;
} | null> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, assignedTeacherId: teacherId, status: EnrollmentStatus.APPROVED },
    select: {
      ...progressSelect,
      reference: true,
      student: { select: { user: { select: { name: true, email: true } } } },
      course: {
        select: {
          name: true,
          slug: true,
          modules: {
            orderBy: courseModulesOrderBy,
            select: { id: true, title: true, description: true, order: true },
          },
        },
      },
    },
  });

  if (!enrollment) {
    return null;
  }
  return {
    student: { name: enrollment.student.user.name, email: enrollment.student.user.email },
    course: { name: enrollment.course.name, slug: enrollment.course.slug },
    reference: enrollment.reference,
    progress: toSummary(enrollment),
  };
}

/**
 * Batched per-enrollment progress for the teacher dashboard (no N+1).
 * Only APPROVED enrollments assigned to this teacher are included.
 */
export async function getTeacherEnrollmentsProgress(
  teacherId: string
): Promise<Record<string, { completedModules: number; totalModules: number; percentage: number; isComplete: boolean }>> {
  const enrollments = await prisma.enrollment.findMany({
    where: { assignedTeacherId: teacherId, status: EnrollmentStatus.APPROVED },
    select: {
      id: true,
      course: { select: { _count: { select: { modules: true } } } },
      _count: { select: { moduleProgress: true } },
    },
  });

  const result: Record<string, { completedModules: number; totalModules: number; percentage: number; isComplete: boolean }> = {};
  for (const enrollment of enrollments) {
    // Progress rows can only reference the enrollment's own course modules
    // (enforced at write time); clamp defensively against drift.
    const totalModules = enrollment.course._count.modules;
    const completedModules = Math.min(enrollment._count.moduleProgress, totalModules);
    const { percentage, isComplete } = calculateCourseProgress(totalModules, completedModules);
    result[enrollment.id] = { completedModules, totalModules, percentage, isComplete };
  }
  return result;
}

/**
 * Batched per-enrollment progress for the student dashboard (no N+1).
 * Only APPROVED enrollments carry learning progress.
 */
export async function getStudentDashboardProgress(
  userId: string
): Promise<Record<string, { completedModules: number; totalModules: number; percentage: number; isComplete: boolean }>> {
  const enrollments = await prisma.enrollment.findMany({
    where: { student: { userId }, status: EnrollmentStatus.APPROVED },
    select: {
      id: true,
      course: { select: { _count: { select: { modules: true } } } },
      _count: { select: { moduleProgress: true } },
    },
  });

  const result: Record<string, { completedModules: number; totalModules: number; percentage: number; isComplete: boolean }> = {};
  for (const enrollment of enrollments) {
    // _count.moduleProgress can only reference this enrollment's rows, and
    // progress rows can only exist for the enrollment's own course modules
    // (enforced at write time), so counts compose safely here.
    const totalModules = enrollment.course._count.modules;
    const completedModules = Math.min(enrollment._count.moduleProgress, totalModules);
    const { percentage, isComplete } = calculateCourseProgress(totalModules, completedModules);
    result[enrollment.id] = { completedModules, totalModules, percentage, isComplete };
  }
  return result;
}
