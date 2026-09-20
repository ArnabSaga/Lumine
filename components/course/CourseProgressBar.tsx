type CourseProgressBarProps = {
  completed: number;
  total: number;
  percentage: number;
};

/**
 * Accessible CSS-only course progress bar (no charting library).
 * Text stays readable even when the bar is empty or full.
 */
export default function CourseProgressBar({ completed, total, percentage }: CourseProgressBarProps) {
  const safePercentage = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={safePercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Course progress ${safePercentage} percent`}
        className="h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-[var(--lum-primary)] transition-[width]"
          style={{ width: `${safePercentage}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-xs font-bold text-slate-600">
        {completed} of {total} modules complete · {safePercentage}%
      </p>
    </div>
  );
}
