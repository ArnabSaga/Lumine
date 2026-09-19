"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { authClient } from "@/lib/client/auth-client";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";

function StudentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseHint = searchParams.get("course");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Invalid email or password.");
        setLoading(false);
        return;
      }

      const session = await authClient.getSession();
      const role = (session?.data?.user as { role?: string })?.role;

      if (role === "STUDENT") {
        // Check if profile exists
        const profileRes = await fetch("/api/student/profile");
        const profileData = profileRes.ok ? await profileRes.json() : null;

        if (!profileData?.profile) {
          const dest = courseHint ? `/student/complete-profile?course=${courseHint}` : "/student/complete-profile";
          router.push(dest);
        } else if (courseHint) {
          router.push(`/student/dashboard?course=${courseHint}`);
        } else {
          router.push("/student/dashboard");
        }
      } else {
        router.push(getDashboardRouteForRole(role));
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--lum-neutral)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", fontFamily: "var(--font-sans)" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/">
            <Image src="/logo/logo.png" alt="Luminedge" width={48} height={48} style={{ borderRadius: 12, margin: "0 auto 1rem" }} />
          </Link>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "0.375rem" }}>
            Student Sign In
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            {courseHint ? "Sign in to continue your enrollment" : "Access your Luminedge dashboard"}
          </p>
        </div>

        <div className="lum-card" style={{ padding: "2rem" }}>
          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "#dc2626", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div>
              <label htmlFor="email" className="lum-label">Email Address</label>
              <input id="email" type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="lum-input" />
            </div>
            <div>
              <label htmlFor="password" className="lum-label">Password</label>
              <input id="password" type="password" required autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="lum-input" />
            </div>
            <button type="submit" disabled={loading} className="lum-btn-primary" style={{ width: "100%", marginTop: "0.5rem", padding: "0.75rem" }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem", color: "#64748b" }}>
            New to Luminedge?{" "}
            <Link href={courseHint ? `/register?course=${courseHint}` : "/register"} style={{ color: "var(--lum-primary)", fontWeight: 700, textDecoration: "none" }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense>
      <StudentLoginForm />
    </Suspense>
  );
}
