// LevelInfo.tsx
"use client"

// =====================================================================================
//  LEVEL DETAIL PAGE - MAIN COMPONENT
// =====================================================================================
//  This is the "Brain" of the page. It receives the raw `level` data from the server,
//  calculates all the derived stats (using useMemo), and passes the finished data 
//  down to smaller "dumb" UI components.
// =====================================================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { minimumRunsToComplete, type Level, type Run, DeathStat } from '@/lib/tracker'

// Sub-components
import PlanData from '@/components/level/plan-data'
import LevelHero from '@/components/level/level-hero'
import LevelBackground from '@/components/level/level-background'
import LevelInfoSection from '@/components/level/level-metadata'
import DangerZone from '@/components/level/danger-zone'
import DeathDistribution from '@/components/level/death-distribution'
import NewRunToast from '@/components/level/new-run-toast'
import StatsRow from '@/components/level/stats-row'
import ProgressCard from '@/components/level/progress-card'
import ProgressOverTime from '@/components/level/progress-over-time'
import AllRunsColumn from '@/components/level/all-runs-column'
import BestRunsColumn from '@/components/level/best-runs-column'

// Shared helpers
import {
  runTime,
  runKey,
  formatDuration,
  toNum,
  Tier,
  faceDifficulty,
  TIER_STYLE,
} from '../../../lib/level-helpers'

/* -------------------------------------------------------------------------- */
/*  Types & Local Helpers                                                     */
/* -------------------------------------------------------------------------- */

export type LevelDetail = Level & {
  deaths?: number[]
  demonDifficulty?: string | null
}

type RunGroup = Run & { count: number; keys: string[] }

function groupRuns(runs: Run[]): RunGroup[] {
  const map = new Map<string, RunGroup>()
  for (const r of runs) {
    const k = `${r.startPercent}-${r.endPercent}`
    const g = map.get(k)
    if (g) {
      g.count++
      g.keys.push(runKey(r))
      if ((r.totalAttempts ?? 0) > (g.totalAttempts ?? 0)) {
        g.totalAttempts = r.totalAttempts
        g.timestamp = r.timestamp
      }
    } else {
      map.set(k, { ...r, count: 1, keys: [runKey(r)] })
    }
  }
  return [...map.values()]
}

function groupDeaths(deaths: number[]) {
  const map = new Map<number, number>()
  for (const d of deaths) map.set(d, (map.get(d) ?? 0) + 1)
  return [...map.entries()].map(([percent, count]) => ({ percent, count }))
}

// Deaths grouped by percent, with the time of the LAST death at that percent (from the backend's DeathStat rows).
type DeathGroup = { percent: number; count: number; lastDiedAt: string | null }

function groupDeathStats(stats: DeathStat[]): DeathGroup[] {
  const map = new Map<number, DeathGroup>()
  for (const s of stats) {
    const g = map.get(s.percentage)
    if (g) {
      g.count += s.deathCount
      if (s.lastDiedAt && (!g.lastDiedAt || s.lastDiedAt > g.lastDiedAt)) g.lastDiedAt = s.lastDiedAt
    } else {
      map.set(s.percentage, { percent: s.percentage, count: s.deathCount, lastDiedAt: s.lastDiedAt ?? null })
    }
  }
  return [...map.values()]
}

function coverage(runs: Run[]) {
  const sorted = [...runs].sort((a, b) => a.startPercent - b.startPercent)
  const merged: Run[] = []
  for (const r of sorted) {
    const last = merged[merged.length - 1]
    if (last && r.startPercent <= last.endPercent) last.endPercent = Math.max(last.endPercent, r.endPercent)
    else merged.push({ startPercent: r.startPercent, endPercent: r.endPercent })
  }
  const covered = merged.reduce((sum, m) => sum + (m.endPercent - m.startPercent), 0)
  const gaps: Run[] = []
  let cursor = 0
  for (const m of merged) {
    if (m.startPercent > cursor) gaps.push({ startPercent: cursor, endPercent: m.startPercent })
    cursor = Math.max(cursor, m.endPercent)
  }
  if (cursor < 100) gaps.push({ startPercent: cursor, endPercent: 100 })
  return { covered, gaps }
}

