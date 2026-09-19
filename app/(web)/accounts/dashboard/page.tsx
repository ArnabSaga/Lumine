import Link from "next/link";
import Image from "next/image";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import SignOutButton from "@/components/SignOutButton";

export const metadata = { title: "Accounts Dashboard — Luminedge" };

export default async function AccountsDashboardPage() {
  await requirePageRole([UserRole.ACCOUNTS]);

  // Privacy-safe: only name, email, course, amounts, status — no address/education
  const verifiedEnrollments = await prisma.enrollment.findMany({
    where: { status: "PAYMENT_VERIFIED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      reference: true,
      priceAtEnrollment: true,
      currencyAtEnrollment: true,
      createdAt: true,
      course: { select: { name: true } },
      student: { select: { user: { select: { name: true, email: true } } } },
      payments: {
        where: { status: "SUCCEEDED" },
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: { amount: true, currency: true, verifiedAt: true },
      },
    },
  });

  const approvedEnrollments = await prisma.enrollment.findMany({
    where: { status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
    take: 20,
    select: {
      id: true,
      reference: true,
      approvedAt: true,
      course: { select: { name: true } },
      student: { select: { user: { select: { name: true, email: true } } } },
      assignedTeacher: { select: { name: true } },
      approvedBy: { select: { name: true } },
      payments: {
        where: { status: "SUCCEEDED" },
        take: 1,
        select: { amount: true, currency: true },
      },
    },
  });

  return (
    <main style={{ minHeight: "100vh", background: "var(--lum-neutral)", fontFamily: "var(--font-sans)" }}>
      <header style={{ background: "var(--lum-tertiary)", padding: "0 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/logo/logo.png" alt="Luminedge" width={26} height={26} style={{ borderRadius: 6 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "#f1f5f9" }}>Luminedge</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <Link href="/accounts/dashboard" style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--lum-primary)", textDecoration: "none" }}>Dashboard</Link>
            <Link href="/staff/scan" style={{ fontSize: "0.8rem", color: "#94a3b8", textDecoration: "none" }}>Scan QR</Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Accounts Portal</span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.04em" }}>
            Payment Verification
          </h1>
        </div>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
          <div className="lum-card" style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "0.375rem" }}>Awaiting Approval</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 900, color: "#2563eb" }}>{verifiedEnrollments.length}</p>
          </div>
          <div className="lum-card" style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "0.375rem" }}>Total Approved</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 900, color: "#059669" }}>{approvedEnrollments.length}</p>
          </div>
        </div>

        {/* Scan CTA */}
        <div className="lum-card" style={{ background: "var(--lum-secondary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.25rem" }}>Verify a student enrollment</h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Scan the student&apos;s QR code to validate payment and assign a teacher.</p>
          </div>
          <Link href="/staff/scan" className="lum-btn-primary" style={{ whiteSpace: "nowrap" }}>
            Open QR Scanner →
          </Link>
        </div>

        {/* Payment-verified queue */}
        <div className="lum-card" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>Payment Verified — Awaiting Approval</h2>
            <span className="lum-badge lum-badge-verified">{verifiedEnrollments.length} waiting</span>
          </div>
          {verifiedEnrollments.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Queue is clear — all verified payments have been approved.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #f1f5f9" }}>
                    {["Student", "Course", "Amount Paid", "Reference", "Enrolled At"].map((h) => (
                      <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {verifiedEnrollments.map((enr) => (
                    <tr key={enr.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "0.625rem 0.75rem" }}>
                        <p style={{ fontWeight: 600 }}>{enr.student.user.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{enr.student.user.email}</p>
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem" }}>{enr.course.name}</td>
                      <td style={{ padding: "0.625rem 0.75rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#059669" }}>
                        {enr.payments[0] ? `${enr.payments[0].currency} ${Number(enr.payments[0].amount).toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{enr.reference}</td>
                      <td style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem", color: "#64748b" }}>{new Date(enr.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approved history */}
        <div className="lum-card">
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: "1.25rem" }}>Recently Approved</h2>
          {approvedEnrollments.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>No approvals yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #f1f5f9" }}>
                    {["Student", "Course", "Amount", "Teacher", "Approved By", "Date"].map((h) => (
                      <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approvedEnrollments.map((enr) => (
                    <tr key={enr.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "0.625rem 0.75rem" }}>
                        <p style={{ fontWeight: 600 }}>{enr.student.user.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{enr.student.user.email}</p>
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem" }}>{enr.course.name}</td>
                      <td style={{ padding: "0.625rem 0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                        {enr.payments[0] ? `${enr.payments[0].currency} ${Number(enr.payments[0].amount).toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem" }}>{enr.assignedTeacher?.name ?? "—"}</td>
                      <td style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem" }}>{enr.approvedBy?.name ?? "—"}</td>
                      <td style={{ padding: "0.625rem 0.75rem", fontSize: "0.75rem", color: "#64748b" }}>
                        {enr.approvedAt ? new Date(enr.approvedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
