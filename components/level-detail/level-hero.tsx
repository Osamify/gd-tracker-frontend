// components/level/level-hero.tsx
'use client'

import { useState, useEffect, useRef, useTransition, type FormEvent, type CSSProperties } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Swords, Gauge, Award, Star, Hash, Trophy, Search, ArrowRight, Clock, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { Face, AnimatedNumber } from './ui';
import type { Tier, FaceDifficulty } from '@/lib/level-helpers';

// Level colours. themeVars() on the page root sets them; if it is missing, the default palette is used.
const A = 'var(--lv-a, #fde047)';
const B = 'var(--lv-b, #fb923c)';
const C = 'var(--lv-c, #f43f5e)';

const RECENT_KEY = 'gd-recent-levels'; // last levels you jumped to with the search
const MAX_RECENT = 5;

// shake animation for a wrong search
const HERO_CSS = `
@keyframes hs-shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-5px) } 40% { transform: translateX(5px) } 60% { transform: translateX(-3px) } 80% { transform: translateX(3px) } }
.hs-shake { animation: hs-shake .35s ease }
`;

interface LevelHeroProps {
  name: string;
  creator: string;
  progress: number;
  best: number;
  difficultyLabel: string;
  faceDiff: FaceDifficulty;
  tier: Tier;
  glowClass: string;
  gddp: number | null | undefined;
  nlw: string | null | undefined;
  enjoyment: number | null | undefined;
  ratingCount: number | null | undefined;
  aredl: number | null | undefined;
  beaten: boolean;
}