const LIVE_CSS = `
@keyframes gd-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
@keyframes gd-grow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes gd-grow-y { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes gd-reveal { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
@keyframes gd-countdown { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes gd-fade { from { opacity: 0 } to { opacity: var(--o, 1) } }
@keyframes gd-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes gd-shimmer { from { background-position: 0% 50% } to { background-position: 100% 50% } }
@keyframes gd-flash { 0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, .65); background-color: rgba(34, 211, 238, .18) } 100% { box-shadow: 0 0 0 16px rgba(34, 211, 238, 0) } }
.gd-rise { animation: gd-rise .6s cubic-bezier(.2, .8, .2, 1) both }
.gd-grow { transform-origin: left; animation: gd-grow .9s cubic-bezier(.2, .8, .2, 1) both }
.gd-grow-y { transform-origin: bottom; animation: gd-grow-y .8s cubic-bezier(.2, .8, .2, 1) both }
.gd-reveal { animation: gd-reveal 1.4s cubic-bezier(.4, 0, .2, 1) both }
.gd-fade { animation: gd-fade .5s ease-out both }
.gd-float { animation: gd-float 6s ease-in-out infinite }
.gd-shimmer { background-size: 200% 100%; animation: gd-shimmer 5s ease-in-out infinite alternate }
.gd-flash { animation: gd-rise .6s cubic-bezier(.2, .8, .2, 1) both, gd-flash 1.6s ease-out 2 }
@media (prefers-reduced-motion: reduce) {
  .gd-rise, .gd-grow, .gd-grow-y, .gd-reveal, .gd-fade, .gd-float, .gd-shimmer, .gd-flash { animation: none !important }
}
`

