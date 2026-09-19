"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/client/auth-client";

interface SignOutButtonProps {
  redirectTo?: string;
}

export default function SignOutButton({ redirectTo = "/staff/login" }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-white/20 hover:bg-white/20 hover:text-white disabled:opacity-60"
    >
      Sign Out
    </button>
  );
}
