/**
 * Shared formatting utilities used across OSCAR UI components.
 * Extracted from TopRiskTable, ResearchConsole, and PackageSearch
 * to eliminate duplication and ensure consistency.
 */

/** Format large numbers: 1.2B, 45.3M, 1.5K, or plain locale string */
export function fmtNum(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Ordinal suffix: 1st, 2nd, 3rd, 4th … */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Returns Tailwind color classes for an OpenSSF Scorecard score */
export function scorecardColor(score: number): string {
  if (score >= 7) return 'text-emerald-400 bg-emerald-500/15';
  if (score >= 4) return 'text-amber-400 bg-amber-500/15';
  return 'text-rose-400 bg-rose-500/15';
}

/** Returns Tailwind color classes for libyears debt severity */
export function libyearsColor(years: number | undefined | null): string {
  if (years == null) return 'text-slate-600';
  if (years > 5) return 'text-rose-400';
  if (years > 1) return 'text-amber-400';
  return 'text-emerald-400';
}

/** Derive a method observatory project slug from a package name */
export function toProjectSlug(packageName: string): string {
  return packageName.replace('@', '').replace('/', '__');
}
