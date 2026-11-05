"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crosshair,
  Crown,
  Flame,
  Gauge,
  LayoutGrid,
  List,
  Play,
  RotateCcw,
  Search,
  Skull,
  Sparkles,
  Star,
  Swords,
  Trophy,
  X,
} from 'lucide-react'

/* ============================================================================
 *  GD TRACKER · /levels   (app/levels/page.tsx)
 *  ----------------------------------------------------------------------------
 *  One big file on purpose: easy to paste and easy to search. Every section is
 *  marked "SPLIT →" with the file it can move to, using the folders you already
 *  have. To split: cut the section, paste it into the new file, add `export`
 *  in front of it, and import it back here. The code itself does not change.
 *
 *  ORDER IN THIS FILE                     →  WHERE IT CAN GO
 *   1. Types                               →  lib/levels-types.ts
 *   2. useLevels()  (data + AREDL)         →  lib/use-levels.ts
 *   3. Style tables, SORTS, STATUSES       →  lib/levels-config.ts
 *   4. Helpers (pure functions)            →  lib/level-helpers.ts   (you already have it: merge, don't duplicate)
 *   5. useCountUp / Num                    →  components/ui/num.tsx
 *   6. BRAND, GREEN and the CSS string     →  lib/levels-config.ts (or app/globals.css)
 *   7. Cut, Face, Thumb                    →  components/level/cut.tsx, face.tsx
 *   8. Badges, Logo, small card parts      →  components/level/card-parts.tsx, components/ui/logo.tsx
 *   9. LevelCard / LevelRow                →  components/tracker/levels-card.tsx, levels-row.tsx
 *                                             (level-card.tsx already exists: use a different name)
 *  10. SkeletonCard / SkeletonRow          →  components/tracker/levels-skeleton.tsx
 *  11. ProgressRing + TargetBanner         →  components/tracker/target-banner.tsx
 *  12. Pager + MiniPager                   →  components/ui/pager.tsx
 *  13. Saved-state helpers                 →  lib/levels-state.ts
 *  14. LevelsPage (state, effects, JSX)    →  stays in app/levels/page.tsx, and gets short once the rest is moved.
 *      Its JSX blocks can also become: levels-masthead, levels-stats, levels-ladder,
 *      levels-toolbar and levels-slim-bar (all in components/tracker/).
 *
 *  IF THE WORK IS SPLIT BETWEEN PEOPLE (no two people touch the same file):
 *   - Data / backend ........ 1, 2, 4, 13   (what the API sends, caching, saved state)
 *   - Visual design ......... 3, 5, 6, 7, 8, 9, 10, 11   (colours, cards, logo, animations)
 *   - Navigation / filters .. 12 + the toolbar and slim-bar blocks of 14   (search, sort, pages)
 * ============================================================================ */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

// SPLIT → lib/levels-types.ts (add `export` to each). The shapes of the data that /api/Levels sends.
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
  /** From the backend (IsRated / IsTracked). If your /api/Levels does not send them they stay undefined. */
  isRated?: boolean
  isTracked?: boolean
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

// SPLIT → lib/use-levels.ts (put "use client" at its top).
// useLevels(): loads the levels once and keeps them in LEVELS_CACHE, so coming Back from a level is instant.
// It refreshes quietly in the background and merges the AREDL position/points into Extreme demons.
// Returns { levels, loading, error, retry }.
const AREDL_URL = 'https://api.aredl.net/v2/api/aredl/levels'

/**
 * The levels stay in memory while you move around the app (a normal link click does not reload the page's JavaScript),
 * so coming Back shows the list at once instead of the loading screen. A fresh copy is fetched quietly in the background.
 */
let LEVELS_CACHE: LevelItem[] | null = null

