"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/client/auth-client";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";
import { AuthShell } from "@/components/ui/shells";
import { Alert } from "@/components/ui/primitives";

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
      router.replace("/student/dashboard");
      router.refresh();
      return;
    }

    router.push(getDashboardRouteForRole(role));
    router.refresh();
  }

  return (
    <AuthShell
      staff
      title="Staff portal"
      description="Sign in to access your BDM, Accounts, or Teacher workspace."
    >
          {error && (
            <div className="mb-5">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "#475569" }}>
          Student?{" "}
          <Link href="/student/login" style={{ color: "var(--lum-primary)", fontWeight: 700, textDecoration: "none" }}>
            Go to Student Portal
          </Link>
        </p>
    </AuthShell>
  );
}
