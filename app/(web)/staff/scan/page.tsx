import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";
import QrScanner from "./QrScanner";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export const metadata = { title: "Scan QR — Luminedge Staff" };

export default async function StaffScanPage() {
  const session = await requirePageRole([UserRole.BDM, UserRole.ACCOUNTS], "/staff/login");

  const teachers = await prisma.user.findMany({
    where: { role: UserRole.TEACHER },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const dashboardUrl = getDashboardRouteForRole(session.user.role);

  return (
    <main style={{ minHeight: "100vh", background: "var(--lum-neutral)", fontFamily: "var(--font-sans)" }}>
      <header style={{ background: "var(--lum-tertiary)", padding: "0 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "#f1f5f9", textDecoration: "none" }}>
            Luminedge
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <Link href={dashboardUrl} style={{ fontSize: "0.8rem", color: "#94a3b8", textDecoration: "none" }}>
              Dashboard
            </Link>
            <Link href="/staff/scan" style={{ fontSize: "0.8rem", color: "var(--lum-primary)", fontWeight: 700, textDecoration: "none" }}>
              QR Scanner
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "0.5rem" }}>
          Enrollment QR Scanner
        </h1>
        <p style={{ color: "#64748b", marginBottom: "2rem" }}>
          Scan a student&apos;s verification QR code using your camera or enter the verification token manually to approve their enrollment.
        </p>
        <QrScanner teachers={teachers} />
      </div>
    </main>
  );
}
