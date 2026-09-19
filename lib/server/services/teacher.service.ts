import "server-only";

import { prisma } from "@/lib/server/db";
import { EnrollmentStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import type { TeacherEnrollmentQueryInput } from "@/lib/shared/validations/enrollment-query";

export interface TeacherEnrollmentListItem {
  enrollmentId: string;
  reference: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  courseSlug: string;
  moduleCount: number;
  approvedAt: string | null;
}

export interface TeacherEnrollmentDetail {
  enrollmentId: string;
  reference: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  courseSlug: string;
  courseDescription: string | null;
  approvedAt: string | null;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    order: number;
  }>;
}

function buildTeacherEnrollmentWhere(
  teacherId: string,
  query: TeacherEnrollmentQueryInput = {}
): Prisma.EnrollmentWhereInput {
  const where: Prisma.EnrollmentWhereInput = {
    assignedTeacherId: teacherId,
    status: EnrollmentStatus.APPROVED,
  };

  if (query.courseId) {
    where.courseId = query.courseId;
  }

  if (query.q) {
    where.OR = [
      { reference: { contains: query.q, mode: "insensitive" } },
      { course: { name: { contains: query.q, mode: "insensitive" } } },
      { student: { user: { name: { contains: query.q, mode: "insensitive" } } } },
      { student: { user: { email: { contains: query.q, mode: "insensitive" } } } },
    ];
  }

  return where;
}

/**
 * Returns all approved enrollments assigned to the given teacher.
 * Privacy-safe: only student name and email, no phone/address/education PII.
 */
export async function getTeacherDashboardEnrollments(
  teacherId: string,
  query: TeacherEnrollmentQueryInput = {}
): Promise<TeacherEnrollmentListItem[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: buildTeacherEnrollmentWhere(teacherId, query),
    orderBy: { approvedAt: "desc" },
    select: {
      id: true,
      reference: true,
      approvedAt: true,
      student: {
        select: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
      course: {
        select: {
          name: true,
          slug: true,
          _count: { select: { modules: true } },
        },
      },
    },
  });

  return enrollments.map((enr) => ({
    enrollmentId: enr.id,
    reference: enr.reference,
    studentName: enr.student.user.name,
    studentEmail: enr.student.user.email,
    courseName: enr.course.name,
    courseSlug: enr.course.slug,
    moduleCount: enr.course._count.modules,
    approvedAt: enr.approvedAt ? enr.approvedAt.toISOString() : null,
  }));
}

export async function getTeacherCourseFilterOptions(teacherId: string) {
  const courseIds = await prisma.enrollment.groupBy({
    by: ["courseId"],
    where: { assignedTeacherId: teacherId, status: EnrollmentStatus.APPROVED },
  });

  return await prisma.course.findMany({
    where: { id: { in: courseIds.map((item) => item.courseId) } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/**
 * Returns detail for a specific enrollment assigned to the teacher.
 * Returns null if the enrollment does not exist, is not approved, or is assigned to another teacher.
 */
export async function getTeacherEnrollmentDetail(
  teacherId: string,
  enrollmentId: string
): Promise<TeacherEnrollmentDetail | null> {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      assignedTeacherId: teacherId,
      status: EnrollmentStatus.APPROVED,
    },
    select: {
      id: true,
      reference: true,
      approvedAt: true,
      student: {
        select: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
      course: {
        select: {
          name: true,
          slug: true,
          description: true,
          modules: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, description: true, order: true },
          },
        },
      },
    },
  });

  if (!enrollment) return null;

  return {
    enrollmentId: enrollment.id,
    reference: enrollment.reference,
    studentName: enrollment.student.user.name,
    studentEmail: enrollment.student.user.email,
    courseName: enrollment.course.name,
    courseSlug: enrollment.course.slug,
    courseDescription: enrollment.course.description,
    approvedAt: enrollment.approvedAt ? enrollment.approvedAt.toISOString() : null,
    modules: enrollment.course.modules,
  };
}