export default function LevelInfo({ level, deathStats }: { level: LevelDetail, deathStats: DeathStat[] }) {
  /* -------------------------------------------------------------------------- */
  /*  0. Dynamic Scrollbar Colors (New)                                         */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /*  1. Core Level Data                                                        */
  /* -------------------------------------------------------------------------- */

  const best = level.progress;
  const plan = minimumRunsToComplete(level.runs)

  const rawDifficulty = String(level.demonDifficulty ?? '');
  const difficultyLabel = rawDifficulty ? (/demon$/i.test(rawDifficulty) ? rawDifficulty : `${rawDifficulty} Demon`) : 'Demon'
  const faceDiff = faceDifficulty(rawDifficulty)

  const ratingLower = String(level.rating ?? '').toLowerCase();
  const tier: Tier = ['featured', 'epic', 'legendary', 'mythic'].includes(ratingLower)
    ? (ratingLower as Tier)
    : 'rated';

  const tierStyle = TIER_STYLE[tier]
  const beaten = best >= 100 || Boolean(level.dateCompleted)
  const thumb = level.image

  const hasLength = Boolean(level.totalSeconds && level.totalSeconds > 0)
  const totalSecs = hasLength ? (level.totalSeconds as number) : 0
  const t = (secs: number) => (hasLength ? formatDuration(secs) : '—')

  /* -------------------------------------------------------------------------- */
  /*  2. Derived Data (UseMemo)                                                 */
  /* -------------------------------------------------------------------------- */

const deaths = useMemo(() => {
  // 1. Check if we have the new DeathStats
  if (deathStats && deathStats.length > 0) {
    const expanded: number[] = [];
    deathStats.forEach(stat => {
      for (let i = 0; i < stat.deathCount; i++) {
        expanded.push(stat.percentage);
      }
    });
    return expanded;
  }
  
  // 2. Fallback to old logic
  return level.deaths?.length ? level.deaths : level.runs.filter((r) => r.startPercent === 0 && r.endPercent < 100).map((r) => r.endPercent);
}, [deathStats, level.deaths, level.runs]);
  // with backend DeathStats we keep the time of the last death for each percent; the old fallback has no times
  const grouped: DeathGroup[] = useMemo(
    () => (deathStats?.length ? groupDeathStats(deathStats) : groupDeaths(deaths).map((g) => ({ ...g, lastDiedAt: null }))),
    [deathStats, deaths],
  )

  const bestRuns = useMemo(
    () => groupRuns(level.runs.filter((r) => r.startPercent > 0))
      .sort((a, b) => b.endPercent - a.endPercent || (b.endPercent - b.startPercent) - (a.endPercent - a.startPercent)).slice(0, 10),
    [level.runs],
  )

  const dangerZones = useMemo(
    () => [...grouped].sort((a, b) => b.count - a.count).slice(0, 3),
    [grouped],
  )

  const buckets = useMemo(() => {
    const b = Array<number>(10).fill(0)
    for (const d of deaths) b[Math.min(9, Math.floor(d / 10))]++
    return b
  }, [deaths])
  const bucketMax = Math.max(1, ...buckets)

  const chain: Run[] = plan.chain ?? []
  const allRuns = useMemo(
    () => groupRuns(level.runs.filter((r) => r.startPercent > 0))
      .sort((a, b) => a.startPercent - b.startPercent || b.endPercent - a.endPercent),
    [level.runs],
  )
  const practiceRunCount = useMemo(() => level.runs.filter((r) => r.startPercent > 0).length, [level.runs])

  const { covered, gaps } = useMemo(() => coverage(level.runs), [level.runs])
  const longestRun = level.runs.reduce((m, r) => Math.max(m, r.endPercent - r.startPercent), 0)
  const avgRun = level.runs.length
    ? level.runs.reduce((s, r) => s + (r.endPercent - r.startPercent), 0) / level.runs.length
    : 0

  const chainTotal = chain.reduce((s, r) => s + (r.endPercent - r.startPercent), 0)
  const overlap = Math.max(0, chainTotal - 100)
  const inPlan = (r: Run) => chain.some((c) => c.startPercent === r.startPercent && c.endPercent === r.endPercent)

  /* -------------------------------------------------------------------------- */
  /*  3. Extra Level Data                                                       */
  /* -------------------------------------------------------------------------- */

  const enjoyment = level.enjoyment;
  const ratingCount = level.ratingCount;
  const showcaseId = level.showcaseVideoId;
  const gddp = level.gddpTier;
  const aredl = level.currentAredlRank;
  const nlwRaw = level.nlwTier;
  const nlw = nlwRaw != null ? String(nlwRaw) : null

  const lastRef = beaten ? level.dateCompleted ?? level.lastPlayedAt : level.lastPlayedAt
  const totalAttemptsNow = toNum(level.totalAttempts) ?? level.attempts

  /* -------------------------------------------------------------------------- */
  /*  4. Chronological Runs & Milestones                                        */
  /* -------------------------------------------------------------------------- */

  const chrono = useMemo(
    () =>
      [...level.runs].sort((a, b) => {
        const ta = runTime(a)
        const tb = runTime(b)
        if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb
        return (a.totalAttempts ?? 0) - (b.totalAttempts ?? 0)
      }),
    [level.runs],
  )

  const bestRow = chrono.find((r) => r.endPercent >= best)
  const sinceBest = bestRow?.totalAttempts != null ? Math.max(0, totalAttemptsNow - bestRow.totalAttempts) : null
  const attemptsPerPercent = best > 0 ? totalAttemptsNow / best : null

  /* -------------------------------------------------------------------------- */
  /*  5. Practice Density (Heatmap)                                             */
  /* -------------------------------------------------------------------------- */

  const density = useMemo(() => {
    const d = Array<number>(100).fill(0)
    for (const r of level.runs) {
      for (let i = Math.max(0, Math.floor(r.startPercent)); i < Math.min(100, Math.ceil(r.endPercent)); i++) d[i]++
    }
    return d
  }, [level.runs])

  const densityMax = Math.max(1, ...density)

  const weakest = useMemo(() => {
    const min = Math.min(...density)
    if (min >= Math.max(...density)) return null
    let found: { start: number; end: number } | null = null
    let i = 0
    while (i < 100) {
      if (density[i] === min) {
        let j = i
        while (j < 100 && density[j] === min) j++
        if (!found || j - i > found.end - found.start) found = { start: i, end: j }
        i = j
      } else i++
    }
    return found ? { ...found, count: min } : null
  }, [density])

  /* -------------------------------------------------------------------------- */
  /*  6. Live Refresh & New Run Detection                                       */
  /* -------------------------------------------------------------------------- */

  const [now, setNow] = useState<number | null>(null)

  const [toast, setToast] = useState<{ id: number; tone: 'run' | 'best'; title: string; body: string } | null>(null)
  const [freshKey, setFreshKey] = useState<string | null>(null)

  const prevRuns = useRef(level.runs.length)
  const prevBest = useRef(best)

  useEffect(() => {
    if (level.runs.length > prevRuns.current) {
      const r = chrono[chrono.length - 1]
      const isBest = best > prevBest.current
      setToast({
        id: Date.now(),
        tone: isBest ? 'best' : 'run',
        title: isBest ? 'New best run!' : 'New run recorded',
        body: `${r.startPercent}% → ${r.endPercent}%${isBest ? ` · best is now ${best}%` : ''}`,
      })
      setFreshKey(runKey(r))
    }
    prevRuns.current = level.runs.length
    prevBest.current = best
  }, [level.runs, chrono, best])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 7000)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!freshKey) return
    const id = setTimeout(() => setFreshKey(null), 6000)
    return () => clearTimeout(id)
  }, [freshKey])

  /* -------------------------------------------------------------------------- */
  /*  7. Render Layout                                                          */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="relative isolate min-h-screen bg-[#070b0e] text-slate-200">
      <style>{LIVE_CSS}</style>

      <LevelBackground thumb={thumb} />

      <div className="relative z-10 mx-auto flex w-full max-w-[1800px] flex-col gap-5 p-4 md:p-6 xl:px-10">

        <LevelHero
          name={level.name}
          creator={level.creator}
          progress={level.progress}
          best={best}
          difficultyLabel={difficultyLabel}
          faceDiff={faceDiff}
          tier={tier}
          glowClass={tierStyle.glow}
          gddp={gddp}
          nlw={nlw}
          enjoyment={enjoyment}
          ratingCount={ratingCount}
          aredl={aredl}
          beaten={beaten}
        />

        <StatsRow
          totalSecs={totalSecs}
          attempts={level.attempts}
          deaths={deaths}
          isDeathsLogged={Boolean(level.deaths?.length)}
          beaten={beaten}
          lastRef={lastRef}
          now={now}
          practiceRuns={level.runs.length}
          plan={plan}
        />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">

          <div className="flex flex-col gap-5">
            <ProgressCard
              best={best}
              animBest={best}
              plan={plan}
              t={t}
              totalSecs={totalSecs}
              density={density}
              densityMax={densityMax}
              weakest={weakest}
              levelName={level.name}
            />

            <ProgressOverTime runs={chrono} />

            <div className="grid items-start gap-5 xl:grid-cols-2">
              <BestRunsColumn
                bestRuns={bestRuns}
                plan={plan}
                chain={chain}
                totalSecs={totalSecs}
                t={t}
                freshKey={freshKey}
              />

              <AllRunsColumn
                deathsCount={deaths.length}
                isDeathsLogged={Boolean(level.deaths?.length || deathStats?.length)}
                groupedDeaths={grouped}
                practiceRunCount={practiceRunCount}
                allRuns={allRuns}
                totalSecs={totalSecs}
                inPlan={inPlan}
                freshKey={freshKey}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <LevelInfoSection
              enjoyment={enjoyment}
              ratingCount={ratingCount}
              gddp={gddp}
              nlw={nlw}
              aredl={aredl}
              levelName={level.name}
              showcaseId={showcaseId}
              difficulty={level.demonDifficulty}
            />

            <PlanData
              plan={plan}
              covered={covered}
              longestRun={longestRun}
              avgRun={avgRun}
              overlap={overlap}
              gaps={gaps}
              sinceBest={sinceBest}
              attemptsPerPercent={attemptsPerPercent}
            />

            <DangerZone
              dangerZones={dangerZones}
              totalSecs={totalSecs}
              t={t}
            />

            <DeathDistribution
              buckets={buckets}
              bucketMax={bucketMax}
              deathsCount={deaths.length}
            />
          </aside>

        </div>
      </div>

      {toast && <NewRunToast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}