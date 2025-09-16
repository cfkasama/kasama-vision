// lib/time.ts
// JST(UTC+9)の月初〜翌月初(排他)をUTCで返す
export function getJstMonthRange(base = new Date()) {
  const tz = 9; // hours
  // base を JST に換算（UTCに+9h）
  const j = new Date(Date.UTC(
    base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(),
    base.getUTCHours() + tz, base.getUTCMinutes(), base.getUTCSeconds()
  ));
  const jy = j.getUTCFullYear();
  const jm = j.getUTCMonth();
  // JSTの月初 00:00 は UTC では -9:00
  const start = new Date(Date.UTC(jy, jm, 1, -tz, 0, 0));
  const next  = new Date(Date.UTC(jy, jm + 1, 1, -tz, 0, 0));
  return { start, next };
}
