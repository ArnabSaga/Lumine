import "server-only";

import {
  EnrollmentStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/server/db";
import type { StaffEnrollmentQueryInput } from "@/lib/shared/validations/enrollment-query";

export const STAFF_ENROLLMENT_PAGE_SIZE = 20 as const;

export type CanonicalPaymentDto = {
  status: PaymentStatus;
  amount: string;
  currency: string;
  verifiedAt: string | null;
} | null;

export type StaffEnrollmentListItem = {
  id: string;
  reference: string;
  status: EnrollmentStatus;
  student: {
    name: string;
    email: string;
  };
  course: {
    id: string;
    name: string;
    slug: string;
  };
  payment: CanonicalPaymentDto;
  teacher: {
    id: string;
    name: string;
  } | null;
  approvedAt: string | null;
  createdAt: string;
};

export type StaffEnrollmentDetail = StaffEnrollmentListItem & {
  priceAtEnrollment: string;
  currencyAtEnrollment: string;
  approvedBy: {
    id: string;
    name: string;
  } | null;
  history: Array<{
    id: string;
    fromStatus: EnrollmentStatus | null;
    toStatus: EnrollmentStatus;
    actorName: string;
    createdAt: string;
  }>;
};

export type StaffEnrollmentListResult = {
  items: StaffEnrollmentListItem[];
  page: number;
  pageSize: typeof STAFF_ENROLLMENT_PAGE_SIZE;
  total: number;
  totalPages: number;
};

type SafePayment = {
  enrollmentId: string;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  verifiedAt: Date | null;
  createdAt: Date;
};

function buildStaffEnrollmentWhere(query: StaffEnrollmentQueryInput): Prisma.EnrollmentWhereInput {
  const where: Prisma.EnrollmentWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.courseId) {
    where.courseId = query.courseId;
  }

  if (query.teacherId) {
    where.assignedTeacherId = query.teacherId;
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

function pickCanonicalPayment(payments: SafePayment[], enrollmentId: string): CanonicalPaymentDto {
  const scoped = payments.filter((payment) => payment.enrollmentId === enrollmentId);
  const payment =
    scoped.find((candidate) => candidate.status === PaymentStatus.SUCCEEDED) ?? scoped[0] ?? null;

  if (!payment) {
    return null;
  }

  return {
    status: payment.status,
    amount: payment.amount.toString(),
    currency: payment.currency,
    verifiedAt: payment.verifiedAt ? payment.verifiedAt.toISOString() : null,
  };
}

async function getCanonicalPayments(enrollmentIds: string[]): Promise<SafePayment[]> {
  if (enrollmentIds.length === 0) {
    return [];
  }

  return await prisma.payment.findMany({
    where: { enrollmentId: { in: enrollmentIds } },
    orderBy: { createdAt: "desc" },
    select: {
      enrollmentId: true,
      status: true,
      amount: true,
      currency: true,
      verifiedAt: true,
      createdAt: true,
    },
  });
}

export async function getStaffEnrollments(
  query: StaffEnrollmentQueryInput
): Promise<StaffEnrollmentListResult> {
  const pageSize = STAFF_ENROLLMENT_PAGE_SIZE;
  const where = buildStaffEnrollmentWhere(query);
  const total = await prisma.enrollment.count({ where });
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  const rows =
    totalPages > 0 && query.page > totalPages
      ? []
      : await prisma.enrollment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (query.page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            reference: true,
            status: true,
            approvedAt: true,
            createdAt: true,
            student: { select: { user: { select: { name: true, email: true } } } },
            course: { select: { id: true, name: true, slug: true } },
            assignedTeacher: { select: { id: true, name: true } },
          },
        });

  const payments = await getCanonicalPayments(rows.map((row) => row.id));

  return {
    items: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      student: row.student.user,
      course: row.course,
      payment: pickCanonicalPayment(payments, row.id),
      teacher: row.assignedTeacher,
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    })),
    page: query.page,
    pageSize,
    total,
    totalPages,
  };
}

export async function getStaffEnrollmentDetail(
  enrollmentId: string
): Promise<StaffEnrollmentDetail | null> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      reference: true,
      status: true,
      priceAtEnrollment: true,
      currencyAtEnrollment: true,
      approvedAt: true,
      createdAt: true,
      student: { select: { user: { select: { name: true, email: true } } } },
      course: { select: { id: true, name: true, slug: true } },
      assignedTeacher: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          createdAt: true,
          changedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!enrollment) {
    return null;
  }

  const payments = await getCanonicalPayments([enrollment.id]);

  return {
    id: enrollment.id,
    reference: enrollment.reference,
    status: enrollment.status,
    student: enrollment.student.user,
    course: enrollment.course,
    payment: pickCanonicalPayment(payments, enrollment.id),
    teacher: enrollment.assignedTeacher,
    approvedAt: enrollment.approvedAt ? enrollment.approvedAt.toISOString() : null,
    createdAt: enrollment.createdAt.toISOString(),
    priceAtEnrollment: enrollment.priceAtEnrollment.toString(),
    currencyAtEnrollment: enrollment.currencyAtEnrollment,
    approvedBy: enrollment.approvedBy,
    history: enrollment.statusHistory.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      actorName: entry.changedBy?.name ?? "System",
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function getStaffEnrollmentFilterOptions() {
  const [courses, teachers] = await Promise.all([
    prisma.course.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { role: UserRole.TEACHER },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { courses, teachers };
}
