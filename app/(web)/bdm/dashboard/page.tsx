import Link from "next/link";
import { requirePageRole } from "@/lib/server/guards/auth";
import { UserRole } from "@/generated/prisma/client";
import { getBdmDashboardData } from "@/lib/server/services/dashboard.service";
import { CalloutCard, EmptyState, PageHeader, SectionCard, StatCard } from "@/components/ui/primitives";

export const metadata = { title: "BDM Dashboard — Luminedge" };

export default async function BdmDashboardPage() {
  const session = await requirePageRole([UserRole.BDM]);
  const dashboard = await getBdmDashboardData(session.user.id);

  return (
    <div>
      <PageHeader
        light
        eyebrow="BDM portal"
        title={`Welcome, ${session.user.name}`}
        description="Review your recent approvals and open the scanner when a student is ready for verification."
      />

      <div className="mb-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Approved by me" value={dashboard.approvedByMe} helper="Approved from your account" tone="success" />
        <StatCard label="Awaiting approval" value={dashboard.awaitingApproval} helper="Global verified queue" tone="warning" />
        <StatCard label="Approved today" value={dashboard.approvedToday} helper="Bangladesh business day" tone="info" />
        <StatCard label="Total verified" value={dashboard.totalVerified} helper="Verified or approved" tone="neutral" />
      </div>

      <div className="mb-6">
        <CalloutCard
          title="Scan and verify an enrollment"
          description="Ask the student to show their QR code, then verify payment status and assign the correct teacher."
          href="/staff/scan"
          actionLabel="Open QR Scanner"
        />
      </div>

      <SectionCard title="Recent approval activity" description="Latest completed approvals from real enrollment records.">
        {dashboard.recentActivity.length === 0 ? (
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
                {dashboard.recentActivity.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <p className="font-bold text-slate-950">{activity.studentName}</p>
                      <p className="max-w-[18rem] truncate text-xs text-slate-500">{activity.studentEmail}</p>
                    </td>
                    <td className="font-semibold text-slate-700">{activity.courseName}</td>
                    <td>{activity.teacherName}</td>
                    <td className="font-mono text-xs text-slate-500">{activity.reference}</td>
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
