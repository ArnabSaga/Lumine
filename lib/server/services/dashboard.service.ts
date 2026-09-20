import "server-only";

import { AdmissionStatus, EnrollmentStatus, PaymentStatus, Prisma, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/server/db";
import { getBangladeshTodayRange, getBangladeshWeekRange } from "@/lib/shared/date-metrics";

export type RecentApprovalActivity = {
  id: string;
  reference: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  approvedByName: string;
  teacherName: string;
  approvedAt: string | null;
};

export async function getRecentApprovalActivity(limit = 5): Promise<RecentApprovalActivity[]> {
  const rows = await prisma.enrollment.findMany({
    where: { status: EnrollmentStatus.APPROVED },
    // Deterministic tie-breaker: equal approvedAt values order repeatably.
    orderBy: [{ approvedAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      reference: true,
      approvedAt: true,
      student: { select: { user: { select: { name: true, email: true } } } },
      course: { select: { name: true } },
      approvedBy: { select: { name: true } },
      assignedTeacher: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    studentName: row.student.user.name,
    studentEmail: row.student.user.email,
    courseName: row.course.name,
    approvedByName: row.approvedBy?.name ?? "System",
    teacherName: row.assignedTeacher?.name ?? "Not assigned",
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
  }));
}

export async function getBdmDashboardData(userId: string) {
  const today = getBangladeshTodayRange();

  const [registered, awaitingAccounts, assigned, submittedToday, recentActivity] = await Promise.all([
    prisma.admission.count({
      where: { bdmUserId: userId, status: AdmissionStatus.REGISTERED },
    }),
    prisma.admission.count({
      where: { bdmUserId: userId, status: AdmissionStatus.PENDING_ACCOUNTS_APPROVAL },
    }),
    prisma.admission.count({
      where: { bdmUserId: userId, status: AdmissionStatus.ASSIGNED_TO_TEACHER },
    }),
    prisma.admission.count({
      where: {
        bdmUserId: userId,
        status: AdmissionStatus.PENDING_ACCOUNTS_APPROVAL,
        submittedAt: { gte: today.start, lt: today.end },
      },
    }),
    prisma.admission.findMany({
      where: { bdmUserId: userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        reference: true,
        status: true,
        updatedAt: true,
        student: { select: { user: { select: { name: true, email: true } } } },
        course: { select: { name: true } },
      },
    }),
  ]);

  return {
    registered,
    awaitingAccounts,
    assigned,
    submittedToday,
    recentActivity: recentActivity.map((item) => ({
      id: item.id,
      reference: item.reference,
      status: item.status,
      updatedAt: item.updatedAt.toISOString(),
      studentName: item.student.user.name,
      studentEmail: item.student.user.email,
      courseName: item.course?.name ?? "Not selected",
    })),
  };
}

export async function getAccountsDashboardData() {
  const today = getBangladeshTodayRange();

  const [awaitingApproval, approvedToday, totalApproved, paymentGroups, recentActivity] = await Promise.all([
    prisma.admission.count({ where: { status: AdmissionStatus.PENDING_ACCOUNTS_APPROVAL } }),
    prisma.admission.count({
      where: {
        status: AdmissionStatus.ASSIGNED_TO_TEACHER,
        accountsApprovedBy: { role: UserRole.ACCOUNTS },
        accountsApprovedAt: { gte: today.start, lt: today.end },
      },
    }),
    prisma.admission.count({ where: { status: AdmissionStatus.ASSIGNED_TO_TEACHER } }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: PaymentStatus.SUCCEEDED, provider: "MANUAL_ADMISSION" },
      _sum: { amount: true },
    }),
    prisma.admission.findMany({
      where: { status: AdmissionStatus.ASSIGNED_TO_TEACHER },
      orderBy: [{ accountsApprovedAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        reference: true,
        accountsApprovedAt: true,
        student: { select: { user: { select: { name: true, email: true } } } },
        course: { select: { name: true } },
      },
    }),
  ]);

  const verifiedPaymentValues = paymentGroups.map((group) => ({
    currency: group.currency,
    amount: (group._sum.amount ?? new Prisma.Decimal(0)).toString(),
  }));

  return {
    awaitingApproval,
    approvedToday,
    totalApproved,
    verifiedPaymentValues,
    recentActivity: recentActivity.map((item) => ({
      id: item.id,
      reference: item.reference,
      approvedAt: item.accountsApprovedAt ? item.accountsApprovedAt.toISOString() : null,
      studentName: item.student.user.name,
      studentEmail: item.student.user.email,
      courseName: item.course?.name ?? "Not selected",
    })),
  };
}

export async function getTeacherDashboardMetrics(teacherId: string) {
  const week = getBangladeshWeekRange();

  const [assignedStudents, distinctCourses, approvedThisWeek] = await Promise.all([
    prisma.enrollment.count({
      where: { assignedTeacherId: teacherId, status: EnrollmentStatus.APPROVED },
    }),
    // Single distinct-course query reused for Courses Teaching and Total Modules.
    prisma.enrollment.groupBy({
      by: ["courseId"],
      where: { assignedTeacherId: teacherId, status: EnrollmentStatus.APPROVED },
    }),
    prisma.enrollment.count({
      where: {
        assignedTeacherId: teacherId,
        status: EnrollmentStatus.APPROVED,
        approvedAt: { gte: week.start, lt: week.end },
      },
    }),
  ]);

  const moduleCounts = await prisma.course.findMany({
    where: { id: { in: distinctCourses.map((item) => item.courseId) } },
    select: { _count: { select: { modules: true } } },
  });

  return {
    assignedStudents,
    coursesTeaching: distinctCourses.length,
    approvedThisWeek,
    totalModules: moduleCounts.reduce((sum, course) => sum + course._count.modules, 0),
  };
}
