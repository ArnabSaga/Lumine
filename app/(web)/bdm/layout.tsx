import { UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { AppShell } from "@/components/ui/shells";

export const metadata = {
  title: "BDM Dashboard | Luminedge",
};

export default async function BdmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageRole([UserRole.BDM]);

  return (
    <AppShell
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
        title="Business Development Manager Portal"
        activeHref="/bdm/dashboard"
      >
      {children}
    </AppShell>
  );
}
