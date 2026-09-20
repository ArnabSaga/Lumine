import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { getStaffEnrollmentDetail } from "@/lib/server/services/staff-enrollment.service";
import { getEnrollmentHistoryDescription, getEnrollmentHistoryLabel } from "@/lib/shared/enrollment-history";
import { AppShell } from "@/components/ui/shells";
import { GlassCard, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";

export const metadata = { title: "Enrollment Detail — Luminedge Staff" };

function formatDateTime(value: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString("en-BD")}`;
}

export default async function StaffEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const session = await requirePageRole([UserRole.ACCOUNTS], "/staff/login");
  const { enrollmentId } = await params;
  const enrollment = await getStaffEnrollmentDetail(enrollmentId);

  if (!enrollment) {
    notFound();
  }

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
      title="Enrollment Operations"
      activeHref="/staff/enrollments"
      maxWidth="max-w-6xl"
    >
      <PageHeader
        light
        eyebrow="Read only detail"
        title={enrollment.reference}
        description="Privacy-safe enrollment details and real status history. QR approval remains available only through the scanner workflow."
        action={<Link href="/staff/enrollments" className="lum-btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">Back to enrollments</Link>}
      />

      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <GlassCard>
          <p className="lum-eyebrow mb-2">Student</p>
          <h2 className="font-display text-xl font-black text-slate-950">{enrollment.student.name}</h2>
          <p className="mt-1 break-all text-sm text-slate-500">{enrollment.student.email}</p>
        </GlassCard>
        <GlassCard>
          <p className="lum-eyebrow mb-2">Course</p>
          <h2 className="font-display text-xl font-black text-slate-950">{enrollment.course.name}</h2>
          <p className="mt-1 font-mono text-sm font-bold text-slate-500">
            {formatMoney(enrollment.priceAtEnrollment, enrollment.currencyAtEnrollment)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="lum-eyebrow mb-2">Status</p>
          <StatusBadge status={enrollment.status} />
          <p className="mt-3 text-sm text-slate-500">Created {formatDateTime(enrollment.createdAt)}</p>
        </GlassCard>
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <SectionCard title="Payment summary" description="Canonical payment only, provider internals hidden.">
          {enrollment.payment ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="lum-label">Status</p>
                <StatusBadge status={enrollment.payment.status} />
              </div>
              <div>
                <p className="lum-label">Amount</p>
                <p className="font-mono text-lg font-black text-slate-950">
                  {formatMoney(enrollment.payment.amount, enrollment.payment.currency)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="lum-label">Verified</p>
                <p className="text-sm font-semibold text-slate-600">{formatDateTime(enrollment.payment.verifiedAt)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No payment attempt has been recorded for this enrollment.</p>
          )}
        </SectionCard>

        <SectionCard title="Teacher and approval" description="Read only assignment summary.">
          <div className="space-y-4">
            <div>
              <p className="lum-label">Assigned teacher</p>
              <p className="font-bold text-slate-950">{enrollment.teacher?.name ?? "Not assigned"}</p>
            </div>
            <div>
              <p className="lum-label">Approved by</p>
              <p className="font-bold text-slate-950">{enrollment.approvedBy?.name ?? "Not approved"}</p>
            </div>
            <div>
              <p className="lum-label">Approved at</p>
              <p className="text-sm font-semibold text-slate-600">{formatDateTime(enrollment.approvedAt)}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Status timeline" description="Real persisted EnrollmentStatusHistory records only.">
        <div className="space-y-4">
          {enrollment.history.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white/75 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-display text-base font-black text-slate-950">
                    {getEnrollmentHistoryLabel(entry.toStatus)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{getEnrollmentHistoryDescription(entry.toStatus)}</p>
                </div>
                <StatusBadge status={entry.toStatus} />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                {formatDateTime(entry.createdAt)} · {entry.actorName}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}
