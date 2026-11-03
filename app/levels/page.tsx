"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
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
  /** AREDL (Extreme Demon List) position and points. Only extremes on the list have them. */
  aredlRank?: number | null
  aredlPoints?: number | null
  totalSeconds: number | null
  /** optional: when your best % was set (backend). Falls back to a guess from lastPlayedAt. */
  bestAt?: string | null
}

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Insane', 'Extreme']
const TIERS: Tier[] = ['rated', 'featured', 'epic', 'legendary', 'mythic']

/* -------------------------------------------------------------------------- */
/*  Data Fetching                                                             */
/* -------------------------------------------------------------------------- */

const AREDL_URL = 'https://api.aredl.net/v2/api/aredl/levels'

function useLevels() {
  const [levels, setLevels] = useState<LevelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()

    async function fetchLevels() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/Levels`, { signal: ctrl.signal })
        if (!res.ok) throw new Error('Failed to fetch')

        const data = await res.json()

        // SANITIZE: Ensure the data matches your LevelItem type
        const validDiffs = ['Easy', 'Medium', 'Hard', 'Insane', 'Extreme']

        const cleanData: LevelItem[] = data.map((l: any) => {
          let rawDiff = l.demonDifficulty || 'Easy'
          rawDiff = rawDiff.replace(' Demon', '') // Handles "Extreme Demon"

          const safeDiff = validDiffs.includes(rawDiff) ? rawDiff : 'Easy'

          return {
            id: l.id,
            name: l.name,
            creator: l.creator,
            demonDifficulty: safeDiff as Difficulty,
            rating: l.rating || 'Rated',
            progress: l.progress || 0,
            totalAttempts: l.totalAttempts || 0,
            runs: l.runs || [], // Backend doesn't send runs for the list, so default to []
            lastPlayedAt: l.lastPlayedAt || null,
            dateCompleted: l.dateCompleted || null,
            enjoyment: l.enjoyment ?? null,
            gddpTier: l.gddpTier ?? null,
            // if your backend already sends the AREDL values they are used as they are
            aredlRank: l.aredlRank ?? l.aredlPosition ?? null,
            aredlPoints: l.aredlPoints ?? null,
            totalSeconds: l.totalSeconds || null,
            bestAt: l.bestAt || null,
          }
        })

        setLevels(cleanData)

        // Extreme levels without AREDL values: ask AREDL directly (one request, matched by level id).
        // If this fails, the page still works, the AREDL chips just do not show.
        if (cleanData.some((l) => l.demonDifficulty === 'Extreme' && l.aredlRank == null)) {
          try {
            const r = await fetch(AREDL_URL, { signal: ctrl.signal })
            if (r.ok) {
              const list: any[] = await r.json()
              const byId = new Map<number, { rank: number | null; points: number | null }>()
              for (const x of Array.isArray(list) ? list : []) {
                const id = Number(x.level_id ?? x.levelId)
                if (Number.isFinite(id)) byId.set(id, { rank: x.position ?? null, points: x.points ?? null })
              }
              setLevels((prev) =>
                prev.map((l) => {
                  const hit = l.demonDifficulty === 'Extreme' && l.aredlRank == null ? byId.get(l.id) : undefined
                  return hit ? { ...l, aredlRank: hit.rank, aredlPoints: hit.points } : l
                }),
              )
            }
          } catch {
            /* AREDL unreachable: ignore */
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('Error loading levels:', e)
          setError(true)
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }

    fetchLevels()
    return () => ctrl.abort()
  }, [tries])

  return { levels, loading, error, retry: () => setTries((n) => n + 1) }
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
  { id: 'difficulty', label: 'Hardest' },
  { id: 'enjoyment', label: 'Enjoyment' },
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

/** GDDP tier always with two decimals: 19.22 */
const fmtTier = (n: number) => n.toFixed(2)

/**
 * Hardest first:
 *  1. difficulty (Extreme > Insane > ...)
 *  2. inside Extreme, the AREDL position (#1 is the hardest; levels not on the list come after)
 *  3. otherwise (or on a tie) the GDDP tier, higher = harder
 */
function hardest(a: LevelItem, b: LevelItem) {
  const d = DIFFICULTIES.indexOf(b.demonDifficulty) - DIFFICULTIES.indexOf(a.demonDifficulty)
  if (d) return d
  if (a.demonDifficulty === 'Extreme') {
    const r = (a.aredlRank ?? 1e9) - (b.aredlRank ?? 1e9)
    if (r) return r
  }
  return (b.gddpTier ?? 0) - (a.gddpTier ?? 0) || a.name.localeCompare(b.name)
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
@keyframes gl-sheen { from { transform: translateX(-160%) skewX(-18deg) } to { transform: translateX(380%) skewX(-18deg) } }
@keyframes gl-fill-wave { to { background-position: -150% 0 } }
@keyframes gl-shimmer { from { background-position: 0% 50% } to { background-position: 100% 50% } }
.gl-rise { animation: gl-rise .55s cubic-bezier(.2, .8, .2, 1) both }
.gl-grow { transform-origin: left; animation: gl-grow .9s cubic-bezier(.2, .8, .2, 1) both }
.gl-float { animation: gl-float 5s ease-in-out infinite }
.gl-fill { background-color: rgba(255,255,255,.075); background-image: linear-gradient(100deg, transparent 20%, rgba(103,232,249,.22) 40%, rgba(196,181,253,.42) 50%, rgba(103,232,249,.22) 60%, transparent 80%); background-size: 250% 100%; background-repeat: no-repeat; background-position: 150% 0; animation: gl-fill-wave 1.7s ease-in-out infinite; animation-delay: var(--d, 0s) }
.gl-wave { position: relative; overflow: hidden }
.gl-sheen { animation: gl-sheen 3.2s ease-in-out infinite }
.gl-shimmer { background-size: 200% 100%; animation: gl-shimmer 5s ease-in-out infinite alternate }
html { scrollbar-width: thin; scrollbar-color: #7c5cff #070b0e }
html::-webkit-scrollbar { width: 12px }
html::-webkit-scrollbar-track { background: #070b0e }
html::-webkit-scrollbar-thumb { background: linear-gradient(#22d3ee, #8b5cf6, #ec4899); border-radius: 999px; border: 3px solid #070b0e }
html::-webkit-scrollbar-thumb:hover { filter: brightness(1.25) }
@media (prefers-reduced-motion: reduce) { .gl-rise, .gl-grow, .gl-float, .gl-shimmer, .gl-sheen { animation: none !important } }
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
  
  // 👇 THE FALLBACK: If the difficulty isn't found, use 'Easy'
  const style = DIFF_STYLE[level.demonDifficulty] || DIFF_STYLE['Easy'];

  return (
    <div className={`overflow-hidden bg-gradient-to-br ${style.hue} ${className ?? ''}`}>
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

const TIER_ACCENT: Record<Tier, string> = {
  rated: '#94a3b8',
  featured: '#facc15',
  epic: '#fb923c',
  legendary: '#f472b6',
  mythic: '#22d3ee',
}
const BEATEN_ACCENT = '#34d399'
const accentOf = (l: LevelItem) => (isBeaten(l) ? BEATEN_ACCENT : TIER_ACCENT[toTier(l.rating)])

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

/** Every top-10 place has its own colour AND its own shape, so #2 never looks like #9. */
const CLIP = {
  shield: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)',
  octagon: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)',
  pentagon: 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)',
  hexFlat: 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%)',
  diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
  hexPointy: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
  circle: 'circle(50% at 50% 50%)',
  squircle: 'inset(0 round 30%)',
} as const

// a = light rim, b = main colour, c = dark core
const TOP10: { a: string; b: string; c: string; shape: keyof typeof CLIP }[] = [
  { a: '#fef08a', b: '#f59e0b', c: '#92400e', shape: 'shield' }, // 1  gold
  { a: '#f8fafc', b: '#94a3b8', c: '#475569', shape: 'shield' }, // 2  silver
  { a: '#fed7aa', b: '#ea580c', c: '#7c2d12', shape: 'shield' }, // 3  bronze
  { a: '#a5f3fc', b: '#06b6d4', c: '#155e75', shape: 'octagon' }, // 4
  { a: '#c7d2fe', b: '#6366f1', c: '#312e81', shape: 'pentagon' }, // 5
  { a: '#e9d5ff', b: '#a855f7', c: '#581c87', shape: 'hexFlat' }, // 6
  { a: '#fbcfe8', b: '#ec4899', c: '#831843', shape: 'diamond' }, // 7
  { a: '#fecdd3', b: '#f43f5e', c: '#881337', shape: 'circle' }, // 8
  { a: '#a7f3d0', b: '#10b981', c: '#064e3b', shape: 'hexPointy' }, // 9
  { a: '#d9f99d', b: '#84cc16', c: '#365314', shape: 'squircle' }, // 10
]
const SIZE_ROW = [52, 50, 48, 44, 44, 44, 42, 42, 42, 42]
const SIZE_CARD = [38, 36, 34, 32, 32, 32, 30, 30, 30, 30]

function Medal({ rank, size }: { rank: number; size: number }) {
  const t = TOP10[rank - 1]
  const clip = CLIP[t.shape]
  const fs = Math.round(size * (rank === 10 ? 0.36 : t.shape === 'diamond' ? 0.38 : 0.46))
  const rim = Math.max(2, Math.round(size * 0.08))
  return (
    <span
      title={`Number ${rank} in this list`}
      className="relative z-10 inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size, filter: `drop-shadow(0 0 ${rank <= 3 ? 10 : 6}px ${t.b}aa) drop-shadow(0 2px 3px rgba(0,0,0,.6))` }}
    >
      <span className="absolute inset-0" style={{ clipPath: CLIP[t.shape], background: `linear-gradient(135deg, ${t.a}, ${t.b} 55%, ${t.c})` }} />
      <span className="absolute overflow-hidden" style={{ inset: rim, clipPath: clip, background: `linear-gradient(165deg, ${t.b}, ${t.c})` }}>
        <span className="absolute inset-x-0 top-0 h-1/2" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,.38), rgba(255,255,255,0))' }} />
        {rank <= 3 && <span className="gl-sheen absolute inset-y-0 left-0 w-1/3" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.6), transparent)' }} />}
      </span>
      <span
        className="relative font-heading font-extrabold leading-none tabular-nums text-white"
        style={{ fontSize: fs, paddingBottom: t.shape === 'shield' ? size * 0.08 : 0, textShadow: '0 1px 0 rgba(0,0,0,.6), 0 0 6px rgba(0,0,0,.35)' }}
      >
        {rank}
      </span>
      {rank === 1 && (
        <Crown
          className="absolute left-1/2 -translate-x-1/2 fill-yellow-300 text-yellow-100"
          style={{ top: -size * 0.24, width: size * 0.44, height: size * 0.44, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.65))' }}
        />
      )}
    </span>
  )
}

function RankBadge({ rank, variant }: { rank: number; variant: 'card' | 'row' }) {
  const title = `Number ${rank} in this list`
  if (rank <= 10) {
    const size = (variant === 'card' ? SIZE_CARD : SIZE_ROW)[rank - 1]
    // rows: a fixed-width slot, so the pictures stay in one column even though the medals differ in size
    return variant === 'row' ? (
      <span className="relative z-10 grid w-[52px] shrink-0 place-items-center">
        <Medal rank={rank} size={size} />
      </span>
    ) : (
      <Medal rank={rank} size={size} />
    )
  }
  if (variant === 'card') {
    return (
      <span title={title} className="relative z-10 flex h-6 min-w-7 items-center justify-center rounded-md border border-white/15 bg-black/55 px-1.5 font-heading text-[11px] font-extrabold tabular-nums text-slate-200 backdrop-blur-md">
        <span className="opacity-60">#</span>
        {rank}
      </span>
    )
  }
  return (
    <span title={title} className={`relative z-10 grid w-[52px] shrink-0 place-items-center`}>
      <span className={`grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] font-heading font-extrabold tabular-nums text-slate-300 ${rank >= 100 ? 'text-xs' : 'text-sm'}`}>{rank}</span>
    </span>
  )
}

/** The AREDL position, drawn like the in-game mod: a dark red-brown rounded square with the number, next to the demon face. */
function AredlBadge({ level, size = 'md', className = '' }: { level: LevelItem; size?: 'sm' | 'md'; className?: string }) {
  if (level.demonDifficulty !== 'Extreme' || level.aredlRank == null) return null
  const pts = level.aredlPoints != null ? ` · ${level.aredlPoints.toLocaleString('en-US', { maximumFractionDigits: 2 })} points` : ''
  return (
    <span
      title={`AREDL position #${level.aredlRank}${pts}`}
      className={`absolute z-10 grid place-items-center rounded-lg border font-heading font-extrabold leading-none tabular-nums text-white ${size === 'sm' ? 'h-6 min-w-6 px-1 text-[11px]' : 'h-8 min-w-8 px-1.5 text-base'} ${className}`}
      style={{
        background: 'linear-gradient(160deg, #b45309 0%, #7c2d12 45%, #3b0d0d 100%)',
        borderColor: 'rgba(253,186,116,.6)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), inset 0 -2px 0 rgba(0,0,0,.4), 0 3px 10px rgba(0,0,0,.65)',
        textShadow: '0 1px 0 #000, 0 0 4px #000',
      }}
    >
      {level.aredlRank}
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

