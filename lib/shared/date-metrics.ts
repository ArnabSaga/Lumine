const BANGLADESH_UTC_OFFSET_MS = 6 * 60 * 60 * 1000;

function getBangladeshDateParts(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() + BANGLADESH_UTC_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function fromBangladeshLocalDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - BANGLADESH_UTC_OFFSET_MS);
}

export function getBangladeshTodayRange(now: Date = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getBangladeshDateParts(now);
  const start = fromBangladeshLocalDate(year, month, day);
  const end = fromBangladeshLocalDate(year, month, day + 1);
  return { start, end };
}

export function getBangladeshWeekRange(now: Date = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getBangladeshDateParts(now);
  const localNoon = new Date(Date.UTC(year, month, day, 12));
  const dayOfWeek = localNoon.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = fromBangladeshLocalDate(year, month, day - daysSinceMonday);
  const end = fromBangladeshLocalDate(year, month, day - daysSinceMonday + 7);
  return { start, end };
}
