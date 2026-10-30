"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Check,
  ChevronDown,
  Clock,
  Crown,
  Crosshair,
  Flame,
  Gauge,
  Layers,
  LayoutGrid,
  List,
  Play,
  Radio,
  RotateCcw,
  Route,
  Search,
  SlidersHorizontal,
  Skull,
  Sparkles,
  Star,
  Swords,
  Trophy,
  X,
} from 'lucide-react'
import { Sidebar } from '@/components/tracker/sidebar'
// import { extractColorsFromImage } from '@/lib/server-colors' // server-only code can't be imported in a "use client" page: call it from a server component instead
/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Insane' | 'Extreme'
type Tier = 'rated' | 'featured' | 'epic' | 'legendary' | 'mythic'
type Run = { startPercent: number; endPercent: number }

type LevelItem = {
  id: number
  name: string
  creator: string
  demonDifficulty: Difficulty
  rating: string // "Rated" | "Featured" | "Epic" | "Legendary" | "Mythic"
  progress: number
  totalAttempts: number
  runs: Run[]
  lastPlayedAt: string | null
  dateCompleted: string | null
  enjoyment: number | null
  gddpTier: number | null
  totalSeconds: number | null
  /** optional: when your best % was set (backend). Falls back to a guess from lastPlayedAt. */
  bestAt?: string | null
}

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Insane', 'Extreme']
const TIERS: Tier[] = ['rated', 'featured', 'epic', 'legendary', 'mythic']

/* -------------------------------------------------------------------------- */
/*  Data: sample levels so the page runs on its own                           */
/*  To use your backend, replace useLevels() below with a fetch (see comment).  */
/* -------------------------------------------------------------------------- */

const r = (startPercent: number, endPercent: number): Run => ({ startPercent, endPercent })

