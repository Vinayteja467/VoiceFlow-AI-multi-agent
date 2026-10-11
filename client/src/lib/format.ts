/** Compact human duration from milliseconds (e.g. 420ms, 3.2s, 1m 12s). */
export function formatMs(ms?: number): string {
  if (ms == null || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

/** Wall-clock time for an ISO timestamp (locale-aware). */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** "just now" / "3m ago" / "2h ago" / date. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  if (diff < 45_000) return 'just now';
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return new Date(then).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Similarity score, fixed to 3 decimals (matches the server's raw score). */
export function formatScore(n: number): string {
  return n.toFixed(3);
}

/** 0..1 → integer percent. */
export function pct(n: number): number {
  return Math.round(Math.max(0, Math.min(1, n)) * 100);
}

export function titleCase(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Shorten text with an ellipsis, without cutting mid-word when avoidable. */
export function truncate(s: string, max = 120): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}