function useLevels() {
  const [levels, setLevels] = useState<LevelItem[]>(() => LEVELS_CACHE ?? [])
  const [loading, setLoading] = useState(() => !LEVELS_CACHE)
  const [error, setError] = useState(false)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()

    async function fetchLevels() {
      if (!LEVELS_CACHE) setLoading(true) // with a cached list we refresh quietly
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
            isRated: typeof l.isRated === 'boolean' ? l.isRated : undefined,
            isTracked: typeof l.isTracked === 'boolean' ? l.isTracked : undefined,
            aredlRank: l.aredlRank ?? l.aredlPosition ?? null,
            aredlPoints: l.aredlPoints ?? null,
            totalSeconds: l.totalSeconds || null,
            bestAt: l.bestAt || null,
          }
        })

        // keep the AREDL values we already know, so the badges do not blink while refreshing
        const old = new Map((LEVELS_CACHE ?? []).map((x) => [x.id, x]))
        const merged = cleanData.map((l) => {
          const o = old.get(l.id)
          return o && l.aredlRank == null && o.aredlRank != null ? { ...l, aredlRank: o.aredlRank, aredlPoints: o.aredlPoints } : l
        })
        LEVELS_CACHE = merged
        setLevels(merged)

        // Extreme levels without AREDL values: ask AREDL directly (one request, matched by level id).
        // If this fails, the page still works, the AREDL chips just do not show.
        if (merged.some((l) => l.demonDifficulty === 'Extreme' && l.aredlRank == null)) {
          try {
            const r = await fetch(AREDL_URL, { signal: ctrl.signal })
            if (r.ok) {
              const list: any[] = await r.json()
              const byId = new Map<number, { rank: number | null; points: number | null }>()
              for (const x of Array.isArray(list) ? list : []) {
                const id = Number(x.level_id ?? x.levelId)
                if (Number.isFinite(id)) byId.set(id, { rank: x.position ?? null, points: x.points ?? null })
              }
              setLevels((prev) => {
                const next = prev.map((l) => {
                  const hit = l.demonDifficulty === 'Extreme' && l.aredlRank == null ? byId.get(l.id) : undefined
                  return hit ? { ...l, aredlRank: hit.rank, aredlPoints: hit.points } : l
                })
                LEVELS_CACHE = next
                return next
              })
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

// SPLIT → lib/levels-config.ts.
// Colours and labels per rating tier (rated/featured/epic/legendary/mythic) and per difficulty,
// plus SORTS (the sort menu) and STATUSES (the All / In progress / Beaten / Not started tabs).
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

// SPLIT → lib/level-helpers.ts (you already have this file: merge it in, do not duplicate).
// Pure functions with no React: is it beaten, the "hardest" ordering, durations, "x min ago", the status label.
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

// SPLIT → components/ui/num.tsx. <Num/> shows a number that counts up from 0 when it appears (hero stats, rings).
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

// SPLIT → lib/levels-config.ts.
// BRAND = the lime accent of the page, GREEN = hover/progress colour on cards.
// CSS = all the animations (rise-in, skeleton wave, tilt, ...). You can move that text to app/globals.css and delete the <style> tag.
const BRAND = '#d4ff3a'
/** Hover glow, borders and progress on the level cards and rows. */
const GREEN = '#34d399'

const CSS = `
@keyframes gl-rise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
@keyframes gl-grow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes gl-tick { from { transform: scaleY(.15) } }
@keyframes gl-sheen { from { transform: translateX(-160%) skewX(-18deg) } to { transform: translateX(380%) skewX(-18deg) } }
@keyframes gl-spin { to { transform: rotate(360deg) } }
@keyframes gl-fill-wave { to { background-position: -150% 0 } }
.gl-rise { animation: gl-rise .55s cubic-bezier(.2, .8, .2, 1) both }
.gl-grow { transform-origin: left; animation: gl-grow .9s cubic-bezier(.2, .8, .2, 1) both }
.gl-tick { transform-origin: bottom; animation: gl-tick .45s cubic-bezier(.2, .8, .2, 1) both }
.gl-sheen { animation: gl-sheen 3.2s ease-in-out infinite }
.gl-spin { animation: gl-spin 26s linear infinite }
.gl-tilt { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform .18s ease-out, box-shadow .3s }
.gl-tilt:hover { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-6px) }
.gl-lift { transition: transform .3s cubic-bezier(.2, .8, .2, 1), filter .3s }
.gl-lift:hover { transform: translateY(-4px); filter: drop-shadow(0 16px 20px color-mix(in srgb, var(--ac, #d4ff3a) 32%, transparent)) }
.gl-fill { background-color: rgba(255,255,255,.075); background-image: linear-gradient(100deg, transparent 20%, rgba(212,255,58,.16) 40%, rgba(212,255,58,.34) 50%, rgba(212,255,58,.16) 60%, transparent 80%); background-size: 250% 100%; background-repeat: no-repeat; background-position: 150% 0; animation: gl-fill-wave 1.7s ease-in-out infinite; animation-delay: var(--d, 0s) }
.gl-wave { position: relative; overflow: hidden }
html { scrollbar-width: thin; scrollbar-color: #d4ff3a #08090b }
html::-webkit-scrollbar { width: 12px }
html::-webkit-scrollbar-track { background: #08090b }
html::-webkit-scrollbar-thumb { background: #d4ff3a; border: 3px solid #08090b }
html::-webkit-scrollbar-thumb:hover { filter: brightness(1.15) }
@media (prefers-reduced-motion: reduce) { .gl-rise, .gl-grow, .gl-tick, .gl-sheen, .gl-spin { animation: none !important } .gl-lift { transition: none } .gl-tilt, .gl-tilt:hover { transform: none } }
`

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

// SPLIT → components/level/cut.tsx. <Cut/> is the panel with angled corners used by the stats, the ladder and the banner.
/** Panel with cut (angled) corners and a 1px border. The border colour is the CSS variable --bd, so hover can change it. */
const poly = (c: number) => `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`

function Cut({ c = 14, bd = 'rgba(255,255,255,.1)', bg = '#0d1013', className = '', inner = '', children }: { c?: number; bd?: string; bg?: string; className?: string; inner?: string; children: ReactNode }) {
  return (
    <div className={`relative ${className}`} style={{ clipPath: poly(c), background: `var(--bd, ${bd})`, padding: 1 }}>
      <div className={`relative ${inner}`} style={{ clipPath: poly(Math.max(c - 1, 0)), background: bg }}>
        {children}
      </div>
    </div>
  )
}

// SPLIT → components/level/face.tsx (Face + Thumb).
// Face = the demon face image (falls back to the "rated" one if a file is missing). Thumb = the level thumbnail with a coloured fallback.
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


const TIER_ACCENT: Record<Tier, string> = {
  rated: '#94a3b8',
  featured: '#facc15',
  epic: '#fb923c',
  legendary: '#f472b6',
  mythic: '#22d3ee',
}
/** The card colour is the rating (rated, featured, ...). "Cleared" is shown by the status tag and a lime border. */
const accentOf = (l: LevelItem) => TIER_ACCENT[toTier(l.rating)]

const percentStyle = (accent: string): CSSProperties => ({
  backgroundImage: `linear-gradient(to bottom, #ffffff 15%, ${accent})`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
})

// SPLIT → components/level/card-parts.tsx (HoverGlow, TickBar, Medal, RankBadge, AredlBadge, StatusBadge, RatingChips, PlayingTag, Cell).
// Small decorations used inside the cards and rows: the top-10 medals, the AREDL number badge, the status tag, the GDDP chip.
function HoverGlow({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}88, 0 22px 50px -24px ${accent}` }}
    />
  )
}

/** Progress as a row of slanted ticks, filled ticks get brighter towards the end. */
function TickBar({ value, accent, n = 25, delay = 0, className = 'h-2.5' }: { value: number; accent: string; n?: number; delay?: number; className?: string }) {
  const v = Math.min(100, Math.max(0, value))
  const filled = v > 0 ? Math.max(1, Math.round((v / 100) * n)) : 0
  return (
    <div className="flex gap-[2px]" title={`Best ${v}%`} role="img" aria-label={`Best ${v}%`}>
      {Array.from({ length: n }, (_, i) => {
        const on = i < filled
        return (
          <span
            key={i}
            className={`flex-1 ${className} ${on ? 'gl-tick' : ''}`}
            style={{
              background: on ? accent : 'rgba(255,255,255,.08)',
              opacity: on ? 0.4 + 0.6 * (filled > 1 ? i / (filled - 1) : 1) : 1,
              clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
              animationDelay: `${delay + i * 14}ms`,
            }}
          />
        )
      })}
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
      <span title={title} className="relative z-10 inline-flex h-6 items-center bg-black/65 px-2 font-mono text-[11px] font-bold tabular-nums text-slate-200 backdrop-blur-md" style={{ clipPath: 'polygon(5px 0, 100% 0, 100% 100%, 0 100%, 0 5px)' }}>
        <span style={{ color: BRAND }}>#</span>
        {rank}
      </span>
    )
  }
  return (
    <span title={title} className="relative z-10 grid w-[52px] shrink-0 place-items-center">
      <span className="grid h-9 w-11 place-items-center border border-white/10 font-mono text-sm font-bold tabular-nums text-slate-400">{rank}</span>
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
    beaten: { cls: 'text-[#0b0d00]', bg: BRAND, icon: <Trophy className="size-3" />, label: 'Cleared' },
    best: { cls: 'text-[#1a1000]', bg: '#fcd34d', icon: <Sparkles className="size-3" />, label: st.label },
    progress: { cls: 'border border-white/25 text-slate-100', bg: 'rgba(0,0,0,.6)', icon: <Flame className="size-3" />, label: st.label },
    fresh: { cls: 'border border-white/10 text-slate-400', bg: 'rgba(0,0,0,.6)', icon: <Play className="size-3" />, label: st.label },
  }[st.kind]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md ${map.cls}`}
      style={{ background: map.bg, clipPath: 'polygon(5px 0, 100% 0, 100% 100%, 0 100%, 0 5px)' }}
      suppressHydrationWarning
    >
      {map.icon}
      {map.label}
      {st.sub && <span className="font-medium normal-case tracking-normal opacity-70">· {st.sub}</span>}
    </span>
  )
}

/** GDDP tier with two decimals. (The AREDL position is the badge next to the face.) */
function RatingChips({ level }: { level: LevelItem }) {
  if (level.gddpTier == null) return null
  return (
    <span className="inline-flex items-center gap-1 border border-violet-400/30 bg-black/60 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-violet-200 backdrop-blur-md" title="GDDP tier">
      <Gauge className="size-3" />
      {fmtTier(level.gddpTier)}
    </span>
  )
}

function PlayingTag() {
  return (
    <span className="inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md" style={{ borderColor: `${BRAND}80`, color: BRAND, background: 'rgba(0,0,0,.6)' }}>
      <span className="size-1.5 animate-pulse" style={{ background: BRAND }} />
      Live
    </span>
  )
}

// SPLIT → components/ui/logo.tsx (export it, then use it anywhere: header, slim bar, 404 page, emails).
// The GD monogram with a row of progress ticks under it (so the mark itself says "tracker"). Plain SVG: sharp at any size, no image file.
// Change the colours with the three values below (tile, letter G, letter D).
function Logo({ className = 'size-10' }: { className?: string }) {
  const tile = '#0d1013'
  const g = BRAND // the "G"
  const d = '#ffffff' // the "D"
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="GD Tracker logo">
      <path d="M22 0H178L200 22V178L178 200H22L0 178V22Z" fill={tile} />
      <path d="M22 0H178L200 22V178L178 200H22L0 178V22Z" fill="none" stroke={g} strokeWidth="3" opacity=".35" />
      {/* the letters */}
      <g transform="translate(0 -14)">
        <path d="M92 64H58Q42 64 42 80V120Q42 136 58 136H92V102H70" fill="none" stroke={g} strokeWidth="20" strokeLinejoin="miter" />
        <path d="M120 64H136Q164 64 164 100Q164 136 136 136H120Z" fill="none" stroke={d} strokeWidth="20" strokeLinejoin="miter" />
      </g>
      {/* progress ticks (the "tracker" part): 7 of 10 are filled, like the bars in the stats boxes */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={42 + i * 12.5} y="150" width="9.5" height="12" fill={g} opacity={i < 7 ? 1 : 0.22} />
      ))}
      <path d="M0 22V0H22M200 178V200H178" fill="none" stroke={g} strokeWidth="6" />
    </svg>
  )
}

function Cell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-l border-white/[0.08] pl-3 first:border-l-0 first:pl-0">
      <div className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="truncate font-mono text-sm font-bold tabular-nums text-slate-100">{value}</div>
    </div>
  )
}

