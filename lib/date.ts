// lib/date.ts
export function monthRange(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end   = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
  return { start, end };
}

export function isInThisMonth(d: Date) {
  const { start, end } = monthRange(new Date());
  return d >= start && d < end;
}