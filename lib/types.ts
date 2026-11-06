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

export type DeathStat = {
  id: number
  levelId: number
  percentage: number
  deathCount: number
  lastDiedAt: string
}

export type CombinedAttempts = {
  combinedAttempts: number
}


export type ActivityEntry =
  | { id: string; type: 'run'; levelId: string; startPercent: number; endPercent: number; at: string }
  | { id: string; type: 'death'; levelId: string; percent: number; at: string }

export type RunPlan = {
  complete: boolean
  count: number
  chain: Run[]
  gaps: Run[]
  gapAt?: number // where the first gap starts (only when complete is false)
}
