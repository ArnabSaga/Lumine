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
        description="Issue student registration QRs, manage your own Admissions, and submit completed records to Accounts."
      />

      <div className="mb-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/bdm/admissions?status=REGISTERED" aria-label="View registered admissions needing BDM entry">
          <StatCard metricId="registered" label="Registered" value={dashboard.registered} helper="Needs BDM entry" tone="info" />
        </Link>
        <StatCard metricId="awaiting-accounts" label="Awaiting Accounts" value={dashboard.awaitingAccounts} helper="Submitted for approval" tone="warning" />
        <StatCard metricId="assigned" label="Assigned" value={dashboard.assigned} helper="Approved and assigned" tone="success" />
        <StatCard metricId="submitted-today" label="Submitted today" value={dashboard.submittedToday} helper="Bangladesh business day" tone="neutral" />
      </div>

      <div className="mb-6">
        <CalloutCard
          title="Create a student registration QR"
          description="Generate a single use QR so a student can register and become linked to your BDM account."
          href="/bdm/registration-qrs"
          actionLabel="Open Registration QRs"
        />
      </div>

      <SectionCard title="Recent Admission activity" description="Latest Admissions linked to your own BDM QR registrations.">
        {dashboard.recentActivity.length === 0 ? (
          <EmptyState
            title="No Admissions yet"
            description="Generate a registration QR to start your first student Admission."
            action={<Link href="/bdm/registration-qrs" className="lum-btn-primary">Generate QR</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="lum-table">
              <thead>
                <tr>
                  {["Student", "Course", "Reference", "Status", "Updated", "Action"].map((h) => (
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
                    <td className="font-mono text-xs text-slate-500">{activity.reference}</td>
                    <td>{activity.status.replaceAll("_", " ")}</td>
                    <td className="text-sm text-slate-500">
                      {new Date(activity.updatedAt).toLocaleDateString("en-BD")}
                    </td>
                    <td>
                      <Link
                        href={`/bdm/admissions/${activity.id}`}
                        className="lum-btn-secondary px-3 py-2 text-xs"
                      >
                        {activity.status === "REGISTERED" ? "Complete Admission" : "View"}
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
  );
}
