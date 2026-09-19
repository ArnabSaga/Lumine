import "server-only";

import { EnrollmentStatus, PaymentStatus, Prisma, UserRole } from "@/generated/prisma/client";
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
    orderBy: { approvedAt: "desc" },
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

  const [approvedByMe, awaitingApproval, approvedToday, totalVerified, recentActivity] = await Promise.all([
    prisma.enrollment.count({
      where: { status: EnrollmentStatus.APPROVED, approvedById: userId },
    }),
    prisma.enrollment.count({ where: { status: EnrollmentStatus.PAYMENT_VERIFIED } }),
    prisma.enrollment.count({
      where: {
        status: EnrollmentStatus.APPROVED,
        approvedById: userId,
        approvedAt: { gte: today.start, lt: today.end },
      },
    }),
    prisma.enrollment.count({
      where: { status: { in: [EnrollmentStatus.PAYMENT_VERIFIED, EnrollmentStatus.APPROVED] } },
    }),
    getRecentApprovalActivity(5),
  ]);

  return { approvedByMe, awaitingApproval, approvedToday, totalVerified, recentActivity };
}

export async function getAccountsDashboardData() {
  const today = getBangladeshTodayRange();

  const [awaitingApproval, approvedToday, totalApproved, paymentGroups, recentActivity] = await Promise.all([
    prisma.enrollment.count({ where: { status: EnrollmentStatus.PAYMENT_VERIFIED } }),
    prisma.enrollment.count({
      where: {
        status: EnrollmentStatus.APPROVED,
        approvedBy: { role: { in: [UserRole.BDM, UserRole.ACCOUNTS] } },
        approvedAt: { gte: today.start, lt: today.end },
      },
    }),
    prisma.enrollment.count({ where: { status: EnrollmentStatus.APPROVED } }),
    prisma.payment.groupBy({
      by: ["currency"],
      where: { status: PaymentStatus.SUCCEEDED },
      _sum: { amount: true },
    }),
    getRecentApprovalActivity(5),
  ]);

  const verifiedPaymentValues = paymentGroups.map((group) => ({
    currency: group.currency,
    amount: (group._sum.amount ?? new Prisma.Decimal(0)).toString(),
  }));

  return { awaitingApproval, approvedToday, totalApproved, verifiedPaymentValues, recentActivity };
}

export async function getTeacherDashboardMetrics(teacherId: string) {
  const week = getBangladeshWeekRange();

  const [assignedStudents, coursesTeaching, approvedThisWeek, distinctCourseIds] = await Promise.all([
    prisma.enrollment.count({
      where: { assignedTeacherId: teacherId, status: EnrollmentStatus.APPROVED },
    }),
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
    prisma.enrollment.groupBy({
      by: ["courseId"],
      where: { assignedTeacherId: teacherId, status: EnrollmentStatus.APPROVED },
    }),
  ]);

  const moduleCounts = await prisma.course.findMany({
    where: { id: { in: distinctCourseIds.map((item) => item.courseId) } },
    select: { _count: { select: { modules: true } } },
  });

  return {
    assignedStudents,
    coursesTeaching: coursesTeaching.length,
    approvedThisWeek,
    totalModules: moduleCounts.reduce((sum, course) => sum + course._count.modules, 0),
  };
}
