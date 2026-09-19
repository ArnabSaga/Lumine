import Link from "next/link";
import { requirePageRole } from "@/lib/server/guards/auth";
import { UserRole } from "@/generated/prisma/client";
import { getAccountsDashboardData } from "@/lib/server/services/dashboard.service";
import { CalloutCard, EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";

export const metadata = { title: "Accounts Dashboard — Luminedge" };

export default async function AccountsDashboardPage() {
  await requirePageRole([UserRole.ACCOUNTS]);
  const dashboard = await getAccountsDashboardData();
  const paymentValue = dashboard.verifiedPaymentValues
    .map((item) => `${item.currency} ${Number(item.amount).toLocaleString("en-BD")}`)
    .join(" · ") || "BDT 0";

  return (
    <div>
      <PageHeader
        light
        eyebrow="Accounts portal"
        title="Payment verification"
        description="Review verified payments, scan student QR codes, and approve enrollments with the appropriate teacher assignment."
      />

      <div className="mb-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting approval" value={dashboard.awaitingApproval} helper="Payment verified enrollments" tone="info" />
        <StatCard label="Approved today" value={dashboard.approvedToday} helper="Bangladesh business day" tone="warning" />
        <StatCard label="Total approved" value={dashboard.totalApproved} helper="Approved enrollments" tone="success" />
        <StatCard label="Verified value" value={paymentValue} helper="Succeeded payments" tone="neutral" />
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
          title="Operations workspace"
          description="Search and filter all verification-safe enrollment records."
          action={<StatusBadge status="PAYMENT_VERIFIED" />}
        >
          <EmptyState
            title="Use enrollment management"
            description="Open the staff workspace to search by student, email, reference, course, status, or assigned teacher."
            action={<Link href="/staff/enrollments" className="lum-btn-primary">Open enrollments</Link>}
          />
        </SectionCard>
      </div>

      <SectionCard title="Recently approved" description="Completed approvals with assigned teachers.">
        {dashboard.recentActivity.length === 0 ? (
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
                  {["Student", "Course", "Reference", "Teacher", "Approved by", "Date"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboard.recentActivity.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <p className="font-bold text-slate-950">{activity.studentName}</p>
                      <p className="max-w-[18rem] truncate text-xs text-slate-500">{activity.studentEmail}</p>
                    </td>
                    <td className="font-semibold text-slate-700">{activity.courseName}</td>
                    <td className="font-mono text-xs text-slate-600">{activity.reference}</td>
                    <td>{activity.teacherName}</td>
                    <td>{activity.approvedByName}</td>
                    <td className="text-sm text-slate-500">
                      {activity.approvedAt ? new Date(activity.approvedAt).toLocaleDateString("en-BD") : "Pending"}
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
