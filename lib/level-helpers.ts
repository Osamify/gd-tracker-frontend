import type { Run, RunPlan } from '@/lib/types';

// The run's timestamp as milliseconds (NaN if the run has no timestamp)
export const runTime = (r: Run) => (r.timestamp ? new Date(r.timestamp).getTime() : NaN)

// runKey(r)  = a unique text id for a run (database id, or start-end-attempts as a fallback).
// Used to find which run is the brand new one so we can flash it.
export const runKey = (r: Run) => (r.id != null ? `id-${r.id}` : `${r.startPercent}-${r.endPercent}-${r.totalAttempts ?? ''}`)

// The shared 'glass card' look.  Every section uses ${panel}.  `gd-rise` = fade-up animation (see LIVE_CSS).
export const panel = 'rounded-2xl border border-white/10 bg-[#0a1015]/80'

// 90 seconds -> "1m 30s",  60 -> "1m",  45 -> "45s".  Used for level length and run times.
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return `${r}s`
  return r === 0 ? `${m}m` : `${m}m ${r}s`
}

// "2026-10-23T01:33:30Z" -> "Oct 23, 2026".  No date -> an em dash "—".
export function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "just now", "5 minutes ago", "yesterday". Needs `now` so it ticks live and never differs between server and browser. */
export function relativeTime(iso: string | null | undefined, now: number | null) {
  if (!iso || now == null) return ''
  const diff = (new Date(iso).getTime() - now) / 1000
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

// The backend sometimes sends numbers as strings ("7.85") or empty.  This converts safely:
// empty / not a number -> null, otherwise a real number.
export const toNum = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Tier = the rating of the level, used to pick the face image and the colours.
// FaceDifficulty = the file-name part of /public/gdfaces/<difficulty>-<tier>.png (lowercase).
export type Tier = 'rated' | 'featured' | 'epic' | 'legendary' | 'mythic'
export type FaceDifficulty = 'easy' | 'medium' | 'hard' | 'insane' | 'extreme'

// The only difficulty names we have face images for.
const DIFFICULTIES: FaceDifficulty[] = ['easy', 'medium', 'hard', 'insane', 'extreme']


// Turns text like "Extreme Demon" into "extreme" so it matches the image file name.
//   1) take the first word  2) lowercase it  3) if it is not in DIFFICULTIES use 'hard'.
// (The commented-out version above is the older one, you can delete it.)
export function faceDifficulty(raw: string | undefined | null): FaceDifficulty {
  if (!raw) return 'hard' // 👈 If it's undefined/null, default to medium
  const first = raw.trim().toLowerCase().split(/\s+/)[0] as FaceDifficulty
  return DIFFICULTIES.includes(first) ? first : 'hard'
}

// For each tier: a label, Tailwind classes for the little chip (border/background/text colour)
// and a glow (drop-shadow) for the face image.  Edit colours here and every place updates.
export const TIER_STYLE: Record<Tier, { label: string; chip: string; glow: string }> = {
  rated: { label: 'Rated', chip: 'border-slate-600/60 bg-slate-700/40 text-slate-300', glow: 'drop-shadow-[0_0_14px_rgba(148,163,184,0.4)]' },
  featured: { label: 'Featured', chip: 'border-yellow-400/40 bg-yellow-400/10 text-yerllow-300', glow: 'drop-shadow-[0_0_16px_rgba(250,204,21,0.6)]' },
  epic: { label: 'Epic', chip: 'border-orange-400/40 bg-orange-400/10 text-orange-300', glow: 'drop-shadow-[0_0_16px_rgba(251,146,60,0.65)]' },
  legendary: { label: 'Legendary', chip: 'border-pink-400/40 bg-pink-400/10 text-pink-300', glow: 'drop-shadow-[0_0_16px_rgba(244,114,182,0.65)]' },
  mythic: { label: 'Mythic', chip: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300', glow: 'drop-shadow-[0_0_16px_rgba(34,211,238,0.7)]' },
}


/**
 * Greedy interval cover: from the current reach, always pick the run that
 * starts at or before it and extends furthest. Yields the minimum number of
 * practice runs whose overlap stitches 0% to 100%.
 */
export function minimumRunsToComplete(runs: Run[]): RunPlan {
  // 👇 Updated to startPercent
  const sorted = [...runs].sort((a, b) => a.startPercent - b.startPercent)
  const chain: Run[] = []
  let reach = 0
  let i = 0

  while (reach < 100) {
    let best: Run | null = null
    // 👇 Updated to startPercent / endPercent
    while (i < sorted.length && sorted[i].startPercent <= reach) {
      if (!best || sorted[i].endPercent > best.endPercent) best = sorted[i]
      i++
    }
    if (!best || best.endPercent <= reach) {
      return { complete: false, count: chain.length, chain, gapAt: reach }
    }
    chain.push(best)
    reach = best.endPercent
  }

  return { complete: true, count: chain.length, chain }
}

// 👇 FIXED THE BUG HERE
export function bestRun(runs: Run[]): number {
  return runs.length > 0 ? Math.max(...runs.map((r) => r.endPercent)) : 0
}