/** Search box that jumps to a level by its ID. Press "/" anywhere to focus it. */
function LevelSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // load recent searches after mount (localStorage does not exist on the server)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      const list = raw ? JSON.parse(raw) : []
      if (Array.isArray(list)) setRecent(list.filter((x) => typeof x === 'string').slice(0, MAX_RECENT))
    } catch {}
  }, [])

  const saveRecent = (list: string[]) => {
    setRecent(list)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch {}
  }

  // "/" focuses the search (unless you are already typing somewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // close the dropdown when you click outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const go = (id: string) => {
    const clean = id.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    if (!clean) {
      setError(true)
      setTimeout(() => setError(false), 450)
      return
    }
    saveRecent([clean, ...recent.filter((r) => r !== clean)].slice(0, MAX_RECENT))
    setFocused(false)
    inputRef.current?.blur()
    setQuery('')
    if (pathname === `/levels/${clean}`) return // already here
    startTransition(() => router.push(`/levels/${clean}`))
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    go(query)
  }

  const showRecent = focused && query === '' && recent.length > 0

  return (
    <div ref={boxRef} className="relative">
      <style>{HERO_CSS}</style>
      <form
        onSubmit={onSubmit}
        className={`group flex items-center overflow-hidden rounded-xl border bg-black/40 backdrop-blur-md transition-all duration-300 ${error ? 'hs-shake border-red-400/70' : 'border-white/10'}`}
        style={focused && !error ? ({ borderColor: `color-mix(in srgb, ${B} 60%, transparent)`, boxShadow: `0 0 0 3px color-mix(in srgb, ${B} 18%, transparent)` } as CSSProperties) : undefined}
      >
        {isPending ? (
          <Loader2 className="ml-3 size-4 animate-spin" style={{ color: A }} />
        ) : (
          <Search className="ml-3 size-4 transition-colors" style={{ color: focused ? A : '#94a3b8' }} />
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="Jump to level ID…"
          aria-label="Jump to a level by ID"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.replace(/\D/g, '')) // IDs are numbers only
            setError(false)
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (query) setQuery('')
              else inputRef.current?.blur()
              setFocused(false)
            }
          }}
          className={`bg-transparent px-3 py-2 text-sm font-semibold tabular-nums text-white outline-none transition-all duration-300 placeholder:font-medium placeholder:text-slate-400 ${focused || query ? 'w-44 sm:w-56' : 'w-36 sm:w-44'}`}
        />

        {query ? (
          <>
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              aria-label="Clear"
              className="cursor-pointer p-1 text-slate-500 transition hover:text-white"
            >
              <X className="size-4" />
            </button>
            <button
              type="submit"
              aria-label="Go to level"
              className="mr-1 grid size-7 cursor-pointer place-items-center rounded-lg text-[#070b0e] transition hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${A}, ${B})` }}
            >
              <ArrowRight className="size-4" />
            </button>
          </>
        ) : (
          !focused && (
            <kbd className="mr-2.5 hidden rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:block">/</kbd>
          )
        )}
      </form>

      {/* recent levels */}
      {showRecent && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0a1015]/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span>Recent</span>
            <button type="button" onClick={() => saveRecent([])} className="cursor-pointer normal-case tracking-normal text-slate-500 transition hover:text-red-300">
              Clear
            </button>
          </div>
          <ul className="pb-1.5">
            {recent.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep the input focused so the click is not lost
                  onClick={() => go(id)}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm font-semibold tabular-nums text-slate-200 transition hover:bg-white/[0.06]"
                >
                  <Clock className="size-3.5 text-slate-500" />
                  {id}
                  <ArrowRight className="ml-auto size-3.5 text-slate-600" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function LevelHero({
  name, creator, progress, best, difficultyLabel, faceDiff, tier, glowClass,
  gddp, nlw, enjoyment, ratingCount, aredl, beaten
}: LevelHeroProps) {
  const router = useRouter()

  // "B" goes back to the levels list (not while typing, and Ctrl/Cmd+B is left alone)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyB' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      router.push('/levels')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  return (
    // z-20 so the search dropdown sits above the cards below
    <header className="relative isolate z-20">
      {/* Soft dark fade behind the title so the text stays readable on bright thumbnails.
          No box edges: it fades out upward (gradient) and sideways (mask). */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[85%] bg-gradient-to-t from-[#070b0e]/85 via-[#070b0e]/40 to-transparent"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Top bar: Back + Search on the left, Refresh on the right */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/levels"
            title="Back to levels (B)"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-200 backdrop-blur-md transition hover:border-white/30 hover:text-white"
          >
            <ArrowLeft className="size-4" /> Back
            <kbd className="hidden rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:block">B</kbd>
          </Link>
          <LevelSearch />
        </div>
        <RefreshButton />
      </div>

      {/* Hero content */}
      <div className="flex flex-col gap-4 px-5 pb-6 pt-20 sm:flex-row sm:items-end sm:pt-28 xl:px-8 xl:pb-8 xl:pt-44">
        <Face difficulty={faceDiff} tier={tier} alt={`${difficultyLabel} ${tier} face`} className={`gd-float size-24 shrink-0 object-contain sm:size-28 ${glowClass}`} />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/10 bg-black/50 text-slate-100 backdrop-blur-md">
              <Swords aria-hidden="true" /> {difficultyLabel}
            </Badge>
            {gddp != null && (
              <Badge className="border-violet-400/40 bg-violet-400/10 text-violet-300">
                <Gauge aria-hidden="true" /> GDDP {gddp.toFixed(2)}
              </Badge>
            )}
            {nlw && (
              <Badge className="border-sky-400/40 bg-sky-400/10 text-sky-300">
                <Award aria-hidden="true" /> NLW {nlw}
              </Badge>
            )}
            {enjoyment != null && (
              <Badge className="border-yellow-400/40 bg-yellow-400/10 text-yellow-300">
                <Star aria-hidden="true" /> {enjoyment.toFixed(1)}
                {ratingCount != null && <span className="text-yellow-300/70">({ratingCount.toLocaleString('en-US')})</span>}
              </Badge>
            )}
            {aredl != null && (
              <Badge className="border-amber-400/40 bg-amber-400/10 text-amber-300">
                <Hash aria-hidden="true" /> AREDL {aredl}
              </Badge>
            )}
            {beaten && (
              <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                <Trophy aria-hidden="true" /> Beaten
              </Badge>
            )}
          </div>

          <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)] drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)] sm:text-4xl xl:text-5xl">{name}</h1>
          <p className="text-sm text-slate-300 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            by <span className="font-semibold text-white">{creator}</span>
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end">
          {progress != 100 && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300/80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">Best run</span>
          )}
          <span
            className="gd-shimmer bg-clip-text font-heading text-6xl font-extrabold leading-none tabular-nums text-transparent drop-shadow-[0_4px_22px_rgba(0,0,0,0.55)]"
            style={{ backgroundImage: `linear-gradient(to right, ${A}, ${B}, ${C})`, backgroundSize: '200% auto' }}
          >
            <AnimatedNumber value={best} />%
          </span>
        </div>
      </div>
    </header>
  )
}