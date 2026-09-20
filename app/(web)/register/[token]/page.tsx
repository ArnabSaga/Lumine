import { notFound, redirect } from "next/navigation";
import { AuthShell } from "@/components/ui/shells";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { getRegistrationQrForPublicToken } from "@/lib/server/services/admission.service";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";
import { RegistrationQrForm } from "./registration-qr-form";

export const metadata = {
  title: "QR Registration — Luminedge",
  description: "Complete Luminedge student registration from a BDM issued QR.",
};

export default async function RegistrationQrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getCurrentSession();
  if (session?.user) {
    redirect(getDashboardRouteForRole(session.user.role));
  }

  const qr = await getRegistrationQrForPublicToken(token);
  if (!qr) notFound();

  const unavailable = Boolean(qr.revokedAt || qr.usedAt || qr.admission);

  return (
    <AuthShell
      title={unavailable ? "Registration link unavailable" : "Complete QR registration"}
      description={
        unavailable
          ? "This registration QR has already been used or is no longer available."
          : `This student registration is linked to ${qr.bdm.name}. Create your student account and submit admission details.`
      }
    >
      {unavailable ? (
        <p className="text-center text-sm leading-6 text-slate-600">
          Please contact your Luminedge BDM for a fresh registration QR.
        </p>
      ) : (
        <RegistrationQrForm token={token} bdmName={qr.bdm.name} />
      )}
    </AuthShell>
  );
}
