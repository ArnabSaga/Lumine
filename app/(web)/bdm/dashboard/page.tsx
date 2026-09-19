import Link from "next/link";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import { CalloutCard, EmptyState, PageHeader, SectionCard, StatCard } from "@/components/ui/primitives";

export const metadata = { title: "BDM Dashboard — Luminedge" };

export default async function BdmDashboardPage() {
  const session = await requirePageRole([UserRole.BDM]);

  const approvedByMe = await prisma.enrollment.findMany({
    where: { approvedById: session.user.id },
    orderBy: { approvedAt: "desc" },
    take: 20,
    select: {
      id: true,
      reference: true,
      status: true,
      approvedAt: true,
      course: { select: { name: true } },
      student: { select: { user: { select: { name: true, email: true } } } },
      assignedTeacher: { select: { name: true } },
    },
  });

  const pendingVerification = await prisma.enrollment.count({ where: { status: "PAYMENT_VERIFIED" } });
  const totalApproved = await prisma.enrollment.count({ where: { approvedById: session.user.id, status: "APPROVED" } });

  return (
    <div>
      <PageHeader
        light
        eyebrow="BDM portal"
        title={`Welcome, ${session.user.name}`}
        description="Review your recent approvals and open the scanner when a student is ready for verification."
      />

      <div className="mb-6 grid gap-5 md:grid-cols-2">
        <StatCard label="Approved by me" value={totalApproved} helper="Enrollments approved from your account" tone="success" />
        <StatCard label="Awaiting approval" value={pendingVerification} helper="Verified payments ready for staff review" tone="warning" />
      </div>

      <div className="mb-6">
        <CalloutCard
          title="Scan and verify an enrollment"
          description="Ask the student to show their QR code, then verify payment status and assign the correct teacher."
          href="/staff/scan"
          actionLabel="Open QR Scanner"
        />
      </div>

      <SectionCard title="My recent approvals" description="Privacy-safe approval history for enrollments approved by your account.">
        {approvedByMe.length === 0 ? (
          <EmptyState
            title="No approvals yet"
            description="Use the QR scanner to approve your first verified enrollment."
            action={<Link href="/staff/scan" className="lum-btn-primary">Open scanner</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="lum-table">
              <thead>
                <tr>
                  {["Student", "Course", "Teacher", "Reference", "Approved"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvedByMe.map((enr) => (
                  <tr key={enr.id}>
                    <td>
                      <p className="font-bold text-slate-950">{enr.student.user.name}</p>
                      <p className="max-w-[18rem] truncate text-xs text-slate-500">{enr.student.user.email}</p>
                    </td>
                    <td className="font-semibold text-slate-700">{enr.course.name}</td>
                    <td>{enr.assignedTeacher?.name ?? "Not assigned"}</td>
                    <td className="font-mono text-xs text-slate-500">{enr.reference}</td>
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
