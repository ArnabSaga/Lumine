import { UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { AppShell } from "@/components/ui/shells";

export const metadata = {
  title: "Accounts Dashboard | Luminedge",
};

export default async function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageRole([UserRole.ACCOUNTS]);

  return (
    <AppShell
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
        title="Accounts & Verification Workspace"
        activeHref="/accounts/dashboard"
      >
      {children}
    </AppShell>
  );
}