/** GDDP tier with two decimals. (The AREDL position is the badge next to the face.) */
function RatingChips({ level }: { level: LevelItem }) {
  if (level.gddpTier == null) return null
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-md border border-violet-400/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-100 backdrop-blur-md" title="GDDP tier">
      <Gauge className="size-3" />
      {fmtTier(level.gddpTier)}
    </span>
  )
}

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
    <div className="gl-rise" style={{ animationDelay: `${delay}ms` }}>
      <Link
        href={`/levels/${level.id}`}
        className="group relative block aspect-[16/10] min-h-[220px] w-full rounded-2xl border border-white/10 bg-[#0a1015] transition duration-300 hover:-translate-y-1.5"
        style={beaten ? { borderColor: `${accent}66`, boxShadow: `0 0 40px -20px ${accent}` } : undefined}
      >
        <HoverGlow accent={accent} />

        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <Thumb level={level} className="h-full w-full" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}33, transparent 55%)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b0e] via-[#070b0e]/30 to-[#070b0e]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b0e]/70 via-[#070b0e]/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50" title={`Best ${level.progress}%`}>
            <div
              className="gl-grow h-full rounded-r-full"
              style={{ width: `${Math.min(100, level.progress)}%`, background: `linear-gradient(to right, ${accent}66, ${accent})`, boxShadow: `0 0 12px ${accent}` }}
            />
          </div>
        </div>

        <div className="absolute right-3 top-1/2 z-[5] size-28 -translate-y-[55%] transition duration-500 group-hover:scale-110 sm:size-32">
          <Face difficulty={level.demonDifficulty} tier={tier} className={`pointer-events-none size-full object-contain ${ts.glow}`} />
          <AredlBadge level={level} className="-left-3 bottom-4" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-4 pb-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <RankBadge rank={rank} variant="card" />
              <StatusBadge st={st} />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {live && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Playing
                </span>
              )}
              <RatingChips level={level} />
            </div>
          </div>

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

        <Thumb
          level={level}
          className="pointer-events-none absolute inset-0 opacity-[0.15] blur-[6px] scale-110 transition duration-700 group-hover:opacity-30 group-hover:blur-sm group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1015]/95 via-[#0a1015]/80 to-[#0a1015]/20 pointer-events-none" />

        <span className="absolute inset-y-0 left-0 w-1 z-10" style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}33)` }} aria-hidden="true" />

        <div className="relative z-10 flex min-w-0 items-center gap-3 md:contents">
          <RankBadge rank={rank} variant="row" />

          <div className="relative hidden h-16 w-32 shrink-0 overflow-hidden rounded-xl sm:block border border-white/10 shadow-lg">
            <Thumb level={level} className="h-full w-full" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}33, transparent 60%)` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>

          <div className="relative shrink-0">
            <Face difficulty={level.demonDifficulty} tier={tier} className={`size-14 object-contain ${ts.glow}`} />
            <AredlBadge level={level} size="sm" className="-left-2.5 bottom-0" />
          </div>

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
              <RatingChips level={level} />
            </div>
          </div>

          <div className="shrink-0 text-right font-heading text-4xl font-extrabold leading-none tabular-nums md:hidden drop-shadow-lg" style={percentStyle(accent)}>
            {level.progress}%
          </div>
        </div>

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

        <div className="relative z-10 hidden w-52 shrink-0 md:block">
          <BestBar value={level.progress} delay={index * 35} accent={accent} />
        </div>

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
            {level.gddpTier != null ? fmtTier(level.gddpTier) : '—'}
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

