/* eslint-disable @next/next/no-img-element */
import QRCode from "qrcode";
import { UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { listRegistrationQrs } from "@/lib/server/services/admission.service";
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";
import GenerateQrButton from "./GenerateQrButton";

export const metadata = { title: "Registration QRs — Luminedge" };

export default async function RegistrationQrsPage() {
  const session = await requirePageRole([UserRole.BDM]);
  const qrs = await listRegistrationQrs(session.user.id);
  const qrImages = await Promise.all(qrs.map((qr) => QRCode.toDataURL(qr.url, { margin: 1, width: 180 })));

  return (
    <>
      <PageHeader
        light
        eyebrow="BDM portal"
        title="Registration QRs"
        description="Create single use student registration links. Admissions created from these QRs are owned by your BDM account."
        action={<GenerateQrButton />}
      />

      <SectionCard title="Recent registration QRs" description="Share one QR per student. Used QRs cannot create another Admission.">
        {qrs.length === 0 ? (
          <EmptyState title="No registration QRs yet" description="Generate a QR to start a student admission." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {qrs.map((qr, index) => (
              <div key={qr.id} className="rounded-[var(--lum-radius-card)] border border-slate-200 bg-white/80 p-4">
                <img src={qrImages[index]} alt="Student registration QR" className="mx-auto h-44 w-44 rounded-2xl bg-white p-2" />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <StatusBadge status={qr.admission ? qr.admission.status : qr.usedAt ? "USED" : "ACTIVE"} />
                  <span className="text-xs text-slate-500">{new Date(qr.createdAt).toLocaleDateString("en-BD")}</span>
                </div>
                <p className="mt-3 break-all font-mono text-xs text-slate-600">{qr.url}</p>
                {qr.admission && (
                  <p className="mt-3 text-sm text-slate-600">
                    Admission <span className="font-mono font-black">{qr.admission.reference}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
