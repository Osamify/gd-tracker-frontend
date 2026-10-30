// lib/tracker.ts

// lib/tracker.ts: replace the Run and Level types with these (everything else stays the same).
// New fields are optional so nothing breaks if the backend does not send them yet.

export type Run = {
  startPercent: number
  endPercent: number
  id?: number
  totalAttempts?: number // attempt count when this run happened
  timestamp?: string // ISO date
  runTime?: number // seconds, 0 until the backend fills it in
}

export type Level = {
  id: number
  name: string
  creator: string
  image: string
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane' | 'Extreme'
  attempts: number
  totalAttempts: number
  progress: number
  rating: string
  totalSeconds: number | null
  lastPlayedAt: string | null
  dateCompleted: string | null
  runs: Run[]
  // from the Levels table, used by upcoming features
  enjoyment?: number | null
  ratingCount?: number | null
  gddpTier?: number | null
  nlwTier?: string | null
  aredlRank?: number | null
  currentAredlRank?: number | null
  showcaseVideoId?: string | null
  isRated?: boolean | string | null
  isTracked?: boolean
  originalLevelId?: number | null
}

export type ActivityEntry =
  | { id: string; type: 'run'; levelId: string; startPercent: number; endPercent: number; at: string }
  | { id: string; type: 'death'; levelId: string; percent: number; at: string }

export type RunPlan =
  | { complete: true; count: number; chain: Run[] }
  | { complete: false; count: number; chain: Run[]; gapAt: number }

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