const SAMPLE: LevelItem[] = [
  { id: 68688822, name: 'Ulon', creator: 'OliSW', demonDifficulty: 'Insane', rating: 'Featured', progress: 95, totalAttempts: 2840, runs: [r(0, 38), r(20, 64), r(55, 95), r(80, 95), r(80, 95)], lastPlayedAt: '2026-10-27T11:12:00Z', dateCompleted: null, enjoyment: 7.85, gddpTier: 18.8, totalSeconds: 101 },
  { id: 83664980, name: 'Lost Love', creator: 'Nexender', demonDifficulty: 'Extreme', rating: 'Legendary', progress: 100, totalAttempts: 4103, runs: [r(0, 38), r(30, 88), r(91, 96), r(91, 98), r(91, 100)], lastPlayedAt: '2026-10-23T01:33:30Z', dateCompleted: '2026-10-23T01:33:30Z', enjoyment: 8.9, gddpTier: 31.2, totalSeconds: 95 },
  { id: 88909678, name: 'Dream', creator: 'Danze2612', demonDifficulty: 'Hard', rating: 'Featured', progress: 100, totalAttempts: 336, runs: [r(0, 100)], lastPlayedAt: '2026-10-18T16:40:00Z', dateCompleted: '2026-10-18T16:40:00Z', enjoyment: 8.12, gddpTier: 6.6, totalSeconds: 74 },
  { id: 89131259, name: 'Reflect', creator: 'ImPanther', demonDifficulty: 'Easy', rating: 'Featured', progress: 51, totalAttempts: 51, runs: [r(0, 51), r(30, 51)], lastPlayedAt: '2026-10-26T20:05:00Z', dateCompleted: null, enjoyment: 6.66, gddpTier: 2.0, totalSeconds: 62 },
  { id: 89425733, name: 'Aeoning', creator: 'Vizitek', demonDifficulty: 'Easy', rating: 'Rated', progress: 94, totalAttempts: 94, runs: [r(0, 60), r(55, 94)], lastPlayedAt: '2026-10-25T09:00:00Z', dateCompleted: null, enjoyment: 6.42, gddpTier: 3.0, totalSeconds: 58 },
  { id: 88836701, name: 'weird hell', creator: 'IpuNneO', demonDifficulty: 'Easy', rating: 'Featured', progress: 100, totalAttempts: 93, runs: [r(0, 100)], lastPlayedAt: '2026-10-12T13:20:00Z', dateCompleted: '2026-10-12T13:20:00Z', enjoyment: 7.47, gddpTier: 1.9, totalSeconds: 49 },
  { id: 65633532, name: 'Through The Decay', creator: 'Oskux', demonDifficulty: 'Extreme', rating: 'Epic', progress: 14, totalAttempts: 3233, runs: [r(0, 12), r(0, 6), r(0, 6), r(0, 14), r(22, 74), r(45, 72)], lastPlayedAt: '2026-10-22T21:14:27Z', dateCompleted: null, enjoyment: 8.31, gddpTier: 28.4, totalSeconds: 148 },
  { id: 81257586, name: 'Tidal Wave', creator: 'OniLink', demonDifficulty: 'Extreme', rating: 'Mythic', progress: 10, totalAttempts: 8110, runs: [r(0, 10), r(12, 55), r(40, 69), r(66, 84)], lastPlayedAt: '2026-10-23T21:14:16Z', dateCompleted: null, enjoyment: 8.75, gddpTier: 35.1, totalSeconds: 132 },
  { id: 108387232, name: 'Sakupen Circles', creator: 'DiamondGD', demonDifficulty: 'Insane', rating: 'Legendary', progress: 100, totalAttempts: 341, runs: [r(90, 100)], lastPlayedAt: '2026-10-23T22:56:03Z', dateCompleted: '2026-10-23T22:56:03Z', enjoyment: 8.0, gddpTier: 21.0, totalSeconds: 76 },
  { id: 89152238, name: 'Choa Chu Kang', creator: 'IAmRozz', demonDifficulty: 'Medium', rating: 'Featured', progress: 0, totalAttempts: 0, runs: [], lastPlayedAt: null, dateCompleted: null, enjoyment: 8.36, gddpTier: 4.9, totalSeconds: 66 },
  { id: 89379796, name: 'Yellow Snow', creator: 'KerbexGMD', demonDifficulty: 'Easy', rating: 'Featured', progress: 87, totalAttempts: 87, runs: [r(0, 87)], lastPlayedAt: '2026-10-20T18:30:00Z', dateCompleted: null, enjoyment: 7.35, gddpTier: 1.9, totalSeconds: 54 },
  { id: 83664980, name: 'Lost Love', creator: 'Nexender', demonDifficulty: 'Extreme', rating: 'Legendary', progress: 100, totalAttempts: 4103, runs: [r(0, 38), r(30, 88), r(91, 96), r(91, 98), r(91, 100)], lastPlayedAt: '2026-10-23T01:33:30Z', dateCompleted: '2026-10-23T01:33:30Z', enjoyment: 8.9, gddpTier: 31.2, totalSeconds: 95 },
  { id: 88909678, name: 'Dream', creator: 'Danze2612', demonDifficulty: 'Hard', rating: 'Featured', progress: 100, totalAttempts: 336, runs: [r(0, 100)], lastPlayedAt: '2026-10-18T16:40:00Z', dateCompleted: '2026-10-18T16:40:00Z', enjoyment: 8.12, gddpTier: 6.6, totalSeconds: 74 },
  { id: 89131259, name: 'Reflect', creator: 'ImPanther', demonDifficulty: 'Easy', rating: 'Featured', progress: 51, totalAttempts: 51, runs: [r(0, 51), r(30, 51)], lastPlayedAt: '2026-10-26T20:05:00Z', dateCompleted: null, enjoyment: 6.66, gddpTier: 2.0, totalSeconds: 62 },
  { id: 89425733, name: 'Aeoning', creator: 'Vizitek', demonDifficulty: 'Easy', rating: 'Rated', progress: 94, totalAttempts: 94, runs: [r(0, 60), r(55, 94)], lastPlayedAt: '2026-10-25T09:00:00Z', dateCompleted: null, enjoyment: 6.42, gddpTier: 3.0, totalSeconds: 58 },
  { id: 88836701, name: 'weird hell', creator: 'IpuNneO', demonDifficulty: 'Easy', rating: 'Featured', progress: 100, totalAttempts: 93, runs: [r(0, 100)], lastPlayedAt: '2026-10-12T13:20:00Z', dateCompleted: '2026-10-12T13:20:00Z', enjoyment: 7.47, gddpTier: 1.9, totalSeconds: 49 },
  { id: 65633532, name: 'Through The Decay', creator: 'Oskux', demonDifficulty: 'Extreme', rating: 'Epic', progress: 14, totalAttempts: 3233, runs: [r(0, 12), r(0, 6), r(0, 6), r(0, 14), r(22, 74), r(45, 72)], lastPlayedAt: '2026-10-22T21:14:27Z', dateCompleted: null, enjoyment: 8.31, gddpTier: 28.4, totalSeconds: 148 },
  { id: 81257586, name: 'Tidal Wave', creator: 'OniLink', demonDifficulty: 'Extreme', rating: 'Mythic', progress: 10, totalAttempts: 8110, runs: [r(0, 10), r(12, 55), r(40, 69), r(66, 84)], lastPlayedAt: '2026-10-23T21:14:16Z', dateCompleted: null, enjoyment: 8.75, gddpTier: 35.1, totalSeconds: 132 },
  { id: 108387232, name: 'Sakupen Circles', creator: 'DiamondGD', demonDifficulty: 'Insane', rating: 'Legendary', progress: 100, totalAttempts: 341, runs: [r(90, 100)], lastPlayedAt: '2026-10-23T22:56:03Z', dateCompleted: '2026-10-23T22:56:03Z', enjoyment: 8.0, gddpTier: 21.0, totalSeconds: 76 },
  { id: 87850129, name: 'Acheron', creator: 'ryamu', demonDifficulty: 'Extreme', rating: 'Epic', progress: 15, totalAttempts: 1327, runs: [r(0, 15), r(20, 63), r(70, 100)], lastPlayedAt: '2026-10-24T07:59:40Z', dateCompleted: null, enjoyment: 7.2, gddpTier: 27.0, totalSeconds: 104 },
  { id: 89152238, name: 'Choa Chu Kang', creator: 'IAmRozz', demonDifficulty: 'Medium', rating: 'Featured', progress: 0, totalAttempts: 0, runs: [], lastPlayedAt: null, dateCompleted: null, enjoyment: 8.36, gddpTier: 4.9, totalSeconds: 66 },
  { id: 89379796, name: 'Yellow Snow', creator: 'KerbexGMD', demonDifficulty: 'Easy', rating: 'Featured', progress: 87, totalAttempts: 87, runs: [r(0, 87)], lastPlayedAt: '2026-10-20T18:30:00Z', dateCompleted: null, enjoyment: 7.35, gddpTier: 1.9, totalSeconds: 54 },
  { id: 83664980, name: 'Lost Love', creator: 'Nexender', demonDifficulty: 'Extreme', rating: 'Legendary', progress: 100, totalAttempts: 4103, runs: [r(0, 38), r(30, 88), r(91, 96), r(91, 98), r(91, 100)], lastPlayedAt: '2026-10-23T01:33:30Z', dateCompleted: '2026-10-23T01:33:30Z', enjoyment: 8.9, gddpTier: 31.2, totalSeconds: 95 },
  { id: 88909678, name: 'Dream', creator: 'Danze2612', demonDifficulty: 'Hard', rating: 'Featured', progress: 100, totalAttempts: 336, runs: [r(0, 100)], lastPlayedAt: '2026-10-18T16:40:00Z', dateCompleted: '2026-10-18T16:40:00Z', enjoyment: 8.12, gddpTier: 6.6, totalSeconds: 74 },
  { id: 89131259, name: 'Reflect', creator: 'ImPanther', demonDifficulty: 'Easy', rating: 'Featured', progress: 51, totalAttempts: 51, runs: [r(0, 51), r(30, 51)], lastPlayedAt: '2026-10-26T20:05:00Z', dateCompleted: null, enjoyment: 6.66, gddpTier: 2.0, totalSeconds: 62 },
  { id: 89425733, name: 'Aeoning', creator: 'Vizitek', demonDifficulty: 'Easy', rating: 'Rated', progress: 94, totalAttempts: 94, runs: [r(0, 60), r(55, 94)], lastPlayedAt: '2026-10-25T09:00:00Z', dateCompleted: null, enjoyment: 6.42, gddpTier: 3.0, totalSeconds: 58 },
  { id: 88836701, name: 'weird hell', creator: 'IpuNneO', demonDifficulty: 'Easy', rating: 'Featured', progress: 100, totalAttempts: 93, runs: [r(0, 100)], lastPlayedAt: '2026-10-12T13:20:00Z', dateCompleted: '2026-10-12T13:20:00Z', enjoyment: 7.47, gddpTier: 1.9, totalSeconds: 49 },
  { id: 65633532, name: 'Through The Decay', creator: 'Oskux', demonDifficulty: 'Extreme', rating: 'Epic', progress: 14, totalAttempts: 3233, runs: [r(0, 12), r(0, 6), r(0, 6), r(0, 14), r(22, 74), r(45, 72)], lastPlayedAt: '2026-10-22T21:14:27Z', dateCompleted: null, enjoyment: 8.31, gddpTier: 28.4, totalSeconds: 148 },
  { id: 87850129, name: 'Acheron', creator: 'ryamu', demonDifficulty: 'Extreme', rating: 'Epic', progress: 15, totalAttempts: 1327, runs: [r(0, 15), r(20, 63), r(70, 100)], lastPlayedAt: '2026-10-24T07:59:40Z', dateCompleted: null, enjoyment: 7.2, gddpTier: 27.0, totalSeconds: 104 },
  { id: 81257586, name: 'Tidal Wave', creator: 'OniLink', demonDifficulty: 'Extreme', rating: 'Mythic', progress: 10, totalAttempts: 8110, runs: [r(0, 10), r(12, 55), r(40, 69), r(66, 84)], lastPlayedAt: '2026-10-23T21:14:16Z', dateCompleted: null, enjoyment: 8.75, gddpTier: 35.1, totalSeconds: 132 },
  { id: 108387232, name: 'Sakupen Circles', creator: 'DiamondGD', demonDifficulty: 'Insane', rating: 'Legendary', progress: 100, totalAttempts: 341, runs: [r(90, 100)], lastPlayedAt: '2026-10-23T22:56:03Z', dateCompleted: '2026-10-23T22:56:03Z', enjoyment: 8.0, gddpTier: 21.0, totalSeconds: 76 },
  { id: 87850129, name: 'Acheron', creator: 'ryamu', demonDifficulty: 'Extreme', rating: 'Epic', progress: 15, totalAttempts: 1327, runs: [r(0, 15), r(20, 63), r(70, 100)], lastPlayedAt: '2026-10-24T07:59:40Z', dateCompleted: null, enjoyment: 7.2, gddpTier: 27.0, totalSeconds: 104 },
  { id: 89152238, name: 'Choa Chu Kang', creator: 'IAmRozz', demonDifficulty: 'Medium', rating: 'Featured', progress: 0, totalAttempts: 0, runs: [], lastPlayedAt: null, dateCompleted: null, enjoyment: 8.36, gddpTier: 4.9, totalSeconds: 66 },
  { id: 89379796, name: 'Yellow Snow', creator: 'KerbexGMD', demonDifficulty: 'Easy', rating: 'Featured', progress: 87, totalAttempts: 87, runs: [r(0, 87)], lastPlayedAt: '2026-10-20T18:30:00Z', dateCompleted: null, enjoyment: 7.35, gddpTier: 1.9, totalSeconds: 54 },
]

