import Link from "next/link";
import { notFound } from "next/navigation";
import { AdmissionStatus, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/server/db";
import { requirePageRole } from "@/lib/server/guards/auth";
import { getBdmAdmissionDetail } from "@/lib/server/services/admission.service";
import { GlassCard, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";
import SubmitAdmissionForm from "./SubmitAdmissionForm";

export const metadata = { title: "Admission Detail — Luminedge" };

export default async function BdmAdmissionDetailPage({ params }: { params: Promise<{ admissionId: string }> }) {
  const { admissionId } = await params;
  const session = await requirePageRole([UserRole.BDM]);
  const admission = await getBdmAdmissionDetail(admissionId, session.user.id);
  if (!admission) notFound();

  const [courses, teachers] = await Promise.all([
    prisma.course.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: UserRole.TEACHER }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const submitted = admission.status !== AdmissionStatus.REGISTERED;

  return (
    <>
      <PageHeader
        light
        eyebrow="Admission detail"
        title={admission.student.user.name}
        description={`Reference ${admission.reference}. This record is visible because it belongs to your BDM QR relationship.`}
        action={<Link href="/bdm/admissions" className="lum-btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">Back</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
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
              <div><dt className="lum-label">Phone</dt><dd className="font-semibold text-slate-800">{admission.student.phone}</dd></div>
              <div><dt className="lum-label">Education</dt><dd className="font-semibold text-slate-800">{admission.student.education}</dd></div>
              <div className="sm:col-span-2"><dt className="lum-label">Address</dt><dd className="font-semibold text-slate-800">{admission.student.address}</dd></div>
              {admission.student.additionalInfo && (
                <div className="sm:col-span-2"><dt className="lum-label">Additional Information</dt><dd className="font-semibold text-slate-800">{admission.student.additionalInfo}</dd></div>
              )}
            </dl>
          </GlassCard>

          <SectionCard title="Admission timeline" description="Real persisted Admission workflow events.">
            <div className="space-y-3">
              {admission.statusHistory.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white/75 p-3">
                  <p className="font-mono text-xs font-black text-slate-700">{entry.toStatus.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString("en-BD")}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Submit admission" description="Enter course, payment, class date, and teacher assignment for Accounts review.">
          <SubmitAdmissionForm admissionId={admission.id} courses={courses} teachers={teachers} disabled={submitted} />
        </SectionCard>
      </div>
    </>
  );
}