/** Big completion ring for the hero: how many of your levels are beaten. */
function CompletionRing({ beaten, total }: { beaten: number; total: number }) {
  const id = useId()
  const pct = total ? (beaten / total) * 100 : 0
  const v = useCountUp(pct)
  const r = 56
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-40 shrink-0">
      <div className="absolute inset-4 rounded-full bg-violet-500/25 blur-2xl" aria-hidden="true" />
      <svg viewBox="0 0 140 140" className="relative size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="66" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="2" strokeDasharray="1 6.2" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(100, v)) / 100} ${c}`}
          style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,.7))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-heading text-4xl font-extrabold tabular-nums text-white">
          <Num value={beaten} />
        </span>
        <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">of {total} beaten</span>
        <span className="mt-2 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-cyan-200">{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

/** Placeholders with the same shape as the real card and row, shown until the levels arrive. */
function SkeletonCard({ index }: { index: number }) {
  return (
    <div className="gl-rise" style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, '--d': `${(index % 3) * 0.22}s` } as CSSProperties}>
      <div className="gl-wave relative aspect-[16/10] min-h-[220px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a1015]/80">
        <div className="gl-fill absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b0e] via-[#070b0e]/30 to-transparent" />
        <div className="absolute right-4 top-1/2 size-24 -translate-y-[55%] rounded-full bg-white/[0.05] blur-[1px] sm:size-28" />
        <div className="relative flex h-full flex-col justify-between p-4 pb-5">
          <div className="flex items-center gap-2">
            <span className="gl-fill h-6 w-8 rounded-md" />
            <span className="gl-fill h-6 w-24 rounded-md" />
          </div>
          <div className="space-y-2">
            <span className="gl-fill block h-6 w-3/5 rounded-md" />
            <span className="gl-fill block h-3.5 w-2/5 rounded-md" />
          </div>
          <div className="space-y-2">
            <span className="gl-fill block h-10 w-24 rounded-lg" />
            <span className="gl-fill block h-3 w-40 rounded-md" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50" />
      </div>
    </div>
  )
}

