import Link from "next/link";
import { notFound } from "next/navigation";
import { AdmissionStatus, UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { getAccountsAdmissionDetail } from "@/lib/server/services/admission.service";
import { GlassCard, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";
import ApproveAdmissionButton from "../ApproveAdmissionButton";

export const metadata = { title: "Accounts Admission Review — Luminedge" };

export default async function AccountsAdmissionDetailPage({ params }: { params: Promise<{ admissionId: string }> }) {
  const { admissionId } = await params;
  await requirePageRole([UserRole.ACCOUNTS]);
  const admission = await getAccountsAdmissionDetail(admissionId);
  if (!admission) notFound();

  return (
    <>
      <PageHeader
        light
        eyebrow="Accounts review"
        title={admission.student.user.name}
        description={`Payment safe review for reference ${admission.reference}.`}
        action={<Link href="/accounts/admissions" className="lum-btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">Back</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="lum-eyebrow">Student</p>
              <h2 className="mt-2 font-display text-2xl font-black text-slate-950">{admission.student.user.name}</h2>
              <p className="text-sm text-slate-500">{admission.student.user.email}</p>
            </div>
            <StatusBadge status={admission.status} />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><dt className="lum-label">Course</dt><dd className="font-semibold text-slate-800">{admission.course?.name ?? "Not selected"}</dd></div>
            <div><dt className="lum-label">Reference</dt><dd className="font-mono text-sm font-black text-slate-800">{admission.reference}</dd></div>
            <div><dt className="lum-label">Admission Amount</dt><dd className="font-mono font-black text-slate-800">{admission.currency} {admission.admissionAmount?.toString() ?? "Pending"}</dd></div>
            <div><dt className="lum-label">Paid Amount</dt><dd className="font-mono font-black text-slate-800">{admission.currency} {admission.paidAmount?.toString() ?? "Pending"}</dd></div>
            {admission.classStartingDate && (
              <div><dt className="lum-label">Class Starting Date</dt><dd className="font-semibold text-slate-800">{admission.classStartingDate.toISOString().slice(0, 10)}</dd></div>
            )}
          </dl>
        </GlassCard>

        <SectionCard title="Approval" description="Accounts approval creates the approved Enrollment, manual Payment, and Teacher assignment.">
          {admission.status === AdmissionStatus.PENDING_ACCOUNTS_APPROVAL ? (
            <ApproveAdmissionButton admissionId={admission.id} teacherName={admission.assignedTeacher?.name ?? null} />
          ) : (
            <StatusBadge status={admission.status} />
          )}
        </SectionCard>

        <SectionCard title="Admission timeline" description="Ordered workflow history." className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            {admission.statusHistory.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white/75 p-3">
                <p className="font-mono text-xs font-black text-slate-700">{entry.toStatus.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString("en-BD")}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
