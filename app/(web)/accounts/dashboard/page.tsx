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
        title="Admission approval"
        description="Review BDM submitted Admissions, verify payment amounts, and approve learning access."
      />

      <div className="mb-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/accounts/admissions?status=PENDING_ACCOUNTS_APPROVAL" aria-label="View admissions awaiting approval">
          <StatCard metricId="awaiting-approval" label="Awaiting approval" value={dashboard.awaitingApproval} helper="BDM submitted Admissions" tone="info" />
        </Link>
        <StatCard metricId="approved-today" label="Approved today" value={dashboard.approvedToday} helper="Bangladesh business day" tone="warning" />
        <StatCard metricId="total-approved" label="Total approved" value={dashboard.totalApproved} helper="Accounts approved Admissions" tone="success" />
        <StatCard metricId="verified-value" label="Manual value" value={paymentValue} helper="Manual admission payments" tone="neutral" />
      </div>

      <div className="mb-6">
        <CalloutCard
          title="Review Admissions"
          description="Open the Accounts queue to approve BDM submitted admissions and create learning access."
          href="/accounts/admissions"
          actionLabel="Open Admission Queue"
        />
      </div>

      <div className="mb-6">
        <SectionCard
          title="Pending approvals"
          description="Admissions waiting for Accounts review. Open one to verify payment and approve."
          action={<StatusBadge status="PENDING_ACCOUNTS_APPROVAL" />}
        >
          {dashboard.pendingAdmissions.length === 0 ? (
            <EmptyState
              title="No admissions awaiting approval"
              description="Submitted admissions will appear here for review."
              action={<Link href="/accounts/admissions" className="lum-btn-primary">Open Admissions</Link>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="lum-table">
                <thead>
                  <tr>
                    {["Student", "Course", "Reference", "Paid", "Action"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.pendingAdmissions.map((admission) => (
                    <tr key={admission.id}>
                      <td>
                        <p className="font-bold text-slate-950">{admission.studentName}</p>
                        <p className="max-w-[18rem] truncate text-xs text-slate-500">{admission.studentEmail}</p>
                      </td>
                      <td className="font-semibold text-slate-700">{admission.courseName}</td>
                      <td className="font-mono text-xs text-slate-600">{admission.reference}</td>
                      <td className="font-mono text-xs">
                        {admission.paidAmount ? `${admission.currency} ${Number(admission.paidAmount).toLocaleString("en-BD")}` : "Pending"}
                      </td>
                      <td>
                        <Link href={`/accounts/admissions/${admission.id}`} className="lum-btn-secondary px-3 py-2 text-xs">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recently approved" description="Completed Accounts approvals.">
        {dashboard.recentActivity.length === 0 ? (
          <EmptyState
            title="No approvals yet"
            description="Admissions you approve will appear here."
            action={<Link href="/accounts/admissions" className="lum-btn-primary">Open Admissions</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="lum-table">
              <thead>
                <tr>
                  {["Student", "Course", "Reference", "Date"].map((h) => (
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
