"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/client/auth-client";
import { AuthShell } from "@/components/ui/shells";
import { Alert } from "@/components/ui/primitives";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseHint = searchParams.get("course");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authClient.signUp.email({ name, email, password });
      if (res.error) {
        setError(res.error.message ?? "Registration failed.");
        setLoading(false);
        return;
      }

      const dest = courseHint
        ? `/student/complete-profile?course=${encodeURIComponent(courseHint)}`
        : "/student/complete-profile";
      router.push(dest);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description={courseHint ? "Join Luminedge to enroll in your selected course." : "Start your learning journey with a secure student account."}
    >
          {error && (
            <div className="mb-5">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="lum-label">Full Name</label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="lum-input"
              />
            </div>
            <div>
              <label htmlFor="email" className="lum-label">Email Address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="lum-input"
              />
            </div>
            <div>
              <label htmlFor="password" className="lum-label">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="lum-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="lum-btn-primary"
              style={{ width: "100%", marginTop: "0.5rem", padding: "0.75rem" }}
            >
              {loading ? "Creating Account..." : "Create Account →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem", color: "#64748b" }}>
            Already have an account?{" "}
            <Link href={courseHint ? `/student/login?course=${encodeURIComponent(courseHint)}` : "/student/login"} style={{ color: "var(--lum-primary)", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
    </AuthShell>
  );
}
