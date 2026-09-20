import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import QrScanner from "./QrScanner";
import { AppShell } from "@/components/ui/shells";
import { PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Scan QR — Luminedge Staff" };

export default async function StaffScanPage() {
  const session = await requirePageRole([UserRole.ACCOUNTS], "/staff/login");

  const teachers = await prisma.user.findMany({
    where: { role: UserRole.TEACHER },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
      title="Enrollment Verification"
      activeHref="/staff/scan"
      maxWidth="max-w-5xl"
    >
        <PageHeader
          light
          eyebrow="Scanner"
          title="Scan student QR"
          description="Use the camera scanner or the permanent manual verification field to resolve a student's verified enrollment."
        />
        <QrScanner teachers={teachers} />
    </AppShell>
  );
}
