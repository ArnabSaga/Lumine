"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseHint = searchParams.get("course");

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [education, setEducation] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !address || !education) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/student/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, address, education, additionalInfo: additionalInfo || undefined }),
    });

    if (!res.ok && res.status !== 200) {
      const data: unknown = await res.json();
      const err = typeof data === "object" && data !== null && "error" in data ? (data as { error: string }).error : "Failed to save profile.";
      setError(err);
      setLoading(false);
      return;
    }

    const dest = courseHint ? `/student/dashboard?course=${courseHint}` : "/student/dashboard";
    router.push(dest);
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--lum-neutral)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", fontFamily: "var(--font-sans)" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "0.375rem" }}>
            Complete Your Profile
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            We need a few more details to set up your student account.
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
              <label htmlFor="phone" className="lum-label">Phone Number <span style={{ color: "#ef4444" }}>*</span></label>
              <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1XXX XXXXXX" className="lum-input" />
            </div>
            <div>
              <label htmlFor="address" className="lum-label">Home Address <span style={{ color: "#ef4444" }}>*</span></label>
              <textarea id="address" required value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, District" className="lum-input" rows={2} style={{ resize: "vertical" }} />
            </div>
            <div>
              <label htmlFor="education" className="lum-label">Education Background <span style={{ color: "#ef4444" }}>*</span></label>
              <input id="education" type="text" required value={education} onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. HSC, B.Sc. in English" className="lum-input" />
            </div>
            <div>
              <label htmlFor="additionalInfo" className="lum-label">Additional Info <span style={{ color: "#94a3b8", fontWeight: 400 }}>(Optional)</span></label>
              <textarea id="additionalInfo" value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Any other relevant information..." className="lum-input" rows={2} style={{ resize: "vertical" }} />
            </div>
            <button type="submit" disabled={loading} className="lum-btn-primary" style={{ width: "100%", marginTop: "0.5rem", padding: "0.75rem" }}>
              {loading ? "Saving Profile..." : "Complete Profile →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense>
      <CompleteProfileForm />
    </Suspense>
  );
}
