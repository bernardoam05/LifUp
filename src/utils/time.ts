// src/utils/time.ts

export function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;}
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function mdToDayIndex(mmdd: string): number {
  const [m, d] = mmdd.split('-').map(n => parseInt(n, 10));
  // Use a non-leap year for stable indexing
  const base = new Date(2001, m - 1, d);
  const start = new Date(2001, 0, 1);
  return Math.floor((base.getTime() - start.getTime()) / 86_400_000);
}

export function isDateInWindow(now: Date, start: string, end: string): boolean {
  const nowIdx = mdToDayIndex(`${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  const startIdx = mdToDayIndex(start);
  const endIdx = mdToDayIndex(end);
  if (endIdx >= startIdx) {return nowIdx >= startIdx && nowIdx <= endIdx;}
  // Window spans year end
  return nowIdx >= startIdx || nowIdx <= endIdx;
}
