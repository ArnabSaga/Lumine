"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/client/auth-client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/staff/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", background: "transparent", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", cursor: "pointer", fontWeight: 600 }}
    >
      Sign Out
    </button>
  );
}