/** Where the levels come from. Swap this for your backend when you are ready:
 *
 *   const [levels, setLevels] = useState<LevelItem[]>([])
 *   useEffect(() => { fetch('/api/levels').then(r => r.json()).then(setLevels) }, [])
 */
function useLevels() {
  // the sample list repeats some levels; keep one per id (also avoids duplicate React keys)
  const levels = useMemo(() => Array.from(new Map(SAMPLE.map((l) => [l.id, l])).values()), [])
  return { levels, loading: false }
}

/* -------------------------------------------------------------------------- */
/*  Styling tables                                                            */
/* -------------------------------------------------------------------------- */

const TIER_STYLE: Record<Tier, { label: string; chip: string; glow: string; ring: string }> = {
  rated: { label: 'Rated', chip: 'border-slate-600/60 bg-slate-700/40 text-slate-300', glow: 'drop-shadow-[0_0_12px_rgba(148,163,184,0.4)]', ring: 'hover:border-slate-500/50' },
  featured: { label: 'Featured', chip: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300', glow: 'drop-shadow-[0_0_14px_rgba(250,204,21,0.6)]', ring: 'hover:border-yellow-400/50' },
  epic: { label: 'Epic', chip: 'border-orange-400/40 bg-orange-400/10 text-orange-300', glow: 'drop-shadow-[0_0_14px_rgba(251,146,60,0.65)]', ring: 'hover:border-orange-400/50' },
  legendary: { label: 'Legendary', chip: 'border-pink-400/40 bg-pink-400/10 text-pink-300', glow: 'drop-shadow-[0_0_14px_rgba(244,114,182,0.65)]', ring: 'hover:border-pink-400/50' },
  mythic: { label: 'Mythic', chip: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300', glow: 'drop-shadow-[0_0_14px_rgba(34,211,238,0.7)]', ring: 'hover:border-cyan-400/50' },
}

const DIFF_STYLE: Record<Difficulty, { chip: string; hue: string }> = {
  Easy: { chip: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300', hue: 'from-emerald-500/40 to-slate-900' },
  Medium: { chip: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300', hue: 'from-yellow-500/40 to-slate-900' },
  Hard: { chip: 'border-orange-400/40 bg-orange-400/10 text-orange-300', hue: 'from-orange-500/40 to-slate-900' },
  Insane: { chip: 'border-pink-400/40 bg-pink-400/10 text-pink-300', hue: 'from-pink-500/40 to-slate-900' },
  Extreme: { chip: 'border-red-500/40 bg-red-500/10 text-red-300', hue: 'from-red-600/40 to-slate-900' },
}

const DIFF_COLOR: Record<Difficulty, string> = { Easy: '#34d399', Medium: '#facc15', Hard: '#fb923c', Insane: '#f472b6', Extreme: '#ef4444' }

const toTier = (rating: string): Tier => {
  const v = rating.toLowerCase()
  return (TIERS as string[]).includes(v) ? (v as Tier) : 'rated'
}

const SORTS = [
  { id: 'recent', label: 'Recently played' },
  { id: 'best', label: 'Best run' },
  { id: 'attempts', label: 'Most attempts' },
  { id: 'difficulty', label: 'Hardest first' },
  { id: 'enjoyment', label: 'Enjoyment' },
  { id: 'gddp', label: 'GDDP tier' },
  { id: 'name', label: 'Name A-Z' },
] as const
type SortId = (typeof SORTS)[number]['id']

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'progress', label: 'In progress' },
  { id: 'beaten', label: 'Beaten' },
  { id: 'fresh', label: 'Not started' },
] as const
type StatusId = (typeof STATUSES)[number]['id']

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const isBeaten = (l: LevelItem) => l.progress >= 100 || Boolean(l.dateCompleted)
const isFresh = (l: LevelItem) => l.progress === 0 && l.runs.length === 0

function planOf(runs: Run[]) {
  const sorted = [...runs].sort((a, b) => a.startPercent - b.startPercent)
  let reach = 0
  let i = 0
  let count = 0
  while (reach < 100) {
    let best: Run | null = null
    while (i < sorted.length && sorted[i].startPercent <= reach) {
      if (!best || sorted[i].endPercent > best.endPercent) best = sorted[i]
      i++
    }
    if (!best || best.endPercent <= reach) return { complete: false as const, count, gapAt: reach }
    count++
    reach = best.endPercent
  }
  return { complete: true as const, count, gapAt: 100 }
}

function formatDuration(s: number) {
  const t = Math.max(0, Math.round(s))
  const m = Math.floor(t / 60)
  const r = t % 60
  return m === 0 ? `${r}s` : r === 0 ? `${m}m` : `${m}m ${r}s`
}

/** Needs `now` so it only appears after mount (server and browser always agree). */
function relativeTime(iso: string | null, now: number | null) {
  if (!iso) return 'Never played'
  if (now == null) return ''
  const diff = (new Date(iso).getTime() - now) / 1000
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

const isLive = (iso: string | null, now: number | null) => Boolean(iso && now != null && now - new Date(iso).getTime() < 10 * 60_000 && now >= new Date(iso).getTime())

const dateFmt = (iso: string | null, now: number | null) =>
  iso && now != null ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

type Status = { kind: 'beaten' | 'best' | 'progress' | 'fresh'; label: string; sub?: string }

function statusOf(l: LevelItem, now: number | null): Status {
  if (isBeaten(l)) return { kind: 'beaten', label: 'Beaten', sub: dateFmt(l.dateCompleted ?? l.lastPlayedAt, now) }
  if (isFresh(l)) return { kind: 'fresh', label: 'Not started' }
  const within48h = (iso: string | null) => Boolean(iso && now != null && now - new Date(iso).getTime() < 48 * 3600_000)
  const maxEnd = Math.max(0, ...l.runs.map((x) => x.endPercent))
  if (l.bestAt ? within48h(l.bestAt) : within48h(l.lastPlayedAt) && maxEnd >= l.progress) return { kind: 'best', label: 'New best', sub: `${l.progress}%` }
  return { kind: 'progress', label: 'In progress' }
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      from.current = target
      setValue(target)
      return
    }
    const begin = from.current
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const v = begin + (target - begin) * (1 - Math.pow(1 - p, 3))
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function Num({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const v = useCountUp(value)
  return (
    <>
      {v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  )
}

const CSS = `
@keyframes gl-rise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
@keyframes gl-grow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes gl-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
@keyframes gl-shimmer { from { background-position: 0% 50% } to { background-position: 100% 50% } }
.gl-rise { animation: gl-rise .55s cubic-bezier(.2, .8, .2, 1) both }
.gl-grow { transform-origin: left; animation: gl-grow .9s cubic-bezier(.2, .8, .2, 1) both }
.gl-float { animation: gl-float 5s ease-in-out infinite }
.gl-shimmer { background-size: 200% 100%; animation: gl-shimmer 5s ease-in-out infinite alternate }
html { scrollbar-width: thin; scrollbar-color: #7c5cff #070b0e }
html::-webkit-scrollbar { width: 12px }
html::-webkit-scrollbar-track { background: #070b0e }
html::-webkit-scrollbar-thumb { background: linear-gradient(#22d3ee, #8b5cf6, #ec4899); border-radius: 999px; border: 3px solid #070b0e }
html::-webkit-scrollbar-thumb:hover { filter: brightness(1.25) }
@media (prefers-reduced-motion: reduce) { .gl-rise, .gl-grow, .gl-float, .gl-shimmer { animation: none !important } }
`

const panel = 'rounded-2xl border border-white/10 bg-[#0a1015]/70 backdrop-blur-xl'

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

/** /gdfaces/<difficulty>-<tier>.png, falling back to <difficulty>-rated.png if that file is missing. */
function Face({ difficulty, tier, className }: { difficulty: Difficulty; tier: Tier; className?: string }) {
  const [stage, setStage] = useState(0)
  useEffect(() => setStage(0), [difficulty, tier])
  if (stage > 1) return null
  const d = difficulty.toLowerCase()
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/gdfaces/${d}-${stage === 0 ? tier : 'rated'}.png`} alt={`${difficulty} ${tier}`} className={className} onError={() => setStage((n) => n + 1)} />
}

function Thumb({ level, className }: { level: LevelItem; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`overflow-hidden bg-gradient-to-br ${DIFF_STYLE[level.demonDifficulty].hue} ${className ?? ''}`}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://levelthumbs.prevter.me/thumbnail/${level.id}`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
  count,
  tone = 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200',
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  count?: number
  tone?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition ${active ? tone : 'border-slate-800 bg-white/[0.03] text-slate-400 hover:border-slate-700 hover:text-slate-200'
        }`}
    >
      {active && <Check className="size-3" />}
      {children}
      {count != null && <span className={`tabular-nums ${active ? 'opacity-80' : 'text-slate-600'}`}>{count}</span>}
    </button>
  )
}

/* Each card gets ONE accent colour: green when beaten, otherwise the colour of its rating tier.
   The progress bar, the % number, the hover glow and the side line all use it. */
const TIER_ACCENT: Record<Tier, string> = {
  rated: '#94a3b8',
  featured: '#facc15',
  epic: '#fb923c',
  legendary: '#f472b6',
  mythic: '#22d3ee',
}
const BEATEN_ACCENT = '#34d399'
const accentOf = (l: LevelItem) => (isBeaten(l) ? BEATEN_ACCENT : TIER_ACCENT[toTier(l.rating)])

/** The big % number: white at the top fading into the accent colour. */
const percentStyle = (accent: string): CSSProperties => ({
  backgroundImage: `linear-gradient(to bottom, #ffffff 15%, ${accent})`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
})

function BestBar({ value, delay = 0, accent }: { value: number; delay?: number; accent: string }) {
  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-slate-800/80" title={`Best ${value}%`}>
      <div
        className="gl-grow h-full rounded-full"
        style={{
          width: `${Math.min(100, value)}%`,
          background: `linear-gradient(to right, ${accent}55, ${accent})`,
          boxShadow: `0 0 12px ${accent}99`,
          animationDelay: `${delay}ms`,
        }}
      />
      {[25, 50, 75].map((t) => (
        <span key={t} className="absolute inset-y-0 w-px bg-[#0a1015]/70" style={{ left: `${t}%` }} />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Cards                                                                     */
/* -------------------------------------------------------------------------- */

/* Position in the list you are looking at (follows the current sort and filters).
   Numbers 1 to 10 each get their own colour and a glow, 11 and up are plain. */
const TOP10 = [
  { a: '#fde047', b: '#f59e0b' }, // 1  gold
  { a: '#f1f5f9', b: '#94a3b8' }, // 2  silver
  { a: '#fdba74', b: '#ea580c' }, // 3  bronze
  { a: '#67e8f9', b: '#0891b2' }, // 4  cyan
  { a: '#a5b4fc', b: '#4f46e5' }, // 5  indigo
  { a: '#d8b4fe', b: '#9333ea' }, // 6  purple
  { a: '#f9a8d4', b: '#db2777' }, // 7  pink
  { a: '#fda4af', b: '#e11d48' }, // 8  rose
  { a: '#6ee7b7', b: '#059669' }, // 9  emerald
  { a: '#bef264', b: '#65a30d' }, // 10 lime
]

function RankBadge({ rank, variant }: { rank: number; variant: 'card' | 'row' }) {
  const top = TOP10[rank - 1]
  const title = `Number ${rank} in this list`
  // gradient + glow for the top 10, glass for the rest
  const topStyle: CSSProperties | undefined = top
    ? { background: `linear-gradient(135deg, ${top.a}, ${top.b})`, boxShadow: `0 0 18px -3px ${top.b}, inset 0 1px 0 rgba(255,255,255,0.45)` }
    : undefined

  if (variant === 'card') {
    return (
      <span
        title={title}
        className={`relative z-10 flex h-6 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 font-heading text-[11px] font-extrabold tabular-nums ${top ? 'text-[#0a0f14]' : 'border border-white/15 bg-black/55 text-slate-200 backdrop-blur-md'}`}
        style={topStyle}
      >
        {rank === 1 && <Crown className="size-3 fill-current" />}
        <span>
          <span className="opacity-60">#</span>
          {rank}
        </span>
      </span>
    )
  }
  // row: a square, a little bigger for the top 10
  return (
    <span
      title={title}
      className={`relative z-10 grid shrink-0 place-items-center rounded-xl font-heading font-extrabold tabular-nums ${top ? 'size-11 text-lg text-[#0a0f14]' : `size-9 border border-white/10 bg-white/[0.06] text-slate-300 ${rank >= 100 ? 'text-xs' : 'text-sm'}`}`}
      style={topStyle}
    >
      {rank === 1 && <Crown className="absolute -top-2.5 left-1/2 size-4 -translate-x-1/2 fill-yellow-300 text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />}
      {rank}
    </span>
  )
}

function StatusBadge({ st }: { st: Status }) {
  const map = {
    beaten: { cls: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300', icon: <Trophy className="size-3" /> },
    best: { cls: 'border-amber-400/40 bg-amber-500/20 text-amber-200', icon: <Sparkles className="size-3" /> },
    progress: { cls: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200', icon: <Flame className="size-3" /> },
    fresh: { cls: 'border-slate-600/60 bg-slate-800/60 text-slate-300', icon: <Play className="size-3" /> },
  }[st.kind]
  return (
    <span className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md ${map.cls}`} suppressHydrationWarning>
      {map.icon}
      {st.label}
      {st.sub && <span className="font-semibold normal-case tracking-normal opacity-80">· {st.sub}</span>}
    </span>
  )
}

/** Glow that fades in on hover: a thin accent outline plus a soft shadow under the card. */
function HoverGlow({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}88, 0 22px 50px -24px ${accent}` }}
    />
  )
}

function LevelCard({ level, now, index, rank }: { level: LevelItem; now: number | null; index: number; rank: number }) {
  const tier = toTier(level.rating)
  const ts = TIER_STYLE[tier]
  const accent = accentOf(level)
  const live = isLive(level.lastPlayedAt, now)
  const st = statusOf(level, now)
  const delay = Math.min(index, 12) * 45
  const beaten = st.kind === 'beaten'
  const played = relativeTime(level.lastPlayedAt, now)

  return (
    // the rise animation lives on this wrapper, so the hover lift on the link underneath is not blocked by it
    <div className="gl-rise" style={{ animationDelay: `${delay}ms` }}>
      <Link
        href={`/levels/${level.id}`}
        className="group relative block aspect-[16/10] min-h-[220px] w-full rounded-2xl border border-white/10 bg-[#0a1015] transition duration-300 hover:-translate-y-1.5"
        style={beaten ? { borderColor: `${accent}66`, boxShadow: `0 0 40px -20px ${accent}` } : undefined}
      >
        <HoverGlow accent={accent} />

        {/* the level picture fills the whole card */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <Thumb level={level} className="h-full w-full" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}33, transparent 55%)` }} />
          {/* darkening: from the bottom (for the numbers) and from the left (for the name) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b0e] via-[#070b0e]/30 to-[#070b0e]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b0e]/70 via-[#070b0e]/10 to-transparent" />
          {/* progress: a thin line along the bottom edge */}
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50" title={`Best ${level.progress}%`}>
            <div
              className="gl-grow h-full rounded-r-full"
              style={{ width: `${Math.min(100, level.progress)}%`, background: `linear-gradient(to right, ${accent}66, ${accent})`, boxShadow: `0 0 12px ${accent}` }}
            />
          </div>
        </div>

        {/* big face, like the ladder cards */}
        <Face
          difficulty={level.demonDifficulty}
          tier={tier}
          className={`pointer-events-none absolute right-3 top-1/2 z-[5] size-28 -translate-y-[55%] object-contain transition duration-500 group-hover:scale-110 sm:size-32 ${ts.glow}`}
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-4 pb-5">
          {/* top: rank + status on the left, GDDP or Playing on the right */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <RankBadge rank={rank} variant="card" />
              <StatusBadge st={st} />
            </div>
            {live ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                </span>
                Playing
              </span>
            ) : (
              level.gddpTier != null && (
                <span className="flex shrink-0 items-center gap-1 rounded-md border border-violet-400/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-100 backdrop-blur-md" title="GDDP tier">
                  <Gauge className="size-3" />
                  {level.gddpTier}
                </span>
              )
            )}
          </div>

          {/* name + creator */}
          <div className="max-w-[62%]">
            <h3
              className="line-clamp-2 font-heading text-2xl font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] transition-colors duration-300 group-hover:[color:var(--c)]"
              style={{ '--c': accent } as CSSProperties}
            >
              {level.name}
            </h3>
            <p className="truncate text-sm text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              by <span className="font-semibold text-white">{level.creator}</span>
            </p>
          </div>

          {/* bottom: big best %, one small line of numbers, last played on the right */}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="font-heading text-5xl font-extrabold leading-none tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]" style={percentStyle(accent)}>
                <Num value={level.progress} />
                <span className="text-3xl">%</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold tabular-nums text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                <span className="flex items-center gap-1" title="Total attempts">
                  <Skull className="size-3.5 text-red-400" />
                  {level.totalAttempts.toLocaleString('en-US')}
                </span>
                {level.totalSeconds != null && (
                  <span className="flex items-center gap-1" title="Level length">
                    <Clock className="size-3.5 text-cyan-300" />
                    {formatDuration(level.totalSeconds)}
                  </span>
                )}
                {level.enjoyment != null && (
                  <span className="flex items-center gap-1" title="Enjoyment">
                    <Star className="size-3.5 text-yellow-300" />
                    {level.enjoyment.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 pb-0.5 text-xs font-semibold text-slate-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]" title="Last played" suppressHydrationWarning>
              {played || '\u00a0'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

function LevelRow({ level, now, index, rank }: { level: LevelItem; now: number | null; index: number; rank: number }) {
  const tier = toTier(level.rating)
  const ts = TIER_STYLE[tier]
  const accent = accentOf(level)
  const live = isLive(level.lastPlayedAt, now)
  const st = statusOf(level, now)
  const beaten = st.kind === 'beaten'
  const tries = level.totalAttempts.toLocaleString('en-US')
  const length = level.totalSeconds != null ? formatDuration(level.totalSeconds) : '—'

  return (
    <div className="gl-rise" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
      <Link
        href={`/levels/${level.id}`}
        className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0a1015]/80 py-3 pl-5 pr-4 backdrop-blur-xl transition duration-300 hover:translate-x-1 hover:bg-[#0d141a]/90 md:flex-row md:items-center md:gap-4"
        style={beaten ? { borderColor: `${accent}55` } : undefined}
      >
        <HoverGlow accent={accent} />
        
        {/* 👇 1. THE AMBIENT BACKGROUND (Blurred Level Thumbnail) */}
        <Thumb 
          level={level} 
          className="pointer-events-none absolute inset-0 opacity-[0.15] blur-[6px] scale-110 transition duration-700 group-hover:opacity-30 group-hover:blur-sm group-hover:scale-105" 
        />
        
        {/* 👇 2. DARK GRADIENT OVERLAY (Keeps text readable while showing art on the right) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1015]/95 via-[#0a1015]/80 to-[#0a1015]/20 pointer-events-none" />

        {/* accent line on the left edge */}
        <span className="absolute inset-y-0 left-0 w-1 z-10" style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}33)` }} aria-hidden="true" />

        {/* top line. On phones this is the header of the row, from md up its children join the main row (md:contents). */}
        <div className="relative z-10 flex min-w-0 items-center gap-3 md:contents">
          <RankBadge rank={rank} variant="row" />

          <div className="relative hidden h-16 w-32 shrink-0 overflow-hidden rounded-xl sm:block border border-white/10 shadow-lg">
            <Thumb level={level} className="h-full w-full" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}33, transparent 60%)` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>

          <Face difficulty={level.demonDifficulty} tier={tier} className={`size-14 shrink-0 object-contain md:size-14 ${ts.glow}`} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-heading text-base font-extrabold text-white transition-colors duration-300 group-hover:[color:var(--c)] sm:text-lg drop-shadow-md" style={{ '--c': accent } as CSSProperties}>
                {level.name}
              </h3>
              {live && (
                <span className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                  <Radio className="size-3 animate-pulse" /> Playing
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-300 drop-shadow-sm">
              by <span className="font-semibold text-white">{level.creator}</span> · <span suppressHydrationWarning>{relativeTime(level.lastPlayedAt, now) || ' '}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge st={st} />
            </div>
          </div>

          {/* % for phones */}
          <div className="shrink-0 text-right font-heading text-4xl font-extrabold leading-none tabular-nums md:hidden drop-shadow-lg" style={percentStyle(accent)}>
            {level.progress}%
          </div>
        </div>

        {/* phones: bar and numbers on a second line */}
        <div className="relative z-10 flex items-center gap-3 md:hidden">
          <div className="min-w-0 flex-1">
            <BestBar value={level.progress} delay={index * 35} accent={accent} />
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-slate-200 drop-shadow-sm">
            <Skull className="size-3.5 text-red-400" />
            {tries}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-slate-200 drop-shadow-sm">
            <Clock className="size-3.5 text-cyan-300" />
            {length}
          </span>
        </div>

        {/* md and up: progress */}
        <div className="relative z-10 hidden w-52 shrink-0 md:block">
          <BestBar value={level.progress} delay={index * 35} accent={accent} />
        </div>

        {/* numbers */}
        <div className="relative z-10 hidden w-24 shrink-0 flex-col gap-1.5 text-xs tabular-nums text-slate-200 xl:flex drop-shadow-sm">
          <span className="flex items-center gap-1.5" title="Total attempts">
            <Skull className="size-3.5 text-red-400" />
            {tries}
          </span>
          <span className="flex items-center gap-1.5" title="Level length">
            <Clock className="size-3.5 text-cyan-300" />
            {length}
          </span>
        </div>
        <div className="relative z-10 hidden w-20 shrink-0 flex-col gap-1.5 text-xs tabular-nums text-slate-200 2xl:flex drop-shadow-sm">
          <span className="flex items-center gap-1.5" title="Enjoyment">
            <Star className="size-3.5 text-yellow-300" />
            {level.enjoyment != null ? level.enjoyment.toFixed(1) : '—'}
          </span>
          <span className="flex items-center gap-1.5" title="GDDP tier">
            <Gauge className="size-3.5 text-violet-300" />
            {level.gddpTier != null ? level.gddpTier : '—'}
          </span>
        </div>

        <div className="relative z-10 hidden w-[4.5rem] shrink-0 text-right font-heading text-3xl font-extrabold tabular-nums md:block drop-shadow-lg" style={percentStyle(accent)}>
          {level.progress}%
        </div>
        <ArrowRight className="relative z-10 hidden size-4 shrink-0 text-slate-500 transition duration-300 group-hover:translate-x-1 group-hover:text-white md:block" />
      </Link>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 12

export default function LevelsPage() {
  const { levels, loading } = useLevels()

  const [query, setQuery] = useState('')
  const [diffs, setDiffs] = useState<Difficulty[]>([])
  const [status, setStatus] = useState<StatusId>('all')
  const [sort, setSort] = useState<SortId>('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [sortOpen, setSortOpen] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const diffRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  // clock for relative times (after mount, so server and browser agree)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // remember sort + view between visits
  useEffect(() => {
    try {
      const s = localStorage.getItem('gd-levels-sort') as SortId | null
      const v = localStorage.getItem('gd-levels-view') as 'grid' | 'list' | null
      if (s && SORTS.some((x) => x.id === s)) setSort(s)
      if (v === 'grid' || v === 'list') setView(v)
    } catch { }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('gd-levels-sort', sort)
      localStorage.setItem('gd-levels-view', view)
    } catch { }
  }, [sort, view])

  // keyboard: "/" focuses search, Esc clears it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape' && el === searchRef.current) {
        setQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // close the popups when you click outside them or press Esc
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (diffRef.current && !diffRef.current.contains(t)) setDiffOpen(false)
      if (sortRef.current && !sortRef.current.contains(t)) setSortOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDiffOpen(false)
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [])

  // go back to the first page whenever the filters change
  useEffect(() => setVisible(PAGE_SIZE), [query, diffs, status, sort])

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = levels.filter((l) => {
      if (q && !(l.name.toLowerCase().includes(q) || l.creator.toLowerCase().includes(q) || String(l.id).includes(q))) return false
      if (diffs.length && !diffs.includes(l.demonDifficulty)) return false
      if (status === 'beaten' && !isBeaten(l)) return false
      if (status === 'progress' && (isBeaten(l) || isFresh(l))) return false
      if (status === 'fresh' && !isFresh(l)) return false
      return true
    })
    const time = (l: LevelItem) => (l.lastPlayedAt ? new Date(l.lastPlayedAt).getTime() : 0)
    const cmp: Record<SortId, (a: LevelItem, b: LevelItem) => number> = {
      recent: (a, b) => time(b) - time(a),
      best: (a, b) => b.progress - a.progress || b.totalAttempts - a.totalAttempts,
      attempts: (a, b) => b.totalAttempts - a.totalAttempts,
      difficulty: (a, b) => DIFFICULTIES.indexOf(b.demonDifficulty) - DIFFICULTIES.indexOf(a.demonDifficulty) || (b.gddpTier ?? 0) - (a.gddpTier ?? 0),
      enjoyment: (a, b) => (b.enjoyment ?? -1) - (a.enjoyment ?? -1),
      gddp: (a, b) => (b.gddpTier ?? -1) - (a.gddpTier ?? -1),
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return [...out].sort(cmp[sort])
  }, [levels, query, diffs, status, sort])

  const stats = useMemo(() => {
    const beaten = levels.filter(isBeaten).length
    const inProgress = levels.filter((l) => !isBeaten(l) && !isFresh(l)).length
    const attempts = levels.reduce((s, l) => s + l.totalAttempts, 0)
    const started = levels.filter((l) => !isFresh(l))
    const avgBest = started.length ? started.reduce((s, l) => s + l.progress, 0) / started.length : 0
    return { total: levels.length, beaten, inProgress, attempts, avgBest }
  }, [levels])

  const counts = useMemo(() => {
    const d = Object.fromEntries(DIFFICULTIES.map((x) => [x, 0])) as Record<Difficulty, number>
    const t = Object.fromEntries(TIERS.map((x) => [x, 0])) as Record<Tier, number>
    for (const l of levels) {
      d[l.demonDifficulty]++
      t[toTier(l.rating)]++
    }
    return { d, t }
  }, [levels])

  // "Continue" = the level you touched most recently that is not beaten yet
  const resume = useMemo(
    () => [...levels].filter((l) => l.lastPlayedAt && !isBeaten(l)).sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())[0],
    [levels],
  )

  const activeFilters = diffs.length + (status !== 'all' ? 1 : 0) + (query.trim() ? 1 : 0)
  const reset = () => {
    setQuery('')
    setDiffs([])
    setStatus('all')
  }

  const shown = filtered.slice(0, visible)
  const sortLabel = SORTS.find((s) => s.id === sort)?.label

  return (
    <div className="relative isolate flex min-h-screen bg-[#070b0e] text-slate-200">
      <style>{CSS}</style>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-32 size-[34rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 size-[34rem] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 size-[34rem] rounded-full bg-pink-500/10 blur-3xl" />
      </div>

      {/* <Sidebar /> */}
      <div className="min-w-0 flex-1">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 p-4 md:p-6 xl:px-10">
        {/* ------------------------------------------------------------ Header */}
        <header className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="gl-shimmer bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text font-heading text-4xl font-extrabold tracking-tight text-transparent xl:text-5xl">
                Demon Levels
              </h1>
              <p className="mt-1 text-sm text-slate-400">Everything you are practising, in one place.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              Auto-tracking
            </div>
          </div>

          {/* stats strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[
              { label: 'Levels', value: <Num value={stats.total} />, icon: <Layers className="size-5" />, tone: 'bg-cyan-400/10 text-cyan-300' },
              { label: 'Beaten', value: <Num value={stats.beaten} />, icon: <Trophy className="size-5" />, tone: 'bg-emerald-400/10 text-emerald-300' },
              { label: 'In progress', value: <Num value={stats.inProgress} />, icon: <Flame className="size-5" />, tone: 'bg-orange-400/10 text-orange-300' },
              { label: 'Total attempts', value: <Num value={stats.attempts} />, icon: <Skull className="size-5" />, tone: 'bg-red-500/10 text-red-400' },
              { label: 'Average best', value: <Num value={stats.avgBest} decimals={1} suffix="%" />, icon: <Gauge className="size-5" />, tone: 'bg-violet-400/10 text-violet-300' },
            ].map((s, i) => (
              <div key={s.label} className={`${panel} gl-rise flex items-center gap-3 p-4`} style={{ animationDelay: `${i * 60}ms` }}>
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${s.tone}`}>{s.icon}</span>
                <div className="leading-tight">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</div>
                  <div className="font-heading text-2xl font-extrabold tabular-nums text-white">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* continue where you left off */}
          {resume && (
            <Link
              href={`/levels/${resume.id}`}
              className={`${panel} gl-rise group relative flex items-center gap-4 overflow-hidden p-4 transition hover:border-cyan-400/40`}
              style={{ animationDelay: '250ms' }}
            >
              <Thumb level={resume} className="pointer-events-none absolute inset-0 opacity-25" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a1015] via-[#0a1015]/80 to-transparent" />
              <Face difficulty={resume.demonDifficulty} tier={toTier(resume.rating)} className={`gl-float relative size-16 shrink-0 object-contain ${TIER_STYLE[toTier(resume.rating)].glow}`} />
              <div className="relative min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Continue where you left off</div>
                <div className="truncate font-heading text-xl font-extrabold text-white">{resume.name}</div>
                <div className="truncate text-xs text-slate-400">
                  Best {resume.progress}% · {resume.totalAttempts.toLocaleString('en-US')} attempts ·{' '}
                  <span suppressHydrationWarning>{relativeTime(resume.lastPlayedAt, now) || ' '}</span>
                </div>
              </div>
              <span className="relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.7)] transition group-hover:scale-105">
                <Crosshair className="size-4" />
                <span className="hidden sm:inline">Open</span>
              </span>
            </Link>
          )}
        </header>

        {/* ------------------------------------------------------------ Toolbar */}
        <section className={`${panel} relative z-20 flex flex-col gap-3 p-3 sm:p-4`}>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* search: full width on phones, grows on bigger screens */}
            <div className="relative order-1 basis-full sm:basis-auto sm:min-w-[220px] sm:flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, creator or ID"
                aria-label="Search levels"
                className="h-11 w-full rounded-xl border border-slate-800 bg-white/[0.03] pl-10 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
              />
              {query ? (
                <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-white/10 hover:text-white">
                  <X className="size-4" />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:block">/</kbd>
              )}
            </div>

            {/* difficulty: an icon button that opens a list (the faces show which is which) */}
            <div ref={diffRef} className="relative order-2">
              <button
                onClick={() => {
                  setDiffOpen((o) => !o)
                  setSortOpen(false)
                }}
                aria-expanded={diffOpen}
                aria-label="Filter by difficulty"
                title="Difficulty"
                className={`relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${diffs.length ? 'border-cyan-400/40 bg-cyan-400/10 text-white' : 'border-slate-800 bg-white/[0.03] text-slate-300 hover:border-slate-700 hover:text-white'}`}
              >
                {diffs.length === 0 ? (
                  <Swords className="size-4 text-cyan-300" />
                ) : (
                  <span className="flex -space-x-2">
                    {diffs.slice(0, 3).map((d) => (
                      <Face key={d} difficulty={d} tier="rated" className="size-6 object-contain" />
                    ))}
                  </span>
                )}
                {diffs.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 text-[10px] font-extrabold text-white">{diffs.length}</span>
                )}
              </button>

              {diffOpen && (
                <div className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d141a] shadow-2xl">
                  <div className="flex items-center justify-between px-4 pb-1 pt-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <Swords className="size-3.5" /> Difficulty
                    </span>
                    {diffs.length > 0 && (
                      <button onClick={() => setDiffs([])} className="text-xs font-bold text-cyan-300 hover:underline">
                        Clear
                      </button>
                    )}
                  </div>
                  <ul className="p-1.5">
                    {DIFFICULTIES.map((d) => {
                      const on = diffs.includes(d)
                      return (
                        <li key={d}>
                          <button
                            onClick={() => setDiffs((x) => toggle(x, d))}
                            aria-pressed={on}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${on ? 'bg-white/[0.07]' : 'hover:bg-white/5'}`}
                          >
                            <Face difficulty={d} tier="rated" className="size-9 shrink-0 object-contain" />
                            <span className="flex-1 text-sm font-bold text-slate-100">{d}</span>
                            <span className="text-xs font-semibold tabular-nums text-slate-500">{counts.d[d]}</span>
                            <span className={`grid size-5 place-items-center rounded-md border transition ${on ? 'border-transparent' : 'border-slate-700'}`} style={on ? { background: DIFF_COLOR[d] } : undefined}>
                              {on && <Check className="size-3.5 text-[#070b0e]" />}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* sort */}
            <div ref={sortRef} className="relative order-3 min-w-0 flex-1 sm:flex-none">
              <button
                onClick={() => {
                  setSortOpen((o) => !o)
                  setDiffOpen(false)
                }}
                aria-expanded={sortOpen}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-white/[0.03] px-3.5 text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ArrowUpDown className="size-4 shrink-0 text-cyan-300" />
                  <span className="truncate">{sortLabel}</span>
                </span>
                <ChevronDown className={`size-4 shrink-0 text-slate-500 transition ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 z-30 mt-2 w-56 max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-white/10 bg-[#0d141a] p-1 shadow-2xl sm:left-auto">
                  {SORTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSort(s.id)
                        setSortOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${sort === s.id ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-300 hover:bg-white/5'}`}
                    >
                      {s.label}
                      {sort === s.id && <Check className="size-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* view toggle */}
            <div className="order-4 flex rounded-xl border border-slate-800 bg-white/[0.03] p-1">
              {([['grid', LayoutGrid], ['list', List]] as const).map(([id, Icon]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  aria-label={`${id} view`}
                  aria-pressed={view === id}
                  className={`grid size-9 place-items-center rounded-lg transition ${view === id ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-500 hover:text-slate-200'}`}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>

          {/* status: one row, scrolls sideways on small screens */}
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {STATUSES.map((s) => (
              <Chip key={s.id} active={status === s.id} onClick={() => setStatus(s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3 text-sm">
            <span className="text-slate-400">
              <span className="font-bold tabular-nums text-white">{filtered.length}</span> of {levels.length} levels
            </span>
            {activeFilters > 0 && (
              <button onClick={reset} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/10">
                <RotateCcw className="size-3.5" />
                Reset {activeFilters}
              </button>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------ Results */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${panel} flex flex-col items-center gap-3 p-12 text-center`}>
            <span className="grid size-14 place-items-center rounded-2xl bg-slate-800 text-slate-500">
              <Search className="size-6" />
            </span>
            <h2 className="font-heading text-xl font-extrabold text-white">No levels match</h2>
            <p className="max-w-sm text-sm text-slate-400">Try a different search or remove a filter.</p>
            <button onClick={reset} className="mt-1 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-4 py-2 text-sm font-bold text-white">
              Reset filters
            </button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
            {shown.map((l, i) => (
              <LevelCard key={l.id} level={l} now={now} index={i} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {shown.map((l, i) => (
              <LevelRow key={l.id} level={l} now={now} index={i} rank={i + 1} />
            ))}
          </div>
        )}

        {filtered.length > visible && (
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="mx-auto flex items-center gap-2 rounded-xl border border-slate-700 bg-white/[0.03] px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
          >
            Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
            <ChevronDown className="size-4" />
          </button>
        )}
      </div>
      </div>
    </div>
  )
}