import Link from "next/link";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import { CalloutCard, EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";

export const metadata = { title: "Accounts Dashboard — Luminedge" };

export default async function AccountsDashboardPage() {
  await requirePageRole([UserRole.ACCOUNTS]);

  const verifiedEnrollments = await prisma.enrollment.findMany({
    where: { status: "PAYMENT_VERIFIED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      reference: true,
      priceAtEnrollment: true,
      currencyAtEnrollment: true,
      createdAt: true,
      course: { select: { name: true } },
      student: { select: { user: { select: { name: true, email: true } } } },
      payments: {
        where: { status: "SUCCEEDED" },
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: { amount: true, currency: true, verifiedAt: true },
      },
    },
  });

  const approvedEnrollments = await prisma.enrollment.findMany({
    where: { status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
    take: 20,
    select: {
      id: true,
      reference: true,
      approvedAt: true,
      course: { select: { name: true } },
      student: { select: { user: { select: { name: true, email: true } } } },
      assignedTeacher: { select: { name: true } },
      approvedBy: { select: { name: true } },
      payments: {
        where: { status: "SUCCEEDED" },
        take: 1,
        select: { amount: true, currency: true },
      },
    },
  });

  return (
    <div>
      <PageHeader
        light
        eyebrow="Accounts portal"
        title="Payment verification"
        description="Review verified payments, scan student QR codes, and approve enrollments with the appropriate teacher assignment."
      />

      <div className="mb-6 grid gap-5 md:grid-cols-2">
        <StatCard label="Awaiting approval" value={verifiedEnrollments.length} helper="Payment verified enrollments" tone="info" />
        <StatCard label="Total approved" value={approvedEnrollments.length} helper="Recently approved enrollments" tone="success" />
      </div>

      <div className="mb-6">
        <CalloutCard
          title="Verify a student enrollment"
          description="Scan the student's QR code to validate payment, review the enrollment, and assign the correct teacher."
          href="/staff/scan"
          actionLabel="Open QR Scanner"
        />
      </div>

      <div className="mb-6">
        <SectionCard
          title="Payment verified queue"
          description="Only verification-safe fields are shown here."
          action={<StatusBadge status="PAYMENT_VERIFIED" />}
        >
          {verifiedEnrollments.length === 0 ? (
            <EmptyState title="Queue is clear" description="All verified payments have been approved." />
          ) : (
            <div className="overflow-x-auto">
              <table className="lum-table">
                <thead>
                  <tr>
                    {["Student", "Course", "Amount paid", "Reference", "Enrolled"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {verifiedEnrollments.map((enr) => (
                    <tr key={enr.id}>
                      <td>
                        <p className="font-bold text-slate-950">{enr.student.user.name}</p>
                        <p className="max-w-[18rem] truncate text-xs text-slate-500">{enr.student.user.email}</p>
                      </td>
                      <td className="font-semibold text-slate-700">{enr.course.name}</td>
                      <td className="font-mono text-sm font-black text-emerald-700">
                        {enr.payments[0] ? `${enr.payments[0].currency} ${Number(enr.payments[0].amount).toLocaleString()}` : "No payment"}
                      </td>
                      <td className="font-mono text-xs text-slate-500">{enr.reference}</td>
                      <td className="text-sm text-slate-500">{new Date(enr.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recently approved" description="Completed approvals with assigned teachers.">
        {approvedEnrollments.length === 0 ? (
          <EmptyState
            title="No approvals yet"
            description="Use the scanner when a verified student is ready for approval."
            action={<Link href="/staff/scan" className="lum-btn-primary">Open scanner</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="lum-table">
              <thead>
                <tr>
                  {["Student", "Course", "Amount", "Teacher", "Approved by", "Date"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvedEnrollments.map((enr) => (
                  <tr key={enr.id}>
                    <td>
                      <p className="font-bold text-slate-950">{enr.student.user.name}</p>
                      <p className="max-w-[18rem] truncate text-xs text-slate-500">{enr.student.user.email}</p>
                    </td>
                    <td className="font-semibold text-slate-700">{enr.course.name}</td>
                    <td className="font-mono text-xs text-slate-600">
                      {enr.payments[0] ? `${enr.payments[0].currency} ${Number(enr.payments[0].amount).toLocaleString()}` : "No payment"}
                    </td>
                    <td>{enr.assignedTeacher?.name ?? "Not assigned"}</td>
                    <td>{enr.approvedBy?.name ?? "System"}</td>
                    <td className="text-sm text-slate-500">
                      {enr.approvedAt ? new Date(enr.approvedAt).toLocaleDateString() : "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