// SPLIT → components/tracker/levels-card.tsx.
// The big full-art card of the grid view: art, rank, status, GDDP tier, percent, progress bar, 3D tilt on hover.
// (components/tracker/level-card.tsx already exists, so give this one another name.)
function LevelCard({ level, now, index, rank }: { level: LevelItem; now: number | null; index: number; rank: number }) {
  const tier = toTier(level.rating)
  const ts = TIER_STYLE[tier]
  const accent = accentOf(level)
  const live = isLive(level.lastPlayedAt, now)
  const st = statusOf(level, now)
  const delay = Math.min(index, 12) * 45
  const beaten = st.kind === 'beaten'
  const played = relativeTime(level.lastPlayedAt, now)

  // 3D tilt that follows the mouse (mouse only, not touch)
  const ref = useRef<HTMLAnchorElement>(null)
  const onMove = (e: ReactPointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${((0.5 - py) * 7).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${((px - 0.5) * 9).toFixed(2)}deg`)
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <div className="gl-rise" style={{ animationDelay: `${delay}ms` }}>
      <Link
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        href={`/levels/${level.id}`}
        className="gl-tilt group relative block aspect-[16/10] min-h-[220px] w-full rounded-2xl border border-white/10 bg-[#0a1015]"
        style={beaten ? { borderColor: `${GREEN}66`, boxShadow: `0 0 40px -20px ${GREEN}` } : undefined}
      >
        <HoverGlow accent={GREEN} />

        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <Thumb level={level} className="h-full w-full" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}33, transparent 55%)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b0e] via-[#070b0e]/30 to-[#070b0e]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b0e]/70 via-[#070b0e]/10 to-transparent" />
          {tier === 'mythic' && <div className="gl-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.26), transparent)' }} />}
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50" title={`Best ${level.progress}%`}>
            <div
              className="gl-grow h-full rounded-r-full"
              style={{ width: `${Math.min(100, level.progress)}%`, background: `linear-gradient(to right, ${GREEN}66, ${GREEN})`, boxShadow: `0 0 12px ${GREEN}` }}
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
              {live && <PlayingTag />}
              <RatingChips level={level} />
            </div>
          </div>

          <div className="max-w-[62%]">
            <h3
              className="line-clamp-2 font-heading text-2xl font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] transition-colors duration-300 group-hover:[color:var(--c)]"
              style={{ '--c': GREEN } as CSSProperties}
            >
              {level.name}
            </h3>
            <p className="truncate text-sm text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              by <span className="font-semibold text-white">{level.creator}</span>
            </p>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="font-heading text-5xl font-extrabold leading-none tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]" style={percentStyle(GREEN)}>
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

// SPLIT → components/tracker/levels-row.tsx. The list-view version of the card (one row per level).
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
    <div className="gl-rise" style={{ animationDelay: `${Math.min(index, 12) * 35}ms`, '--ac': GREEN } as CSSProperties}>
      <Link href={`/levels/${level.id}`} className="gl-lift group block">
        <Cut c={12} bd={beaten ? `${GREEN}66` : undefined} className="group-hover:[--bd:var(--ac)]" inner="flex flex-col gap-3 overflow-hidden py-3 pl-5 pr-4 md:flex-row md:items-center md:gap-4">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-[0.22] [mask-image:linear-gradient(to_left,#000,transparent)]">
            <Thumb level={level} className="h-full w-full" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden="true" />

          <div className="relative flex min-w-0 items-center gap-3 md:contents">
            <RankBadge rank={rank} variant="row" />

            <div className="relative hidden h-16 w-32 shrink-0 overflow-hidden sm:block" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}>
              <Thumb level={level} className="h-full w-full" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 30%, transparent), transparent 60%)` }} />
            </div>

            <div className="relative shrink-0">
              <Face difficulty={level.demonDifficulty} tier={tier} className={`size-14 object-contain ${ts.glow}`} />
              <AredlBadge level={level} size="sm" className="-left-2.5 bottom-0" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-heading text-base font-black uppercase tracking-tight text-white transition-colors duration-300 group-hover:[color:var(--ac)] sm:text-lg">{level.name}</h3>
                {live && <PlayingTag />}
              </div>
              <p className="truncate font-mono text-[11px] text-slate-500">
                by <span className="font-bold text-slate-300">{level.creator}</span>
                <span suppressHydrationWarning>{relativeTime(level.lastPlayedAt, now) ? ` · ${relativeTime(level.lastPlayedAt, now)}` : ''}</span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StatusBadge st={st} />
                <span className="2xl:hidden">
                  <RatingChips level={level} />
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right font-heading text-4xl font-black leading-none tabular-nums md:hidden" style={{ color: GREEN }}>
              {level.progress}%
            </div>
          </div>

          <div className="relative flex items-center gap-3 md:hidden">
            <div className="min-w-0 flex-1">
              <TickBar value={level.progress} accent={GREEN} n={20} delay={index * 35} className="h-2" />
            </div>
            <span className="shrink-0 font-mono text-xs tabular-nums text-slate-300">{tries} att</span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-slate-300">{length}</span>
          </div>

          <div className="relative hidden w-56 shrink-0 md:block">
            <TickBar value={level.progress} accent={GREEN} n={22} delay={index * 35} className="h-2.5" />
          </div>

          <div className="relative hidden w-28 shrink-0 flex-col gap-1 xl:flex">
            <Cell label="Attempts" value={tries} />
          </div>
          <div className="relative hidden w-24 shrink-0 flex-col gap-1 xl:flex">
            <Cell label="Length" value={length} />
          </div>
          <div className="relative hidden w-20 shrink-0 2xl:block">
            <Cell label="Enjoy" value={level.enjoyment != null ? level.enjoyment.toFixed(1) : '—'} />
          </div>
          <div className="relative hidden w-24 shrink-0 2xl:block">
            <Cell label="GDDP" value={level.gddpTier != null ? fmtTier(level.gddpTier) : '—'} />
          </div>

          <div className="relative hidden w-[5rem] shrink-0 text-right font-heading text-3xl font-black tabular-nums md:block" style={{ color: GREEN }}>
            {level.progress}%
          </div>
          <ArrowRight className="relative hidden size-4 shrink-0 text-slate-600 transition duration-300 group-hover:translate-x-1 group-hover:text-white md:block" />
        </Cut>
      </Link>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Loading placeholders                                                      */
/* -------------------------------------------------------------------------- */

// SPLIT → components/tracker/levels-skeleton.tsx (SkeletonCard + SkeletonRow).
// Placeholders with the same shape as the cards; the "wave" runs from left to right while the data loads.
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
      <Cut c={12} inner="flex flex-col gap-3 py-3 pl-5 pr-4 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 items-center gap-3 md:contents">
          <span className="gl-fill size-11 shrink-0" />
          <span className="gl-fill hidden h-16 w-32 shrink-0 sm:block" />
          <span className="gl-fill size-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="gl-fill block h-5 w-2/5" />
            <span className="gl-fill block h-3 w-1/4" />
            <span className="gl-fill block h-4 w-20" />
          </div>
          <span className="gl-fill h-9 w-16 shrink-0 md:hidden" />
        </div>
        <span className="gl-fill h-2 md:hidden" />
        <span className="gl-fill hidden h-2.5 w-56 shrink-0 md:block" />
        <div className="hidden w-28 shrink-0 xl:block">
          <span className="gl-fill block h-8 w-20" />
        </div>
        <span className="gl-fill hidden h-9 w-20 shrink-0 md:block" />
      </Cut>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

// SPLIT → lib/levels-state.ts (together with SavedState, readSavedState and readLocal further down).
// sessionStorage key where the page remembers filters, page and scroll position, so Back from a level lands in the same place.
const SAVE_KEY = 'gd-levels-state-v1' // sessionStorage: where you were in the list
// SPLIT → components/tracker/target-banner.tsx (ProgressRing + TargetBanner).
// The "Target lock" banner: the hardest level you have not beaten yet (rated + tracked) with a rotating reticle and a progress ring.
/** Round progress meter with a count-up number. */
function ProgressRing({ value, size = 112 }: { value: number; size?: number }) {
  const id = useId()
  const v = useCountUp(Math.min(100, Math.max(0, value)))
  const r = 44
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-3 rounded-full opacity-30 blur-xl" style={{ background: GREEN }} aria-hidden="true" />
      <svg viewBox="0 0 100 100" className="relative size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={GREEN} />
            <stop offset="100%" stopColor={BRAND} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-heading text-2xl font-black tabular-nums text-white">
        <span>
          {Math.round(v)}
          <span className="text-sm text-slate-400">%</span>
        </span>
      </div>
    </div>
  )
}

/** The big banner at the top: your hardest unbeaten level, with a rotating target reticle around the face. */
function TargetBanner({ level, now, onNavigate }: { level: LevelItem; now: number | null; onNavigate: () => void }) {
  const tier = toTier(level.rating)
  const accent = accentOf(level)
  const mono = 'font-mono text-[10px] font-bold uppercase tracking-[0.22em]'
  const chip = 'inline-flex items-center gap-1.5 border border-white/10 bg-black/40 px-2 py-1 font-mono text-[11px] font-bold tabular-nums text-slate-200'
  return (
    <Link href={`/levels/${level.id}`} onClickCapture={onNavigate} className="gl-lift group block" style={{ '--ac': BRAND } as CSSProperties}>
      <Cut c={24} className="group-hover:[--bd:var(--ac)]" inner="overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Thumb level={level} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1013] via-[#0d1013]/85 to-[#0d1013]/30" />
          <div className="absolute inset-0" style={{ background: `radial-gradient(60% 130% at 10% 50%, ${accent}2e, transparent 60%)` }} />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 8px)' }} />
        </div>
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: BRAND }} aria-hidden="true" />

        <div className="relative grid items-center gap-5 p-5 pl-7 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-6 sm:p-6 sm:pl-9">
          <div className="relative mx-auto grid size-32 place-items-center sm:mx-0 sm:size-40">
            <svg viewBox="0 0 100 100" className="gl-spin absolute inset-0 size-full" aria-hidden="true">
              <circle cx="50" cy="50" r="47" fill="none" stroke={BRAND} strokeOpacity=".55" strokeWidth=".8" strokeDasharray="2 4.2" />
              <circle cx="50" cy="50" r="41" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth=".6" strokeDasharray="14 9" />
            </svg>
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
              {[
                [50, 0, 50, 9],
                [50, 91, 50, 100],
                [0, 50, 9, 50],
                [91, 50, 100, 50],
              ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={BRAND} strokeWidth="1.4" />
              ))}
            </svg>
            <div className="relative size-24 transition duration-500 group-hover:scale-110 sm:size-28">
              <Face difficulty={level.demonDifficulty} tier={tier} className={`size-full object-contain ${TIER_STYLE[tier].glow}`} />
              <AredlBadge level={level} className="-left-3 bottom-2" />
            </div>
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <div className={`${mono} flex items-center justify-center gap-2 sm:justify-start`} style={{ color: BRAND }}>
              <Crosshair className="size-3.5" /> Target lock
              <span className="text-slate-600">//</span>
              <span className="text-slate-400">hardest unbeaten</span>
            </div>
            <h2 className="mt-2 truncate font-heading text-3xl font-black uppercase leading-none tracking-tight text-white sm:text-4xl xl:text-5xl">{level.name}</h2>
            <p className="mt-1.5 font-mono text-xs text-slate-400">
              by <span className="font-bold text-slate-200">{level.creator}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <StatusBadge st={statusOf(level, now)} />
              <RatingChips level={level} />
              <span className={chip}>{level.totalAttempts.toLocaleString('en-US')} attempts</span>
              {level.totalSeconds != null && <span className={chip}>{formatDuration(level.totalSeconds)}</span>}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <ProgressRing value={level.progress} />
            <span
              className="grid size-12 shrink-0 place-items-center text-black transition duration-300 group-hover:translate-x-1"
              style={{ background: BRAND, clipPath: 'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)' }}
            >
              <ArrowRight className="size-5" />
            </span>
          </div>
        </div>
      </Cut>
    </Link>
  )
}

