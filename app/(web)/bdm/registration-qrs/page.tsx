import QRCode from "qrcode";
import { UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { listRegistrationQrs } from "@/lib/server/services/admission.service";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui/primitives";
import GenerateQrButton from "./GenerateQrButton";
import RegistrationQrCard from "./RegistrationQrCard";

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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {qrs.map((qr, index) => (
              <RegistrationQrCard
                key={qr.id}
                qr={{
                  id: qr.id,
                  url: qr.url,
                  createdAt: qr.createdAt.toISOString(),
                  usedAt: qr.usedAt ? qr.usedAt.toISOString() : null,
                  revokedAt: qr.revokedAt ? qr.revokedAt.toISOString() : null,
                  admission: qr.admission,
                }}
                imageSrc={qrImages[index]}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
