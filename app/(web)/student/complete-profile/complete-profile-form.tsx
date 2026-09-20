"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/ui/shells";
import { Alert } from "@/components/ui/primitives";

export default function CompleteProfileForm({ courseHint }: { courseHint: string | null }) {
  const router = useRouter();

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
    <AuthShell
      title="Complete your profile"
      description="Add the details required to create your session-owned student profile."
    >
          {error && (
            <div className="mb-5">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
    </AuthShell>
  );
}
