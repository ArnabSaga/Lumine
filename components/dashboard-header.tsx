"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/client/auth-client";
import { useState } from "react";

interface DashboardHeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  title: string;
}

export function DashboardHeader({ user, title }: DashboardHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSignOut() {
    try {
      setLoggingOut(true);
      await authClient.signOut();
      router.push("/staff/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setLoggingOut(false);
    }
  }

  const roleBadgeColor =
    user.role === "BDM"
      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
      : user.role === "ACCOUNTS"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "bg-purple-500/10 text-purple-400 border-purple-500/20";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/logo.png"
              alt="Luminedge"
              width={36}
              height={36}
              className="rounded-lg object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-white">
              Luminedge
            </span>
          </Link>
          <div className="hidden h-5 w-px bg-slate-700 sm:block" />
          <h1 className="hidden text-sm font-semibold text-slate-300 sm:block">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-slate-200">{user.name}</div>
            <div className="text-xs text-slate-400">{user.email}</div>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${roleBadgeColor}`}
          >
            {user.role}
          </span>
          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:opacity-50"
          >
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </header>
  );
}