// SPLIT → components/ui/pager.tsx (PER_PAGE_OPTIONS, DEFAULT_PER_PAGE, pageList, Pager, MiniPager).
// Pager = the bar at the bottom (page numbers, go to, per page).  MiniPager = the "‹ 3 / 10 ›" box in the slim bar (type a number to jump).
const PER_PAGE_OPTIONS = [9, 15, 30, 60, 99] // cards per page you can choose
const DEFAULT_PER_PAGE = 15

/** 1 … 4 5 6 … 20 : first, last, and the pages around the current one. */
function pageList(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  let s = Math.max(2, page - 1)
  let e = Math.min(pages - 1, page + 1)
  if (page <= 3) e = 4
  if (page >= pages - 2) s = pages - 3
  const out: (number | '…')[] = [1]
  if (s > 2) out.push('…')
  for (let i = s; i <= e; i++) out.push(i)
  if (e < pages - 1) out.push('…')
  out.push(pages)
  return out
}

function Pager({ page, pages, total, from, to, perPage, onPage, onPerPage }: { page: number; pages: number; total: number; from: number; to: number; perPage: number; onPage: (p: number) => void; onPerPage: (n: number) => void }) {
  const pad = (n: number) => String(n).padStart(3, '0')
  const [jump, setJump] = useState('')
  const [ppOpen, setPpOpen] = useState(false)
  const ppRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ppOpen) return
    const onDown = (e: MouseEvent) => {
      if (ppRef.current && !ppRef.current.contains(e.target as Node)) setPpOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPpOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [ppOpen])
  const go = () => {
    const n = Math.round(Number(jump))
    if (Number.isFinite(n) && n >= 1) onPage(Math.min(n, pages))
    setJump('')
  }
  const box = 'grid size-9 place-items-center border font-mono text-xs font-bold tabular-nums transition sm:size-10'
  const idle = 'border-white/10 bg-[#0d1013] text-slate-300 hover:border-white/30 hover:text-white'
  const inputCls = 'h-9 w-16 border border-white/10 bg-black/40 px-2 text-center font-mono text-xs tabular-nums text-white placeholder:text-slate-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
  const focusOn = (e: ReactFocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = `${BRAND}99`)
  const focusOff = (e: ReactFocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = '')
  return (
    <nav aria-label="Pages" className="flex flex-col items-center gap-4 border-t border-white/10 pb-20 pt-5 lg:flex-row lg:justify-between lg:pb-2 lg:pr-16">
      {/* how many are on screen (last on phones) */}
      <p className="order-3 font-mono text-[11px] text-slate-500 lg:order-none lg:text-xs">
        Showing{' '}
        <span className="font-bold tabular-nums text-white">
          {pad(from)}-{pad(to)}
        </span>{' '}
        of {total.toLocaleString('en-US')}
      </p>

      {/* the pages */}
      <div className="order-1 flex items-center gap-1.5 lg:order-none">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className={`${box} ${idle} disabled:pointer-events-none disabled:opacity-30`}>
          <ChevronLeft className="size-4" />
        </button>

        {/* phones: "Page [3] of 10" (type a number to jump) */}
        <form
          className="flex items-center gap-2 px-1 font-mono text-xs text-slate-400 sm:hidden"
          onSubmit={(e) => {
            e.preventDefault()
            go()
          }}
        >
          <span>Page</span>
          <input type="number" min={1} max={pages} inputMode="numeric" enterKeyHint="go" aria-label="Go to page" value={jump} onChange={(e) => setJump(e.target.value)} placeholder={String(page)} className={inputCls} onFocus={focusOn} onBlur={focusOff} />
          <span>
            of <span className="font-bold text-white">{pages}</span>
          </span>
        </form>

        {/* tablets and up: numbered pages */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {pageList(page, pages).map((p, i) =>
            p === '…' ? (
              <span key={`gap${i}`} className="grid size-10 place-items-center font-mono text-xs text-slate-600" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={`${box} ${p === page ? 'border-transparent text-black' : idle}`}
                style={p === page ? { background: BRAND } : undefined}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page" className={`${box} ${idle} disabled:pointer-events-none disabled:opacity-30`}>
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* go to (only when there are many pages) + how many per page */}
      <div className="order-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 lg:order-none">
        {pages > 12 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              go()
            }}
            className="hidden items-center gap-2 sm:flex"
          >
            <label htmlFor="gd-goto">Go to</label>
            <input id="gd-goto" type="number" min={1} max={pages} inputMode="numeric" enterKeyHint="go" value={jump} onChange={(e) => setJump(e.target.value)} placeholder={String(page)} className={inputCls} onFocus={focusOn} onBlur={focusOff} />
          </form>
        )}
        <div ref={ppRef} className="relative flex items-center gap-2.5">
          <span>Per page</span>
          <button
            onClick={() => setPpOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={ppOpen}
            className="flex h-9 min-w-20 items-center justify-between gap-3 border border-white/10 bg-black/40 px-3 text-xs tabular-nums text-white transition hover:border-white/30"
            style={ppOpen ? { borderColor: `${BRAND}99` } : undefined}
          >
            {perPage}
            <ChevronDown className={`size-4 text-slate-500 transition ${ppOpen ? 'rotate-180' : ''}`} />
          </button>
          {ppOpen && (
            <div role="listbox" className="absolute bottom-full right-0 z-40 mb-2 w-44 border border-white/15 bg-[#0d1013] p-1 shadow-[0_-24px_60px_-12px_rgba(0,0,0,.9)]">
              {PER_PAGE_OPTIONS.map((n) => (
                <button
                  key={n}
                  role="option"
                  aria-selected={perPage === n}
                  onClick={() => {
                    onPerPage(n)
                    setPpOpen(false)
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs tracking-wider transition ${perPage === n ? 'bg-white/[0.07]' : 'text-slate-300 hover:bg-white/5'}`}
                  style={perPage === n ? { color: BRAND } : undefined}
                >
                  <span>
                    {n} <span className="text-slate-500">per page</span>
                  </span>
                  {perPage === n && <Check className="size-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

/** Tiny "‹ 3 / 10 ›" control for the slim bar. */
function MiniPager({ page, pages, onPage, tabbable, className = '' }: { page: number; pages: number; onPage: (p: number) => void; tabbable: boolean; className?: string }) {
  const btn = 'grid size-9 place-items-center text-slate-300 transition hover:text-white disabled:pointer-events-none disabled:opacity-30'
  // click the number, type the page you want, press Enter (Esc cancels)
  const [draft, setDraft] = useState<string | null>(null)
  const cancel = useRef(false)
  const commit = () => {
    if (cancel.current) {
      cancel.current = false
      setDraft(null)
      return
    }
    if (draft !== null) {
      const n = Math.round(Number(draft))
      if (draft !== '' && Number.isFinite(n) && n >= 1) onPage(Math.min(n, pages))
      setDraft(null)
    }
  }
  return (
    <div className={`items-center border border-white/10 bg-black/40 ${className}`}>
      <button tabIndex={tabbable ? 0 : -1} aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn}>
        <ChevronLeft className="size-3.5" />
      </button>
      <div className="flex items-center gap-1 px-1 font-mono text-[11px] font-bold tabular-nums">
        <input
          type="text"
          inputMode="numeric"
          enterKeyHint="go"
          tabIndex={tabbable ? 0 : -1}
          aria-label={`Page ${page} of ${pages}. Type a page number and press Enter`}
          title="Type a page number and press Enter"
          value={draft ?? String(page)}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onFocus={(e) => {
            setDraft(String(page))
            e.currentTarget.select()
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              cancel.current = true
              e.currentTarget.blur()
            }
          }}
          className="h-6 w-10 border border-white/10 bg-black/50 text-center text-white focus:outline-none"
          style={draft !== null ? { borderColor: `${BRAND}99` } : undefined}
        />
        <span className="text-slate-600">/ {pages}</span>
      </div>
      <button tabIndex={tabbable ? 0 : -1} aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} className={btn}>
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  )
}

// SPLIT → lib/levels-state.ts. What is stored in sessionStorage (filters, page, scroll) and how it is read back safely.
type SavedState = { page?: number; perPage?: number; query?: string; diffs?: string[]; status?: string; saved?: string | null; scrollY?: number }

/**
 * Only used when you come Back inside the app (the levels are cached, so this render is not a hydration).
 * On a full page load the server and the browser must start from the same state, so that case is restored later, in an effect.
 */
function readSavedState(): SavedState | null {
  if (!LEVELS_CACHE) return null
  try {
    return JSON.parse(sessionStorage.getItem(SAVE_KEY) || 'null')
  } catch {
    return null
  }
}
function readLocal<T extends string>(key: string, ok: (v: string) => boolean, fallback: T): T {
  if (!LEVELS_CACHE) return fallback
  try {
    const v = localStorage.getItem(key)
    return v && ok(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

/* ----------------------------------------------------------------------------
 *  LevelsPage, in four parts:
 *   1. STATE ........... everything you can change (search, filters, sort, view, page)
 *   2. EFFECTS ......... remember + restore the position, page/scroll behaviour, keyboard shortcuts
 *   3. DERIVED DATA .... filtered/sorted list, stats, ladder, the page slice (recalculated, never stored)
 *   4. SCREEN (JSX) .... masthead, stats, target banner, ladder, filter bar, cards, pager, slim bar
 * ---------------------------------------------------------------------------- */
export default function LevelsPage() {
  const { levels, loading, error, retry } = useLevels()

    // ── 1. STATE ─────────────────────────────────────────────────────────────
    // `init` is what was saved when you opened a level; it is used so that Back puts everything where you left it.
  const [init] = useState(readSavedState)
  // Back inside the app: the page stays invisible for a split second until it has been scrolled to your old spot (no jump from the top)
  const [revealed, setRevealed] = useState(!init)
  const [query, setQuery] = useState(init?.query ?? '')
  const [diffs, setDiffs] = useState<Difficulty[]>(() => (init?.diffs ?? []).filter((d) => (DIFFICULTIES as string[]).includes(d)) as Difficulty[])
  const [status, setStatus] = useState<StatusId>(STATUSES.some((x) => x.id === init?.status) ? (init!.status as StatusId) : 'beaten')
  const [sort, setSort] = useState<SortId>(() => readLocal('gd-levels-sort-v2', (v) => SORTS.some((x) => x.id === v), 'difficulty') as SortId)
  const [view, setView] = useState<'grid' | 'list'>(() => readLocal('gd-levels-view', (v) => v === 'grid' || v === 'list', 'grid') as 'grid' | 'list')
  const [page, setPage] = useState(init && Number.isFinite(init.page) ? Math.max(1, init.page!) : 1)
  const [perPage, setPerPage] = useState<number>(() => {
    const saved = Number(init?.perPage)
    return PER_PAGE_OPTIONS.includes(saved) ? saved : Number(readLocal('gd-levels-perpage', (x) => PER_PAGE_OPTIONS.includes(Number(x)), String(DEFAULT_PER_PAGE)))
  })
  const [sortOpen, setSortOpen] = useState(false)
  const [miniSortOpen, setMiniSortOpen] = useState(false)
  const miniSortRef = useRef<HTMLDivElement>(null)
  const [miniDiffOpen, setMiniDiffOpen] = useState(false)
  const miniDiffRef = useRef<HTMLDivElement>(null)
  const [diffOpen, setDiffOpen] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const miniRef = useRef<HTMLInputElement>(null)
  const progRef = useRef<HTMLDivElement>(null)
  const showJumpRef = useRef(false)
  const toolbarRef = useRef<HTMLElement>(null)
  const [showJump, setShowJump] = useState(false)
  // While you search, the status filter steps aside (search looks in ALL levels). Clearing the search brings it back.
  const queryRef = useRef(init?.query ?? '')
  const statusRef = useRef<StatusId>(STATUSES.some((x) => x.id === init?.status) ? (init!.status as StatusId) : 'beaten')
  const savedStatus = useRef<StatusId | null>(STATUSES.some((x) => x.id === init?.saved) ? (init!.saved as StatusId) : null)
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
      const pp = Number(localStorage.getItem('gd-levels-perpage'))
      if (PER_PAGE_OPTIONS.includes(pp)) setPerPage(pp)
    } catch { }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('gd-levels-sort-v2', sort)
      localStorage.setItem('gd-levels-view', view)
      localStorage.setItem('gd-levels-perpage', String(perPage))
    } catch { }
  }, [sort, view, perPage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        // when the slim bar is showing (scrolled down), search there
        ;(showJumpRef.current ? miniRef.current : searchRef.current)?.focus()
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
      if (miniSortRef.current && !miniSortRef.current.contains(t)) setMiniSortOpen(false)
      if (miniDiffRef.current && !miniDiffRef.current.contains(t)) setMiniDiffOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDiffOpen(false)
        setSortOpen(false)
        setMiniSortOpen(false)
        setMiniDiffOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [])

    // ── 2. EFFECTS ───────────────────────────────────────────────────────────
  // ---- remember where you were (filters, how many cards are loaded, scroll), so Back from a level lands in the same place ----
  const stateRef = useRef({ page: 1, perPage: DEFAULT_PER_PAGE, query: '', diffs: [] as Difficulty[], status: 'beaten' as StatusId })
  stateRef.current = { page, perPage, query, diffs, status }
  const restoreRef = useRef<{ scrollY: number } | null>(init ? { scrollY: Number(init.scrollY) || 0 } : null)
  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({ ...stateRef.current, saved: savedStatus.current, scrollY: window.scrollY }))
    } catch { }
  }, [])

  // 1) on arrival: put the saved filters and "load more" count back
  useEffect(() => {
    if (init) return // already restored in the first render (Back inside the app)
    try {
      const raw = sessionStorage.getItem(SAVE_KEY)
      if (!raw) return
      const v = JSON.parse(raw)
      restoreRef.current = { scrollY: Number(v.scrollY) || 0 }
      if (typeof v.query === 'string') {
        queryRef.current = v.query
        setQuery(v.query)
      }
      if (Array.isArray(v.diffs)) setDiffs(v.diffs.filter((d: string) => (DIFFICULTIES as string[]).includes(d)) as Difficulty[])
      if (STATUSES.some((x) => x.id === v.status)) setStatus(v.status)
      if (STATUSES.some((x) => x.id === v.saved)) savedStatus.current = v.saved
      if (Number.isFinite(v.perPage) && PER_PAGE_OPTIONS.includes(v.perPage)) setPerPage(v.perPage)
      if (Number.isFinite(v.page)) setPage(Math.max(1, v.page))
    } catch { }
  }, [init])

  // a new filter or sort starts from the first page again (not while restoring, and not on the first run)
  // after a page change or a new filter: scroll back up to the first result (just under the slim bar)
  const scrollToResults = useCallback((slack = 0) => {
    const bar = toolbarRef.current
    if (!bar) return
    const top = bar.getBoundingClientRect().bottom + window.scrollY + 28 - 64
    if (window.scrollY > top + slack) window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [])
  const filterKey = JSON.stringify([query, diffs, status, sort])
  const lastKey = useRef(filterKey)
  useEffect(() => {
    if (restoreRef.current) {
      lastKey.current = filterKey
      return
    }
    if (lastKey.current === filterKey) return
    lastKey.current = filterKey
    setPage(1)
    scrollToResults()
  }, [filterKey, scrollToResults])

  // 2) once the levels are on screen: hold the page at your old spot, and only SHOW it once it has stayed there for a few frames.
  //    - scrollTo uses behavior 'instant': if your CSS has `scroll-behavior: smooth` on <html>, a normal scrollTo would glide down
  //      from the top, which looks exactly like "jumps up, then comes back down".
  //    - the router or the browser may also scroll to the top a moment after the page appears, so the position is re-applied on every
  //      frame for up to 0.9 s, and the page stays invisible until the position has been steady (so that jump is never seen).
  //    - the loop stops at once if you scroll yourself. Saving is paused meanwhile, so a jump to the top is never saved.
  useEffect(() => {
    const r = restoreRef.current
    if (!r || loading) return
    const y = r.scrollY
    const t0 = performance.now()
    let raf = 0
    let stop = false
    let steady = 0
    const cancel = () => {
      stop = true
    }
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const
    events.forEach((e) => window.addEventListener(e, cancel, { passive: true }))
    const finish = () => {
      restoreRef.current = null
      setRevealed(true)
    }
    const tick = () => {
      if (stop) return finish()
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const target = Math.min(y, max)
      if (Math.abs(window.scrollY - target) > 2) {
        window.scrollTo({ top: target, left: 0, behavior: 'instant' as ScrollBehavior })
        steady = 0
      } else {
        steady++
      }
      if (steady >= 8) setRevealed(true)
      if (performance.now() - t0 < 900) raf = requestAnimationFrame(tick)
      else finish()
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      events.forEach((e) => window.removeEventListener(e, cancel))
    }
  }, [loading])

  // 3) saving. NOT on every scroll: when a link is clicked the router scrolls to the top, and a scroll listener that is still
  //    attached at that moment would save "0" over your real position. So we save at the click (onClickCapture, before the
  //    router moves), when the filters or "Load more" change, and when the tab is hidden or closed.
  useEffect(() => {
    if (!restoreRef.current) persist()
  }, [page, perPage, query, diffs, status, persist])
  useEffect(() => {
    const onHide = () => {
      if (!restoreRef.current) persist()
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [persist])

  // the jump buttons appear once you have scrolled down a bit
  useEffect(() => {
    const onScroll = () => {
      // the slim bar shows as soon as the big filter box has scrolled out of view (not at a fixed distance, so it
      // never vanishes right after a page change scrolls you up to the first result)
      const bar = toolbarRef.current
      setShowJump(bar ? bar.getBoundingClientRect().bottom < 120 : window.scrollY > 700)
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (progRef.current) progRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

    // ── 3. DERIVED DATA ──────────────────────────────────────────────────────
    // Nothing below is stored: it is recalculated from the state whenever it changes.
    // filtered = search + status + difficulty, then sorted by the chosen sort.
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

    // numbers for the hero: total, beaten, in progress, attempts, average best run
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

  // Next target: the hardest level that is rated, tracked and not beaten yet.
  // (If the backend does not send IsRated / IsTracked, that part of the filter is skipped.)
  const resume = useMemo(
    () => [...levels].filter((l) => !isBeaten(l) && l.isRated !== false && l.isTracked !== false).sort(hardest)[0],
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

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const curPage = Math.min(page, pages)
  const pageStart = (curPage - 1) * perPage
  const shown = filtered.slice(pageStart, pageStart + perPage)
  // if the list got shorter (new data, filters), never stay on a page that no longer exists
  useEffect(() => {
    if (!loading && page > pages) setPage(pages)
  }, [loading, page, pages])
  const changePerPage = (n: number) => {
    if (!PER_PAGE_OPTIONS.includes(n)) return
    setPerPage(n)
    setPage(1)
    scrollToResults()
  }
  // flipping from the slim bar or the arrow keys: if you are already looking at the first cards, stay exactly where you are
  const flipPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), pages))
    scrollToResults(160)
  }
  const goPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), pages))
    scrollToResults()
  }
  // left / right arrow keys flip pages (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      const next = e.key === 'ArrowRight' ? curPage + 1 : curPage - 1
      if (next < 1 || next > pages) return
      setPage(next)
      scrollToResults(160)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [curPage, pages, scrollToResults])
  const sortLabel = SORTS.find((s) => s.id === sort)?.label

  showJumpRef.current = showJump
  const mono = 'font-mono text-[10px] font-bold uppercase tracking-[0.22em]'

  // ── 4. SCREEN ────────────────────────────────────────────────────────────
  // Top to bottom: masthead, stats, target banner, difficulty ladder, filter bar, results, pager. The slim bar and the
  // buttons at the bottom are fixed on screen and appear once you scroll down.
  return (
    <div className="relative isolate min-h-screen bg-[#08090b] text-slate-200" style={{ opacity: revealed ? 1 : 0, transition: revealed ? 'opacity .15s' : 'none' }}>
      <style>{CSS}</style>

      {/* backdrop: faint blueprint grid + a lime haze in the corner */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 90% 70% at 70% 0%, #000 10%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 70% 0%, #000 10%, transparent 75%)',
          }}
        />
        <div className="absolute -right-40 -top-48 size-[42rem] rounded-full blur-3xl" style={{ background: `${BRAND}12` }} />
        <div className="absolute -bottom-60 -left-40 size-[36rem] rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      {/* reading progress hairline */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5" aria-hidden="true">
        <div ref={progRef} className="h-full origin-left" style={{ background: BRAND, transform: 'scaleX(0)', boxShadow: `0 0 10px ${BRAND}` }} />
      </div>

      {/* slim bar: appears when the big filter box has scrolled out of view.  SPLIT → components/tracker/levels-slim-bar.tsx (logo, search, status, difficulty, sort, view, MiniPager) */}
      <div
        className={`fixed inset-x-0 top-0 z-30 transition duration-300 ${showJump ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}
        aria-hidden={!showJump}
      >
        <div className="border-b border-white/10 bg-[#08090b]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-2 md:px-6 xl:px-10">
            <span className="flex shrink-0 items-center gap-2.5">
              <Logo className="size-8" />
              <span className="hidden font-heading text-base font-black uppercase leading-none tracking-tighter xl:block" aria-label="GD Tracker">
                <span className="sr-only">GD </span>
                <span style={{ WebkitTextStroke: `1px ${BRAND}`, color: 'transparent' }}>Tracker</span>
              </span>
            </span>
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <ChevronRight className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" style={{ color: BRAND }} />
              <input
                ref={miniRef}
                tabIndex={showJump ? 0 : -1}
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                placeholder="search name, creator or id"
                aria-label="Search levels"
                className="h-9 w-full border border-white/10 bg-black/40 pl-8 pr-3 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none"
                style={{ caretColor: BRAND }}
              />
            </div>
            <div className="hidden md:flex">
              {STATUSES.map((s) => {
                const active = status === s.id
                return (
                  <button
                    key={s.id}
                    tabIndex={showJump ? 0 : -1}
                    onClick={() => {
                      savedStatus.current = null
                      setStatus(s.id)
                    }}
                    aria-pressed={active}
                    className={`px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${active ? 'text-black' : 'text-slate-500 hover:text-slate-200'}`}
                    style={active ? { background: BRAND } : undefined}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>

            {/* difficulty (demon faces) */}
            <div ref={miniDiffRef} className="sm:relative">
              <button
                tabIndex={showJump ? 0 : -1}
                onClick={() => {
                  setMiniDiffOpen((o) => !o)
                  setMiniSortOpen(false)
                }}
                aria-expanded={miniDiffOpen}
                aria-label="Filter by difficulty"
                title="Difficulty"
                className={`relative flex h-9 min-w-9 items-center justify-center gap-2 border px-2.5 transition ${diffs.length ? 'bg-white/[0.06] text-white' : 'border-white/10 bg-black/40 text-slate-300 hover:border-white/25 hover:text-white'}`}
                style={diffs.length ? { borderColor: `${BRAND}99` } : undefined}
              >
                {diffs.length === 0 ? (
                  <Swords className="size-4" style={{ color: BRAND }} />
                ) : (
                  <span className="flex -space-x-2">
                    {diffs.slice(0, 3).map((d) => (
                      <Face key={d} difficulty={d} tier="rated" className="size-5 object-contain" />
                    ))}
                  </span>
                )}
                {diffs.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center font-mono text-[9px] font-extrabold text-black" style={{ background: BRAND }}>
                    {diffs.length}
                  </span>
                )}
              </button>
              {showJump && miniDiffOpen && (
                <div className="absolute inset-x-3 top-full z-40 mt-2 border border-white/15 bg-[#0d1013] shadow-[0_24px_60px_-12px_rgba(0,0,0,.9)] sm:inset-x-auto sm:left-0 sm:w-72">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                    <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      <Swords className="size-3.5" /> Difficulty
                    </span>
                    {diffs.length > 0 && (
                      <button onClick={() => setDiffs([])} className="font-mono text-xs font-bold hover:underline" style={{ color: BRAND }}>
                        Clear
                      </button>
                    )}
                  </div>
                  <ul className="p-1.5">
                    {DIFFICULTIES.map((d) => {
                      const on = diffs.includes(d)
                      return (
                        <li key={d}>
                          <button onClick={() => setDiffs((x) => toggle(x, d))} aria-pressed={on} className={`flex w-full items-center gap-3 px-2.5 py-2 text-left transition ${on ? 'bg-white/[0.07]' : 'hover:bg-white/5'}`}>
                            <Face difficulty={d} tier="rated" className="size-9 shrink-0 object-contain" />
                            <span className="flex-1 font-mono text-sm font-bold uppercase tracking-wider text-slate-100">{d}</span>
                            <span className="font-mono text-xs font-semibold tabular-nums text-slate-500">{counts.d[d]}</span>
                            <span className={`grid size-5 place-items-center border transition ${on ? 'border-transparent' : 'border-white/20'}`} style={on ? { background: DIFF_COLOR[d] } : undefined}>
                              {on && <Check className="size-3.5 text-black" />}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* sort (Hardest, Recent, ...) */}
            <div ref={miniSortRef} className="sm:relative">
              <button
                tabIndex={showJump ? 0 : -1}
                onClick={() => {
                  setMiniSortOpen((o) => !o)
                  setMiniDiffOpen(false)
                }}
                aria-expanded={miniSortOpen}
                className="flex h-9 items-center gap-2 border border-white/10 bg-black/40 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-white/25 hover:text-white"
              >
                <ArrowUpDown className="size-3.5 shrink-0" style={{ color: BRAND }} />
                <span className="hidden sm:inline">{sortLabel}</span>
                <ChevronDown className={`size-3.5 shrink-0 text-slate-500 transition ${miniSortOpen ? 'rotate-180' : ''}`} />
              </button>
              {showJump && miniSortOpen && (
                <div className="absolute inset-x-3 top-full z-40 mt-2 border border-white/15 bg-[#0d1013] p-1 shadow-[0_24px_60px_-12px_rgba(0,0,0,.9)] sm:inset-x-auto sm:right-0 sm:w-56">
                  {SORTS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        setSort(o.id)
                        setMiniSortOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left font-mono text-xs font-bold uppercase tracking-wider transition ${sort === o.id ? 'bg-white/[0.07]' : 'text-slate-300 hover:bg-white/5'}`}
                      style={sort === o.id ? { color: BRAND } : undefined}
                    >
                      {o.label}
                      {sort === o.id && <Check className="size-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* view */}
            <div className="flex border border-white/10 bg-black/40">
              {([['grid', LayoutGrid], ['list', List]] as const).map(([id, Icon]) => (
                <button
                  key={id}
                  tabIndex={showJump ? 0 : -1}
                  onClick={() => setView(id)}
                  aria-label={`${id} view`}
                  aria-pressed={view === id}
                  className={`grid size-9 place-items-center transition ${view === id ? 'text-black' : 'text-slate-500 hover:text-slate-200'}`}
                  style={view === id ? { background: BRAND } : undefined}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>

            {pages > 1 && <MiniPager page={curPage} pages={pages} onPage={flipPage} tabbable={showJump} className="ml-auto hidden md:flex lg:ml-0" />}

            <span className="ml-auto hidden font-mono text-xs text-slate-500 lg:block">
              <span className="font-bold tabular-nums text-white">{String(filtered.length).padStart(3, '0')}</span> / {levels.length}
            </span>
          </div>

          {/* phones: the status tabs get their own scrolling row (the wide layout shows them in the bar above) */}
          <div className="flex items-stretch border-t border-white/[0.06] md:hidden">
          <div className="flex min-w-0 flex-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STATUSES.map((st) => {
              const active = status === st.id
              return (
                <button
                  key={st.id}
                  tabIndex={showJump ? 0 : -1}
                  onClick={() => {
                    savedStatus.current = null
                    setStatus(st.id)
                  }}
                  aria-pressed={active}
                  className={`relative shrink-0 px-3.5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition ${active ? 'text-white' : 'text-slate-500'}`}
                >
                  {st.label}
                  <sup className="ml-1 tabular-nums" style={{ color: active ? BRAND : undefined }}>{counts.s[st.id]}</sup>
                  {active && <span className="absolute inset-x-2 bottom-0 h-0.5" style={{ background: BRAND }} />}
                </button>
              )
            })}
          </div>
          {pages > 1 && <MiniPager page={curPage} pages={pages} onPage={flipPage} tabbable={showJump} className="flex shrink-0 border-y-0 border-r-0" />}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-7 p-4 md:p-6 xl:px-10">
        {/* ------------------------------------------------------------ Masthead   SPLIT → components/tracker/levels-masthead.tsx (logo, title, ruler) */}
        <header className="gl-rise">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <Logo className="size-16 shrink-0 sm:size-20 xl:size-24" />
              <div>
              <div className={`${mono} mb-3 flex items-center gap-2 !tracking-[0.35em] text-slate-500`}>
                <span className="size-1.5" style={{ background: BRAND }} />
                Practice log
                <span className="text-slate-700">//</span>
                Demon levels
              </div>
              {/* the logo already says "GD", so the title is just "Tracker" (the tab title is still "GD Tracker") */}
              <h1 className="font-heading text-5xl font-black uppercase leading-[0.9] tracking-tighter sm:text-6xl xl:text-7xl" aria-label="GD Tracker">
                <span className="sr-only">GD </span>
                <span style={{ WebkitTextStroke: `1.5px ${BRAND}`, color: 'transparent' }}>Tracker</span>
              </h1>
              </div>
            </div>
            <div className={`${mono} flex items-center gap-2 border border-white/10 bg-black/30 px-3 py-2`} style={{ color: BRAND }}>
              <span className="size-2 animate-pulse" style={{ background: BRAND }} />
              Auto-tracking
            </div>
          </div>

          {/* ruler */}
          <div
            className="mt-5 h-3 w-full opacity-70"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,.3) 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, ${BRAND} 0 1px, transparent 1px 50px)`,
              backgroundSize: '100% 6px, 100% 12px',
              backgroundPosition: '0 100%, 0 100%',
              backgroundRepeat: 'no-repeat',
              maskImage: 'linear-gradient(90deg, #000 30%, transparent)',
              WebkitMaskImage: 'linear-gradient(90deg, #000 30%, transparent)',
            }}
            aria-hidden="true"
          />
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${BRAND}, rgba(255,255,255,.14) 40%, transparent)` }} />
        </header>

        {/* ------------------------------------------------------------ Telemetry   SPLIT → components/tracker/levels-stats.tsx (the five number boxes; needs `stats`, `loading`) */}
        <Cut c={16} bg="rgba(255,255,255,.09)" inner="grid grid-cols-2 gap-px md:grid-cols-5">
          {[
            { label: 'Levels', value: <Num value={stats.total} />, sub: 'in your log' },
            { label: 'Cleared', value: <><span style={{ color: BRAND }}><Num value={stats.beaten} /></span><span className="text-xl text-slate-600"> /{stats.total}</span></>, sub: null },
            { label: 'In progress', value: <Num value={stats.inProgress} />, sub: 'being practised' },
            { label: 'Attempts', value: <Num value={stats.attempts} />, sub: 'all levels' },
            { label: 'Average best', value: <Num value={stats.avgBest} decimals={1} suffix="%" />, sub: 'started levels' },
          ].map((t, i) => (
            <div key={t.label} className={`bg-[#0d1013] px-4 py-3 ${i === 0 ? 'col-span-2 md:col-span-1' : ''}`} style={{ '--d': `${i * 0.18}s` } as CSSProperties}>
              <div className={`${mono} text-slate-500`}>{t.label}</div>
              <div className="mt-1 font-heading text-3xl font-black tabular-nums text-white">{loading ? <span className="gl-fill mt-1 block h-7 w-20" /> : t.value}</div>
              <div className="mt-1.5 font-mono text-[10px] text-slate-500">
                {loading ? (
                  <span className="gl-fill block h-2.5 w-24" />
                ) : t.sub ? (
                  t.sub
                ) : (
                  <TickBar value={stats.total ? (stats.beaten / stats.total) * 100 : 0} accent={BRAND} n={20} className="h-2" />
                )}
              </div>
            </div>
          ))}
        </Cut>

        {/* ------------------------------------------------------------ Target banner   already a component: TargetBanner (needs `resume`, `now`, `persist`) */}
        {loading ? (
          <div className="gl-wave h-[196px] border border-white/10 bg-[#0d1013]">
            <span className="gl-fill block h-full w-full opacity-60" />
          </div>
        ) : (
          resume && <TargetBanner level={resume} now={now} onNavigate={persist} />
        )}

        {/* ------------------------------------------------------------ Threat ladder   SPLIT → components/tracker/levels-ladder.tsx (difficulty tiles that filter; needs `ladder`, `diffs`, `setDiffs`) */}
        <div>
          <div className={`${mono} mb-2 flex items-center justify-between !tracking-[0.3em] text-slate-500`}>
            <span className="flex items-center gap-2">
              <span className="h-px w-6" style={{ background: BRAND }} />
              Threat ladder
              <span className="hidden font-medium normal-case tracking-normal text-slate-600 sm:inline">tap to filter</span>
            </span>
            {diffs.length > 0 && (
              <button onClick={() => setDiffs([])} className="hover:underline" style={{ color: BRAND }}>
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="gl-fill block h-16 min-w-[128px] flex-1" style={{ '--d': `${i * 0.18}s`, clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' } as CSSProperties} />
                ))
              : ladder.map(({ d, total, beaten }) => {
                  const c = DIFF_COLOR[d]
                  const on = diffs.includes(d)
                  const pct = total ? (beaten / total) * 100 : 0
                  return (
                    <button
                      key={d}
                      onClick={() => setDiffs((x) => toggle(x, d))}
                      aria-pressed={on}
                      title={on ? `Showing ${d} only. Click to remove.` : `Show only ${d}`}
                      className="relative h-16 shrink-0 text-left transition-opacity duration-200 hover:!opacity-100"
                      style={{
                        flex: `${Math.max(total, 1)} 1 0`,
                        minWidth: 128,
                        background: 'rgba(255,255,255,.045)',
                        opacity: diffs.length && !on ? 0.5 : 1,
                        clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                      }}
                    >
                      <span className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(135deg, ${c}22 0 2px, transparent 2px 8px)` }} />
                      <span className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c}55, ${c}30)` }} />
                      <span className="absolute bottom-0 left-0 h-[3px]" style={{ width: `${pct}%`, background: c }} />
                      {on && <span className="absolute inset-x-0 top-0 h-[3px] bg-white" />}
                      <span className="relative flex h-full items-center gap-3 pl-6 pr-4">
                        <Face difficulty={d} tier="rated" className="size-9 shrink-0 object-contain" />
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">{d}</span>
                          <span className="font-heading text-lg font-black tabular-nums text-white">
                            {beaten}
                            <span className="text-sm font-bold text-slate-500">/{total}</span>
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })}
          </div>
        </div>

        {/* ------------------------------------------------------------ Command bar   SPLIT → components/tracker/levels-toolbar.tsx (search, difficulty, sort, view, status tabs, reset) */}
        <section ref={toolbarRef} aria-busy={loading} className={`relative z-20 scroll-mt-4 transition-opacity duration-300 ${loading ? 'pointer-events-none select-none opacity-50' : ''}`}>
          <div className="relative border border-white/10 bg-[#0d1013] p-3 sm:p-4">
            {/* corner marks */}
            <span className="pointer-events-none absolute -left-px -top-px size-3 border-l-2 border-t-2" style={{ borderColor: BRAND }} aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-px -right-px size-3 border-b-2 border-r-2" style={{ borderColor: BRAND }} aria-hidden="true" />

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* search */}
              <div className="relative order-1 basis-full sm:basis-auto sm:min-w-[220px] sm:flex-1">
                <ChevronRight className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: BRAND }} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => updateQuery(e.target.value)}
                  placeholder="search name, creator or id"
                  aria-label="Search levels"
                  className="h-11 w-full border border-white/10 bg-black/40 pl-9 pr-12 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none"
                  style={{ caretColor: BRAND }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `${BRAND}99`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '')}
                />
                {query ? (
                  <button onClick={() => updateQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-slate-500 hover:bg-white/10 hover:text-white">
                    <X className="size-4" />
                  </button>
                ) : (
                  <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 border border-white/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 sm:block">/</kbd>
                )}
              </div>

              {/* difficulty */}
              <div ref={diffRef} className="relative order-2">
                <button
                  onClick={() => {
                    setDiffOpen((o) => !o)
                    setSortOpen(false)
                  }}
                  aria-expanded={diffOpen}
                  aria-label="Filter by difficulty"
                  title="Difficulty"
                  className={`relative flex h-11 min-w-11 items-center justify-center gap-2 border px-3 transition ${diffs.length ? 'bg-white/[0.06] text-white' : 'border-white/10 bg-black/40 text-slate-300 hover:border-white/25 hover:text-white'}`}
                  style={diffs.length ? { borderColor: `${BRAND}99` } : undefined}
                >
                  {diffs.length === 0 ? (
                    <Swords className="size-4" style={{ color: BRAND }} />
                  ) : (
                    <span className="flex -space-x-2">
                      {diffs.slice(0, 3).map((d) => (
                        <Face key={d} difficulty={d} tier="rated" className="size-6 object-contain" />
                      ))}
                    </span>
                  )}
                  {diffs.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center font-mono text-[10px] font-extrabold text-black" style={{ background: BRAND }}>
                      {diffs.length}
                    </span>
                  )}
                </button>

                {diffOpen && (
                  <div className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] border border-white/15 bg-[#0d1013] shadow-[0_24px_60px_-12px_rgba(0,0,0,.9)]">
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                      <span className={`${mono} flex items-center gap-1.5 text-slate-500`}>
                        <Swords className="size-3.5" /> Difficulty
                      </span>
                      {diffs.length > 0 && (
                        <button onClick={() => setDiffs([])} className="font-mono text-xs font-bold hover:underline" style={{ color: BRAND }}>
                          Clear
                        </button>
                      )}
                    </div>
                    <ul className="p-1.5">
                      {DIFFICULTIES.map((d) => {
                        const on = diffs.includes(d)
                        return (
                          <li key={d}>
                            <button onClick={() => setDiffs((x) => toggle(x, d))} aria-pressed={on} className={`flex w-full items-center gap-3 px-2.5 py-2 text-left transition ${on ? 'bg-white/[0.07]' : 'hover:bg-white/5'}`}>
                              <Face difficulty={d} tier="rated" className="size-9 shrink-0 object-contain" />
                              <span className="flex-1 font-mono text-sm font-bold uppercase tracking-wider text-slate-100">{d}</span>
                              <span className="font-mono text-xs font-semibold tabular-nums text-slate-500">{counts.d[d]}</span>
                              <span className={`grid size-5 place-items-center border transition ${on ? 'border-transparent' : 'border-white/20'}`} style={on ? { background: DIFF_COLOR[d] } : undefined}>
                                {on && <Check className="size-3.5 text-black" />}
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
                  className="flex h-11 w-full items-center justify-between gap-2 border border-white/10 bg-black/40 px-3.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-white/25 hover:text-white"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ArrowUpDown className="size-4 shrink-0" style={{ color: BRAND }} />
                    <span className="truncate">{sortLabel}</span>
                  </span>
                  <ChevronDown className={`size-4 shrink-0 text-slate-500 transition ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-56 max-w-[calc(100vw-3rem)] border border-white/15 bg-[#0d1013] p-1 shadow-[0_24px_60px_-12px_rgba(0,0,0,.9)]">
                    {SORTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSort(s.id)
                          setSortOpen(false)
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2.5 text-left font-mono text-xs font-bold uppercase tracking-wider transition ${sort === s.id ? 'bg-white/[0.07]' : 'text-slate-300 hover:bg-white/5'}`}
                        style={sort === s.id ? { color: BRAND } : undefined}
                      >
                        {s.label}
                        {sort === s.id && <Check className="size-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* view */}
              <div className="order-4 flex border border-white/10 bg-black/40">
                {([['grid', LayoutGrid], ['list', List]] as const).map(([id, Icon]) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    aria-label={`${id} view`}
                    aria-pressed={view === id}
                    className={`grid size-11 place-items-center transition ${view === id ? 'text-black' : 'text-slate-500 hover:text-slate-200'}`}
                    style={view === id ? { background: BRAND } : undefined}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* status tabs */}
            <div className="-mx-3 mt-3 flex overflow-x-auto border-b border-white/10 px-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {STATUSES.map((s) => {
                const active = status === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      savedStatus.current = null
                      setStatus(s.id)
                    }}
                    aria-pressed={active}
                    className={`relative shrink-0 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {s.label}
                    {!loading && <sup className="ml-1 tabular-nums" style={{ color: active ? BRAND : undefined }}>{counts.s[s.id]}</sup>}
                    {active && <span className="absolute inset-x-0 -bottom-px h-0.5" style={{ background: BRAND }} />}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 font-mono text-xs">
              <span className="text-slate-500">
                {loading ? (
                  <span className="gl-fill inline-block h-4 w-28 align-middle" />
                ) : (
                  <>
                    <span className="font-bold tabular-nums text-white">{String(filtered.length).padStart(3, '0')}</span> / {levels.length} levels
                  </>
                )}
              </span>
              {activeFilters > 0 && (
                <button onClick={reset} className="flex shrink-0 items-center gap-1.5 px-2.5 py-1 font-bold uppercase tracking-wider transition hover:bg-white/5" style={{ color: BRAND }}>
                  <RotateCcw className="size-3.5" />
                  Reset {activeFilters}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ Levels   loading skeletons, error, empty state, then the cards (grid) or rows (list) of the current page */}
        {loading ? (
          <div aria-busy="true" aria-label="Loading levels">
            {view === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
          <Cut c={18} inner="flex flex-col items-center gap-3 p-12 text-center">
            <span className="grid size-14 place-items-center border border-red-500/40 text-red-400">
              <AlertTriangle className="size-6" />
            </span>
            <h2 className="font-heading text-xl font-black uppercase text-white">Could not load your levels</h2>
            <p className="max-w-sm font-mono text-xs text-slate-500">The server did not answer. Check that the backend is running, then try again.</p>
            <button onClick={retry} className="mt-1 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black" style={{ background: BRAND, clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
              Try again
            </button>
          </Cut>
        ) : filtered.length === 0 ? (
          <Cut c={18} inner="flex flex-col items-center gap-3 p-12 text-center">
            <span className="grid size-14 place-items-center border border-white/15 text-slate-500">
              <Search className="size-6" />
            </span>
            <h2 className="font-heading text-xl font-black uppercase text-white">No levels match</h2>
            <p className="max-w-sm font-mono text-xs text-slate-500">Try a different search or remove a filter.</p>
            <button onClick={reset} className="mt-1 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black" style={{ background: BRAND, clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
              Reset filters
            </button>
          </Cut>
        ) : view === 'grid' ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" onClickCapture={persist}>
            {shown.map((l, i) => (
              <LevelCard key={l.id} level={l} now={now} index={i} rank={pageStart + i + 1} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5" onClickCapture={persist}>
            {shown.map((l, i) => (
              <LevelRow key={l.id} level={l} now={now} index={i} rank={pageStart + i + 1} />
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------ Pages   uses Pager (bottom bar) */}
        {!loading && filtered.length > PER_PAGE_OPTIONS[0] && (
          <Pager page={curPage} pages={pages} total={filtered.length} from={pageStart + 1} to={pageStart + shown.length} perPage={perPage} onPage={goPage} onPerPage={changePerPage} />
        )}
      </div>

      {/* ------------------------------------------------------------ Jump buttons   the round back-to-top button (fixed, bottom right) */}
      <div
        className={`fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 transition duration-300 sm:bottom-6 sm:right-6 ${showJump ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!showJump}
      >
        <button
          type="button"
          tabIndex={showJump ? 0 : -1}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top"
          className="grid size-11 place-items-center text-black shadow-[0_8px_30px_-6px_rgba(212,255,58,.55)] transition hover:scale-105 sm:size-12"
          style={{ background: BRAND, clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <ArrowUp className="size-5" />
        </button>
      </div>
    </div>
  )
}