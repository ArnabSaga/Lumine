"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/client/auth-client";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";

const DEMO_PRESETS = [
  { label: "BDM 1", email: "bdm1@example.com", role: "BDM" },
  { label: "BDM 2", email: "bdm2@example.com", role: "BDM" },
  { label: "Accounts", email: "accounts@example.com", role: "ACCOUNTS" },
  { label: "Teacher 1", email: "teacher1@example.com", role: "TEACHER" },
  { label: "Teacher 2", email: "teacher2@example.com", role: "TEACHER" },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await authClient.signIn.email({ email: email.trim(), password });
    if (res.error) {
      setError(res.error.message ?? "Invalid credentials.");
      setLoading(false);
      return;
    }

    const session = await authClient.getSession();
    const role = (session?.data?.user as { role?: string })?.role;

    if (role === "STUDENT") {
      setError("This portal is for staff only. Please use the student portal.");
      setLoading(false);
      return;
    }

    router.push(getDashboardRouteForRole(role));
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--lum-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", fontFamily: "var(--font-sans)" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/">
            <Image src="/logo/logo.png" alt="Luminedge" width={48} height={48} style={{ borderRadius: 12, margin: "0 auto 1rem" }} />
          </Link>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#f1f5f9", marginBottom: "0.375rem" }}>
            Staff Portal
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Sign in to access your BDM, Accounts, or Teacher workspace</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "1rem", padding: "2rem", boxShadow: "0 4px 32px rgba(0,0,0,0.15)" }}>
          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "#dc2626", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div>
              <label htmlFor="staff-email" className="lum-label">Email Address</label>
              <input
                id="staff-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                className="lum-input"
              />
            </div>
            <div>
              <label htmlFor="staff-password" className="lum-label">Password</label>
              <input
                id="staff-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="lum-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="lum-btn-primary"
              style={{ width: "100%", padding: "0.75rem" }}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: "0.625rem" }}>
              Quick Fill Demo Accounts
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => { setEmail(p.email); setError(null); }}
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", color: "#475569", fontWeight: 600 }}
                >
                  {p.label}
                  <span style={{ fontSize: "0.65rem", color: "#94a3b8", marginLeft: 4 }}>({p.role})</span>
                </button>
              ))}
            </div>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.5rem" }}>
              Email filled — enter password manually
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "#475569" }}>
          Student?{" "}
          <Link href="/student/login" style={{ color: "var(--lum-primary)", fontWeight: 700, textDecoration: "none" }}>
            Go to Student Portal
          </Link>
        </p>
      </div>
    </main>
  );
}
