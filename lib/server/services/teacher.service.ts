import "server-only";

import { prisma } from "@/lib/server/db";
import { EnrollmentStatus } from "@/generated/prisma/client";

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

/**
 * Returns all approved enrollments assigned to the given teacher.
 * Privacy-safe: only student name and email, no phone/address/education PII.
 */
export async function getTeacherDashboardEnrollments(
  teacherId: string
): Promise<TeacherEnrollmentListItem[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      assignedTeacherId: teacherId,
      status: EnrollmentStatus.APPROVED,
    },
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
