import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import SignOutButton from "@/components/SignOutButton";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";

type NavItem = {
  href: string;
  label: string;
};

const publicNav: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/student/login", label: "Student Login" },
  { href: "/register", label: "Register" },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 no-underline">
      <Image src="/logo/logo.png" alt="Luminedge" width={38} height={38} className="rounded-xl object-contain" />
      <span className={`font-display text-xl font-black ${light ? "text-white" : "text-slate-950"}`}>Luminedge</span>
    </Link>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="lum-app-bg font-sans text-slate-950">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo light />
          <nav className="flex items-center gap-2 sm:gap-3">
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hidden rounded-full px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/staff/login" className="lum-btn-primary px-4 py-2 text-xs sm:text-sm">
              Staff
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/10 bg-slate-950/70 px-4 py-8 text-slate-300 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-black text-white">Luminedge</p>
            <p className="mt-1 text-sm text-slate-400">Course enrollment, verification, and learning access in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/courses" className="text-slate-300 hover:text-[var(--lum-primary)]">Courses</Link>
            <Link href="/student/login" className="text-slate-300 hover:text-[var(--lum-primary)]">Student Portal</Link>
            <Link href="/register" className="text-slate-300 hover:text-[var(--lum-primary)]">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function AuthShell({
  title,
  description,
  children,
  staff = false,
}: {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  staff?: boolean;
}) {
  return (
    <div className="lum-app-bg flex min-h-screen items-center justify-center px-4 py-10 font-sans sm:px-6">
      <div className="w-full max-w-lg">
        <div className="mb-7 text-center">
          <div className="mb-5 flex justify-center">
            <Logo light />
          </div>
          <p className="lum-eyebrow justify-center text-[var(--lum-primary)]">{staff ? "Staff Portal" : "Student Portal"}</p>
          <h1 className="mt-3 font-display text-4xl font-black text-white">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <div className="lum-panel rounded-[var(--lum-radius-panel)] border border-white/60 bg-white/90 p-5 shadow-[var(--lum-shadow-elevated)] sm:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}

function getRoleNav(role: string): NavItem[] {
  if (role === "STUDENT") {
    return [
      { href: "/student/dashboard", label: "Dashboard" },
      { href: "/courses", label: "Courses" },
    ];
  }
  if (role === "TEACHER") {
    return [{ href: "/teacher/dashboard", label: "Dashboard" }];
  }
  if (role === "ACCOUNTS") {
    return [
      { href: "/accounts/dashboard", label: "Dashboard" },
      { href: "/staff/enrollments", label: "Enrollments" },
      { href: "/staff/scan", label: "Scan QR" },
    ];
  }
  return [
    { href: getDashboardRouteForRole(role), label: "Dashboard" },
    { href: "/staff/enrollments", label: "Enrollments" },
    { href: "/staff/scan", label: "Scan QR" },
  ];
}

export function AppShell({
  children,
  user,
  title,
  activeHref,
  student = false,
  maxWidth = "max-w-7xl",
}: {
  children: ReactNode;
  user: { name: string; email?: string | null; role: string };
  title: string;
  activeHref: string;
  student?: boolean;
  maxWidth?: string;
}) {
  const nav = getRoleNav(user.role);

  return (
    <div className="lum-app-bg min-h-screen font-sans">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Logo light />
              <div className="hidden h-8 w-px bg-white/10 sm:block" />
              <div className="hidden min-w-0 sm:block">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--lum-primary)]">{user.role}</p>
                <p className="truncate text-sm font-semibold text-slate-300">{title}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 text-right md:block">
                <p className="truncate text-sm font-bold text-white">{user.name}</p>
                {user.email && <p className="truncate text-xs text-slate-400">{user.email}</p>}
              </div>
              <span className="hidden rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-slate-200 sm:inline-flex">
                {student ? "Student" : user.role}
              </span>
              <SignOutButton redirectTo={student ? "/student/login" : "/staff/login"} />
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-white/10 p-1">
            {nav.map((item) => {
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-[var(--lum-primary)] text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full ${maxWidth} px-4 py-7 sm:px-6 lg:px-8`}>{children}</main>
    </div>
  );
}
