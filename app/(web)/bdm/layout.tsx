import { UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { DashboardHeader } from "@/components/dashboard-header";

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <DashboardHeader
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
        title="Business Development Manager Portal"
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