function SkeletonRow({ index }: { index: number }) {
  return (
    <div className="gl-rise" style={{ animationDelay: `${Math.min(index, 8) * 50}ms`, '--d': `${index * 0.12}s` } as CSSProperties}>
      <div className="gl-wave flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0a1015]/80 py-3 pl-5 pr-4 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 items-center gap-3 md:contents">
          <span className="gl-fill size-11 shrink-0 rounded-xl" />
          <span className="gl-fill hidden h-16 w-32 shrink-0 rounded-xl sm:block" />
          <span className="gl-fill size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="gl-fill block h-5 w-2/5 rounded-md" />
            <span className="gl-fill block h-3.5 w-1/4 rounded-md" />
            <span className="gl-fill block h-4 w-20 rounded-md" />
          </div>
          <span className="gl-fill h-9 w-16 shrink-0 rounded-lg md:hidden" />
        </div>
        <span className="gl-fill h-2 rounded-full md:hidden" />
        <span className="gl-fill hidden h-2 w-52 shrink-0 rounded-full md:block" />
        <div className="hidden w-24 shrink-0 flex-col gap-2 xl:flex">
          <span className="gl-fill block h-3.5 w-16 rounded-md" />
          <span className="gl-fill block h-3.5 w-12 rounded-md" />
        </div>
        <span className="gl-fill hidden h-9 w-[4.5rem] shrink-0 rounded-lg md:block" />
      </div>
    </div>
  )
}

