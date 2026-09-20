"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/client/auth-client";
import { Alert } from "@/components/ui/primitives";

export function RegistrationQrForm({ token, bdmName }: { token: string; bdmName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [education, setEducation] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ reference: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const preflight = await fetch("/api/admissions/register/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });
      if (!preflight.ok) {
        const data = (await preflight.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "This registration QR cannot be used.");
        setLoading(false);
        return;
      }

      const signUp = await authClient.signUp.email({ name, email, password });
      if (signUp.error) {
        setError(signUp.error.message ?? "Account creation failed.");
        setLoading(false);
        return;
      }

      const finish = await fetch("/api/admissions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          phone,
          address,
          education,
          additionalInfo,
        }),
      });

      const finishData = (await finish.json().catch(() => null)) as { error?: string; reference?: string } | null;
      if (!finish.ok || !finishData?.reference) {
        setError(finishData?.error ?? "Account was created, but admission registration did not finish. Sign in and retry this QR.");
        setLoading(false);
        return;
      }

      setSuccess({ reference: finishData.reference });
      router.refresh();
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="lum-eyebrow justify-center text-emerald-700">Registration submitted</p>
        <h1 className="mt-3 font-display text-3xl font-black text-slate-950">Your admission is now with Luminedge.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          Reference <span className="font-mono font-black">{success.reference}</span> is linked to {bdmName}. The BDM will enter
          admission details before Accounts review.
        </p>
        <Link href="/student/dashboard" className="lum-btn-primary mt-6 inline-flex">
          Go to Student Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="lum-label">Full Name</span>
            <input className="lum-input" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className="lum-label">Email</span>
            <input className="lum-input" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        <label>
          <span className="lum-label">Password</span>
          <input className="lum-input" required type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="lum-label">Phone</span>
            <input className="lum-input" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            <span className="lum-label">Education</span>
            <input className="lum-input" required value={education} onChange={(e) => setEducation(e.target.value)} />
          </label>
        </div>
        <label>
          <span className="lum-label">Address</span>
          <textarea className="lum-input min-h-24" required value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          <span className="lum-label">Additional Information</span>
          <textarea className="lum-input min-h-24" value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} />
        </label>
        <button className="lum-btn-primary mt-2 w-full justify-center" type="submit" disabled={loading}>
          {loading ? "Submitting Registration..." : "Submit Registration"}
        </button>
      </form>
    </div>
  );
}
