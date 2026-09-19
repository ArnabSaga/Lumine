import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "neutral" | "warning" | "info" | "success" | "error";

export function PageHeader({
  eyebrow,
  title,
  description,
  light = false,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  light?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="lum-eyebrow mb-3">{eyebrow}</p>}
        <h1 className={`lum-page-title ${light ? "lum-page-title-light" : ""}`}>{title}</h1>
        {description && (
          <p className={`mt-4 max-w-2xl text-sm leading-6 sm:text-base ${light ? "lum-muted-light" : "lum-muted"}`}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  dark = false,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--lum-radius-card)] p-5 sm:p-6 ${
        dark ? "lum-glass-dark text-slate-100" : "lum-glass-light text-slate-950"
      } ${hover ? "lum-card-hover" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={className}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-black text-slate-950">{title}</h2>
          {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </GlassCard>
  );
}

export function StatCard({
  label,
  value,
  helper,
  tone = "neutral",
  metricId,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: Tone;
  // Stable test anchor on the numeric value element (non-behavioral).
  metricId?: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
      : tone === "warning"
      ? "text-amber-700 bg-amber-500/10 border-amber-500/20"
      : tone === "info"
      ? "text-blue-700 bg-blue-500/10 border-blue-500/20"
      : tone === "error"
      ? "text-red-700 bg-red-500/10 border-red-500/20"
      : "text-slate-700 bg-slate-500/10 border-slate-500/20";

  return (
    <GlassCard className="flex min-h-0 items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-2 font-mono text-3xl font-black leading-none text-slate-950" data-metric={metricId}>{value}</p>
        {helper && <p className="mt-2 text-sm text-slate-500">{helper}</p>}
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}>
        <span className="h-2.5 w-2.5 rounded-full bg-current" />
      </div>
    </GlassCard>
  );
}

export function CalloutCard({
  title,
  description,
  href,
  actionLabel,
}: {
  title: ReactNode;
  description: ReactNode;
  href: string;
  actionLabel: string;
}) {
  return (
    <GlassCard dark className="overflow-hidden">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="lum-eyebrow mb-2 text-[var(--lum-primary)]">Primary action</p>
          <h2 className="font-display text-2xl font-black text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <Link href={href} className="lum-btn-primary shrink-0">
          {actionLabel}
        </Link>
      </div>
    </GlassCard>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const cls =
    normalized === "APPROVED"
      ? "lum-badge-approved"
      : normalized === "PAYMENT_VERIFIED" || normalized === "SUCCEEDED"
      ? "lum-badge-verified"
      : normalized === "FAILED"
      ? "lum-badge-failed"
      : "lum-badge-pending";

  const label = normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return <span className={`lum-badge ${cls}`}>{label}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-[var(--lum-primary)]">
        <span className="h-2.5 w-2.5 rounded-full bg-current" />
      </div>
      <h3 className="font-display text-base font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  const cls =
    tone === "success"
      ? "lum-alert-success"
      : tone === "warning"
      ? "lum-alert-warning"
      : tone === "error"
      ? "lum-alert-error"
      : tone === "info"
      ? "lum-alert-info"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return <div className={`lum-alert ${cls}`}>{children}</div>;
}