const FIRST_PAGE = 15 // cards shown at first
const PAGE_SIZE = 12 // cards added by each "Show more"

export default function LevelsPage() {
  const { levels, loading, error, retry } = useLevels()

  const [query, setQuery] = useState('')
  const [diffs, setDiffs] = useState<Difficulty[]>([])
  const [status, setStatus] = useState<StatusId>('beaten')
  const [sort, setSort] = useState<SortId>('difficulty')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [visible, setVisible] = useState(FIRST_PAGE)
  const [sortOpen, setSortOpen] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const toolbarRef = useRef<HTMLElement>(null)
  const [showJump, setShowJump] = useState(false)
  // While you search, the status filter steps aside (search looks in ALL levels). Clearing the search brings it back.
  const queryRef = useRef('')
  const statusRef = useRef<StatusId>('beaten')
  const savedStatus = useRef<StatusId | null>(null)
  statusRef.current = status
  const updateQuery = useCallback((v: string) => {
    const was = queryRef.current.trim() !== ''
    const has = v.trim() !== ''
    queryRef.current = v
    setQuery(v)
    if (!was && has) {
      savedStatus.current = statusRef.current
      setStatus('all')
    } else if (was && !has && savedStatus.current) {
      const back = savedStatus.current
      savedStatus.current = null
      setStatus(back)
    }
  }, [])
  const diffRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      const s = localStorage.getItem('gd-levels-sort-v2') as SortId | null
      const v = localStorage.getItem('gd-levels-view') as 'grid' | 'list' | null
      if (s && SORTS.some((x) => x.id === s)) setSort(s)
      if (v === 'grid' || v === 'list') setView(v)
    } catch { }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('gd-levels-sort-v2', sort)
      localStorage.setItem('gd-levels-view', view)
    } catch { }
  }, [sort, view])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape' && el === searchRef.current) {
        updateQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [updateQuery])

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

  useEffect(() => setVisible(FIRST_PAGE), [query, diffs, status, sort])

  // the jump buttons appear once you have scrolled down a bit
  useEffect(() => {
    const onScroll = () => setShowJump(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
      difficulty: hardest,
      enjoyment: (a, b) => (b.enjoyment ?? -1) - (a.enjoyment ?? -1),
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
    const s: Record<StatusId, number> = {
      all: levels.length,
      beaten: levels.filter(isBeaten).length,
      progress: levels.filter((l) => !isBeaten(l) && !isFresh(l)).length,
      fresh: levels.filter(isFresh).length,
    }
    return { d, t, s }
  }, [levels])

  const resume = useMemo(
    () => [...levels].filter((l) => l.lastPlayedAt && !isBeaten(l)).sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())[0],
    [levels],
  )

  // beaten / total for each difficulty, hardest first
  const ladder = useMemo(
    () =>
      [...DIFFICULTIES].reverse().map((d) => {
        const all = levels.filter((l) => l.demonDifficulty === d)
        return { d, total: all.length, beaten: all.filter(isBeaten).length }
      }),
    [levels],
  )

  const activeFilters = diffs.length + (status !== 'all' ? 1 : 0) + (query.trim() ? 1 : 0)
  const reset = () => {
    queryRef.current = ''
    savedStatus.current = null
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
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,.22) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage: 'radial-gradient(ellipse 85% 55% at 50% 0%, #000 20%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 55% at 50% 0%, #000 20%, transparent 78%)',
          }}
        />
        <div className="absolute -left-32 -top-32 size-[34rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 size-[34rem] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 size-[34rem] rounded-full bg-pink-500/10 blur-3xl" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 p-4 md:p-6 xl:px-10">
          <header className="gl-rise relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0e1620]/90 via-[#0a1015]/80 to-[#0a1015]/70 p-5 backdrop-blur-xl sm:p-6">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-violet-600/15 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden="true" />

            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80">
                  <span className="h-px w-8 bg-gradient-to-r from-cyan-300 to-transparent" />
                  Demontrack
                  <span className="text-slate-600">/</span>
                  Practice log
                </div>
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

            {/* ring + numbers + where you left off */}
            <div className={`relative mt-6 grid items-center gap-5 ${resume || loading ? 'lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,26rem)]' : 'lg:grid-cols-[auto_minmax(0,1fr)]'}`}>
              <div className="grid place-items-center">
                {loading ? <span className="gl-fill size-40 rounded-full" /> : <CompletionRing beaten={stats.beaten} total={stats.total} />}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'In progress', value: <Num value={stats.inProgress} />, icon: <Flame className="size-5" />, tone: 'bg-orange-400/10 text-orange-300' },
                  { label: 'Not started', value: <Num value={counts.s.fresh} />, icon: <Play className="size-5" />, tone: 'bg-cyan-400/10 text-cyan-300' },
                  { label: 'Total attempts', value: <Num value={stats.attempts} />, icon: <Skull className="size-5" />, tone: 'bg-red-500/10 text-red-400' },
                  { label: 'Average best', value: <Num value={stats.avgBest} decimals={1} suffix="%" />, icon: <Gauge className="size-5" />, tone: 'bg-violet-400/10 text-violet-300' },
                ].map((st, i) => (
                  <div key={st.label} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5" style={{ '--d': `${i * 0.18}s` } as CSSProperties}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${st.tone}`}>{st.icon}</span>
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">{st.label}</div>
                      <div className="font-heading text-2xl font-extrabold tabular-nums text-white">{loading ? <span className="gl-fill mt-1 block h-6 w-14 rounded-md" /> : st.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="gl-wave h-[132px] rounded-2xl border border-white/10 bg-black/20" />
              ) : (
                resume && (
                  <Link
                    href={`/levels/${resume.id}`}
                    className="group relative flex h-full min-h-[132px] flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 p-4 transition duration-300 hover:border-cyan-400/50"
                  >
                    <Thumb level={resume} className="pointer-events-none absolute inset-0 opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a1015] via-[#0a1015]/80 to-[#0a1015]/30" />
                    <div className="relative flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                        <Crosshair className="size-3.5" /> Continue
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400" suppressHydrationWarning>
                        {relativeTime(resume.lastPlayedAt, now) || ' '}
                      </span>
                    </div>
                    <div className="relative flex items-center gap-3">
                      <Face difficulty={resume.demonDifficulty} tier={toTier(resume.rating)} className={`gl-float size-14 shrink-0 object-contain ${TIER_STYLE[toTier(resume.rating)].glow}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-heading text-xl font-extrabold text-white">{resume.name}</div>
                        <div className="truncate text-xs text-slate-400">
                          Best <span className="font-bold text-white">{resume.progress}%</span> · {resume.totalAttempts.toLocaleString('en-US')} attempts
                        </div>
                      </div>
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.7)] transition group-hover:scale-110">
                        <ArrowRight className="size-5" />
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>

            <div className="relative mt-5 border-t border-white/[0.07] pt-5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                <Swords className="size-3.5 text-cyan-300" /> Demon ladder
                <span className="font-semibold normal-case tracking-normal text-slate-600">· tap one to filter</span>
              </div>
{/* demon ladder: beaten / total for each difficulty. Click one to filter by it. */}
  <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
    {loading
      ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="gl-wave h-[84px] min-w-[150px] shrink-0 rounded-2xl border border-white/10 bg-[#0a1015]/70 p-3 sm:min-w-0" style={{ '--d': `${i * 0.18}s` } as CSSProperties}>
            <span className="gl-fill block size-12 rounded-full" />
          </div>
        ))
      : ladder.map(({ d, total, beaten }, i) => {
          const on = diffs.includes(d)
          const pct = total ? (beaten / total) * 100 : 0
          const c = DIFF_COLOR[d]
          return (
            <button
              key={d}
              onClick={() => setDiffs((x) => toggle(x, d))}
              aria-pressed={on}
              title={on ? `Showing ${d} only. Click to remove.` : `Show only ${d}`}
              className={`${panel} gl-rise group relative min-w-[150px] shrink-0 overflow-hidden p-3 text-left transition duration-300 hover:-translate-y-0.5 sm:min-w-0`}
              style={{ animationDelay: `${i * 60}ms`, borderColor: on ? c : undefined, boxShadow: on ? `0 0 0 1px ${c}, 0 10px 30px -14px ${c}` : undefined }}
            >
              <span className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-25 blur-2xl transition duration-300 group-hover:opacity-50" style={{ background: c }} aria-hidden="true" />
              <div className="relative flex items-center gap-3">
                <Face difficulty={d} tier="rated" className="size-12 shrink-0 object-contain transition duration-300 group-hover:scale-110" />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{d}</div>
                  <div className="font-heading text-xl font-extrabold tabular-nums text-white">
                    {beaten}
                    <span className="text-sm font-bold text-slate-500"> / {total}</span>
                  </div>
                </div>
              </div>
              <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="gl-grow h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${c}66, ${c})`, boxShadow: `0 0 10px ${c}`, animationDelay: `${i * 80}ms` }} />
              </div>
            </button>
          )
        })}
  </div>
            </div>
          </header>

          <section ref={toolbarRef} aria-busy={loading} className={`${panel} relative z-20 flex scroll-mt-4 flex-col gap-3 p-3 transition-opacity duration-300 sm:p-4 ${loading ? 'pointer-events-none select-none opacity-50' : ''}`}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="relative order-1 basis-full sm:basis-auto sm:min-w-[220px] sm:flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => updateQuery(e.target.value)}
                  placeholder="Search name, creator or ID"
                  aria-label="Search levels"
                  className="h-11 w-full rounded-xl border border-slate-800 bg-white/[0.03] pl-10 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
                {query ? (
                  <button onClick={() => updateQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-white/10 hover:text-white">
                    <X className="size-4" />
                  </button>
                ) : (
                  <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:block">/</kbd>
                )}
              </div>

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

            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {STATUSES.map((s) => (
                <Chip key={s.id} active={status === s.id} onClick={() => {
                    savedStatus.current = null
                    setStatus(s.id)
                  }} count={loading ? undefined : counts.s[s.id]}>
                  {s.label}
                </Chip>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3 text-sm">
              <span className="text-slate-400">
                {loading ? (
                  <span className="gl-fill inline-block h-4 w-28 rounded-md align-middle" />
                ) : (
                  <>
                    <span className="font-bold tabular-nums text-white">{filtered.length}</span> of {levels.length} levels
                  </>
                )}
              </span>
              {activeFilters > 0 && (
                <button onClick={reset} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/10">
                  <RotateCcw className="size-3.5" />
                  Reset {activeFilters}
                </button>
              )}
            </div>
          </section>

          {loading ? (
            <div aria-busy="true" aria-label="Loading levels">
              {view === 'grid' ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} index={i} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <SkeletonRow key={i} index={i} />
                  ))}
                </div>
              )}
            </div>
          ) : error && levels.length === 0 ? (
            <div className={`${panel} flex flex-col items-center gap-3 p-12 text-center`}>
              <span className="grid size-14 place-items-center rounded-2xl bg-red-500/10 text-red-400">
                <AlertTriangle className="size-6" />
              </span>
              <h2 className="font-heading text-xl font-extrabold text-white">Could not load your levels</h2>
              <p className="max-w-sm text-sm text-slate-400">The server did not answer. Check that the backend is running, then try again.</p>
              <button onClick={retry} className="mt-1 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-4 py-2 text-sm font-bold text-white">
                Try again
              </button>
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

      {/* jump buttons: show after you scroll down */}
      <div
        className={`fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 transition duration-300 sm:bottom-6 sm:right-6 ${showJump ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!showJump}
      >
        <button
          type="button"
          tabIndex={showJump ? 0 : -1}
          onClick={() => {
            toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 450)
          }}
          className="flex h-11 items-center gap-2 rounded-full border border-white/15 bg-[#0d141a]/90 px-4 text-sm font-bold text-slate-200 shadow-xl backdrop-blur-xl transition hover:border-cyan-400/50 hover:text-cyan-200"
        >
          <SlidersHorizontal className="size-4 text-cyan-300" />
          Filters
        </button>
        <button
          type="button"
          tabIndex={showJump ? 0 : -1}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top"
          className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 text-white shadow-[0_8px_30px_-6px_rgba(139,92,246,0.8)] transition hover:scale-105"
        >
          <ArrowUp className="size-5" />
        </button>
      </div>
    </div>
  )
}