import { UserRole } from "@/generated/prisma/client";
import { requirePageRole } from "@/lib/server/guards/auth";
import { AppShell } from "@/components/ui/shells";

export const metadata = {
  title: "Teacher Dashboard | Luminedge",
};

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageRole([UserRole.TEACHER]);

  return (
    <AppShell
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
        title="Faculty & Teacher Portal"
        activeHref="/teacher/dashboard"
        maxWidth="max-w-6xl"
      >
      {children}
    </AppShell>
  );
}
