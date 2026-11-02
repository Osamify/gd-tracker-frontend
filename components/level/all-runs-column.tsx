// components/level-details/all-runs-column.tsx
"use client"

import { useState, useMemo, useEffect, useRef, useId, type CSSProperties, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ListOrdered, ListChecks, Flame, Skull, Crosshair, ArrowUp, ArrowDown, X, Clock, ListFilter, Radar, Target, MousePointerClick, TrendingUp } from "lucide-react";
import { Collapsible, RunRow } from "./ui";
import type { Run } from "@/lib/tracker";

// Level colours. themeVars() on the page root sets them; if it is missing, the default palette is used.
const A = 'var(--lv-a, #fde047)';
const B = 'var(--lv-b, #fb923c)';
const C = 'var(--lv-c, #f43f5e)';

// Type definition for grouped deaths
type GroupedDeath = { percent: number; count: number; lastDiedAt?: string | null };

// Type definition for grouped runs (matches the RunGroup in LevelInfo)
type RunGroup = Run & { count: number; keys: string[] };

interface AllRunsColumnProps {
  deathsCount: number;
  isDeathsLogged: boolean;
  groupedDeaths: GroupedDeath[];
  practiceRunCount: number;
  allRuns: RunGroup[];
  totalSecs: number;
  inPlan: (r: Run) => boolean;
  freshKey: string | null;
}

/** "1:33 AM" if it happened today, "Yesterday", otherwise the date. Needs `now` so it only shows after mount (server and browser agree). */
function whenLabel(iso: string | null | undefined, now: number | null): string {
  if (!iso || now == null) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dayStart = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
  const daysAgo = Math.round((dayStart(new Date(now)) - dayStart(d)) / 86_400_000)
  if (daysAgo <= 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (daysAgo === 1) return 'Yesterday'
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
}

/** One cell of the summary strip. */
function Stat({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: ReactNode; sub?: string; tone?: string }) {
  return (
    <div className="relative flex min-w-0 flex-col gap-1 px-3.5 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <span style={{ color: tone ?? A }}>{icon}</span>
        {label}
      </div>
      <div
        className="font-heading text-2xl font-extrabold leading-none tabular-nums text-transparent"
        style={{ backgroundImage: `linear-gradient(135deg, #fff 30%, ${tone ?? A})`, WebkitBackgroundClip: 'text', backgroundClip: 'text' }}
      >
        {value}
      </div>
      {sub && <div className="truncate text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

/** Pass-rate ring: a donut that fills to the percentage, with the number in the middle. */
function Ring({ value }: { value: number }) {
  const id = useId();
  const r = 40;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="relative size-24">
      <div className="absolute inset-3 rounded-full opacity-30 blur-xl" style={{ background: '#34d399' }} aria-hidden="true" />
      <svg viewBox="0 0 100 100" className="relative size-full -rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
        {/* tick marks */}
        <circle cx="50" cy="50" r={r + 8} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeDasharray="1 5.5" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(c * v) / 100} ${c}`}
          style={{ transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-heading text-[26px] font-extrabold tabular-nums text-white">
          {v.toFixed(0)}
          <span className="text-sm text-slate-400">%</span>
        </span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">pass rate</span>
      </div>
    </div>
  );
}

const SLOTS = 101; // one column for each percent, 0 to 100

export default function AllRunsColumn({
  deathsCount, isDeathsLogged, groupedDeaths, practiceRunCount, allRuns, totalSecs, inPlan, freshKey
}: AllRunsColumnProps) {
  // sort = what we sort by, dir = 'asc' (small first) or 'desc' (big first).
  // Clicking the button that is already active flips the direction, so the toggle always changes something visible.
  const [sort, setSort] = useState<'percent' | 'count' | 'recent'>('percent');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  // clock for "today / yesterday" (set after mount so the server and the browser agree)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // the "Latest" sort only makes sense when the backend sent death times
  const hasTimes = groupedDeaths.some((g) => g.lastDiedAt);
  const sortOptions = (hasTimes ? ['percent', 'count', 'recent'] : ['percent', 'count']) as ('percent' | 'count' | 'recent')[];
  const sortLabels = { percent: 'By %', count: 'By count', recent: 'Latest' } as const;

  const pick = (s: 'percent' | 'count' | 'recent') => {
    if (s === sort) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(s);
      setDir('desc'); // every sort starts with the biggest first
    }
  };

  const sortedAttempts = useMemo(() => {
    const k = dir === 'asc' ? 1 : -1;
    const time = (g: GroupedDeath) => (g.lastDiedAt ? new Date(g.lastDiedAt).getTime() : 0);
    return [...groupedDeaths].sort((a, b) => {
      if (sort === 'percent') return k * (a.percent - b.percent);
      if (sort === 'count') return k * (a.count - b.count) || a.percent - b.percent;
      return k * (time(a) - time(b)) || a.percent - b.percent;
    });
  }, [groupedDeaths, sort, dir]);

  const maxCount = Math.max(1, ...groupedDeaths.map((g) => g.count));
  const byPercent = useMemo(() => new Map(groupedDeaths.map((g) => [g.percent, g])), [groupedDeaths]);

  // ---- the percent you picked: typed, dragged on the map or clicked on a tile (all three set the same value) ----
  const [query, setQuery] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [hover, setHover] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef(new Map<number, HTMLLIElement>());
  const q = query.trim() === '' ? null : Math.min(100, Math.max(0, Math.round(Number(query))));
  const filterOn = q !== null && !Number.isNaN(q);
  const setPercent = (p: number) => setQuery(String(Math.min(100, Math.max(0, Math.round(p)))));

  const check = useMemo(() => {
    if (q === null || Number.isNaN(q)) return null;
    // attempts that ended AFTER this percent = you passed it; ended exactly on it = you died there
    const passed = groupedDeaths.filter((g) => g.percent > q).reduce((s, g) => s + g.count, 0);
    const diedAt = groupedDeaths.filter((g) => g.percent === q).reduce((s, g) => s + g.count, 0);
    // every attempt starts from 0%, so the share of attempts that got past q is a real pass rate
    const total = groupedDeaths.reduce((s, g) => s + g.count, 0);
    const rate = total ? (passed / total) * 100 : 0;
    return { q, passed, diedAt, total, rate };
  }, [q, groupedDeaths]);

  // With a percent picked, the list only keeps the stops AFTER it, plus the stop exactly on it so a clicked tile stays visible.
  const visibleAttempts = useMemo(
    () => (filterOn ? sortedAttempts.filter((g) => g.percent >= (q as number)) : sortedAttempts),
    [sortedAttempts, filterOn, q],
  );
  const beyondStops = filterOn ? groupedDeaths.filter((g) => g.percent > (q as number)).length : 0;

  // scroll the list (only the list, not the page) so the tile on the picked percent is visible
  useEffect(() => {
    if (q === null || Number.isNaN(q)) return;
    const el = itemRefs.current.get(q);
    const list = listRef.current;
    if (el && list) list.scrollTo({ top: Math.max(0, el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2), behavior: 'smooth' });
  }, [q]);

  // when you last died at the picked percent, and overall
  const matchLast = q !== null ? byPercent.get(q)?.lastDiedAt ?? null : null;
  const matchWhen = whenLabel(matchLast, now);
  const lastDeathIso = groupedDeaths.reduce<string | null>((m, g) => (g.lastDiedAt && (!m || g.lastDiedAt > m) ? g.lastDiedAt : m), null);
  const lastDeathWhen = whenLabel(lastDeathIso, now);

  // ---- death map: drag or use the arrow keys to pick a percent ----
  const slotAt = (clientX: number) => {
    const el = mapRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(100, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * SLOTS)));
  };
  const pickFromPointer = (clientX: number) => setPercent(slotAt(clientX));
  const onMapKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1;
    const cur = q ?? 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setPercent(cur + step);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setPercent(cur - step);
    else if (e.key === 'Home') setPercent(0);
    else if (e.key === 'End') setPercent(100);
    else if (e.key === 'Escape') setQuery('');
    else return;
    e.preventDefault();
  };
  const markerLeft = q !== null ? ((q + 0.5) / SLOTS) * 100 : 0;

  // summary numbers
  const totalDeaths = groupedDeaths.reduce((s, g) => s + g.count, 0);
  const avgPercent = totalDeaths ? groupedDeaths.reduce((s, g) => s + g.percent * g.count, 0) / totalDeaths : 0;
  const deadliest = groupedDeaths.reduce<GroupedDeath | null>((best, g) => (!best || g.count > best.count ? g : best), null);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Collapsible title="All Attempts" icon={<ListOrdered className="size-4" />} count={`${deathsCount} deaths`}>
        {groupedDeaths.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-sm text-slate-500">
            No attempts to show yet.
          </p>
        ) : (
          <>
            {/* ------------------------------------------------ summary strip */}
            <div className="relative mb-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01]">
              <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${A}, ${C}, transparent)` }} aria-hidden="true" />
              <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                <Stat icon={<Skull className="size-3.5" />} label="Deaths" value={totalDeaths.toLocaleString('en-US')} sub={lastDeathWhen ? `last ${lastDeathWhen}` : 'attempts logged'} tone="#ffffff" />
                <Stat icon={<Flame className="size-3.5" />} label="Deadliest" value={deadliest ? `${deadliest.percent}%` : '—'} sub={deadliest ? `${deadliest.count} deaths here` : undefined} tone={C} />
                <Stat icon={<Crosshair className="size-3.5" />} label="Avg death" value={`${avgPercent.toFixed(0)}%`} sub="weighted by attempts" tone={A} />
              </div>
            </div>

            {/* ------------------------------------------------ death map + what you picked */}
            <div className="relative mb-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-3">
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-[0.18] blur-3xl" style={{ background: C }} aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full opacity-[0.12] blur-3xl" style={{ background: A }} aria-hidden="true" />

              <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg" style={{ background: `linear-gradient(135deg, ${A}, ${B})`, color: '#070b0e' }}>
                    <Radar className="size-4" />
                  </span>
                  <div className="leading-tight">
                    <div className="font-heading text-sm font-extrabold text-white">Death map</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      {q === null ? (
                        <>
                          <MousePointerClick className="size-3" style={{ color: A }} />
                          <span>Click or drag the map to pick a %</span>
                        </>
                      ) : (
                        'Where your attempts end, 0–100%'
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <input
                      id="pct-check"
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="Pick %"
                      aria-label="Pick a percent"
                      value={query}
                      onChange={(e) => {
                        // keep digits only (no minus, dots or letters), and never above 100
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setQuery(digits === '' ? '' : String(Math.min(100, Number(digits))));
                      }}
                      className="h-9 w-24 rounded-xl border border-white/10 bg-black/30 pl-3 pr-7 text-sm font-bold tabular-nums text-white placeholder:text-xs placeholder:font-semibold placeholder:text-slate-600 focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': B } as CSSProperties}
                    />
                    {query !== '' && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>}
                  </div>
                  {query !== '' && (
                    <button type="button" onClick={() => setQuery('')} aria-label="Clear" className="grid size-9 cursor-pointer place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* the map: one column per percent, taller = more deaths. Click or drag to pick. */}
              <div
                ref={mapRef}
                role="slider"
                tabIndex={0}
                aria-label="Pick a percent of the level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={q ?? 0}
                onKeyDown={onMapKey}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragging.current = true;
                  pickFromPointer(e.clientX);
                }}
                onPointerMove={(e) => {
                  setHover(slotAt(e.clientX));
                  if (dragging.current) pickFromPointer(e.clientX);
                }}
                onPointerUp={() => (dragging.current = false)}
                onPointerCancel={() => (dragging.current = false)}
                onPointerLeave={() => setHover(null)}
                className="relative z-10 h-28 cursor-crosshair touch-none select-none overflow-hidden rounded-xl border border-white/10 bg-[#05090c]/80 outline-none focus-visible:ring-2 sm:h-32"
                style={{ '--tw-ring-color': B } as CSSProperties}
              >
                {/* grid lines */}
                {[25, 50, 75].map((m) => (
                  <span key={`h${m}`} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/[0.06]" style={{ top: `${m}%` }} />
                ))}
                {[25, 50, 75].map((m) => (
                  <span key={`v${m}`} className="pointer-events-none absolute inset-y-0 w-px bg-white/[0.05]" style={{ left: `${m}%` }} />
                ))}

                {/* picked: left side = ended before (red tint), right side = went further (green tint) */}
                {q !== null && (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 left-0" style={{ width: `${markerLeft}%`, background: 'linear-gradient(to right, rgba(244,63,94,0.10), rgba(244,63,94,0.02))' }} aria-hidden="true" />
                    <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: `${markerLeft}%`, background: 'linear-gradient(to right, rgba(52,211,153,0.16), rgba(52,211,153,0.02))' }} aria-hidden="true" />
                  </>
                )}

                {/* the columns */}
                <div className="pointer-events-none absolute inset-x-1.5 bottom-0 top-8 flex items-end gap-px">
                  {Array.from({ length: SLOTS }, (_, p) => {
                    const g = byPercent.get(p);
                    const count = g?.count ?? 0;
                    const exact = q === p;
                    const after = q !== null && p > q;
                    const before = q !== null && p < q;
                    const isHover = hover === p;
                    const fill = !count
                      ? 'rgba(255,255,255,0.06)'
                      : exact
                        ? 'linear-gradient(to top, #e2e8f0, #ffffff)'
                        : after
                          ? 'linear-gradient(to top, #059669, #6ee7b7)'
                          : before
                            ? 'linear-gradient(to top, #be123c, #fb7185)'
                            : `linear-gradient(to top, ${C}, ${B} 55%, ${A})`;
                    return (
                      <div key={p} className="relative flex h-full flex-1 items-end">
                        {isHover && <span className="absolute inset-y-0 -inset-x-px bg-white/[0.07]" />}
                        <div
                          className="relative w-full rounded-t-[2px] transition-[height,opacity] duration-300"
                          style={{
                            height: count ? `${18 + 82 * (count / maxCount)}%` : '2px',
                            background: fill,
                            opacity: !count ? 1 : before ? 0.4 : 1,
                            boxShadow: count && !before ? `0 0 12px -2px ${exact ? '#fff' : after ? '#34d399' : C}` : undefined,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* hover tooltip */}
                {hover !== null && (
                  <div
                    className="pointer-events-none absolute top-1.5 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-[#0d141a]/95 px-2 py-1 text-[11px] font-bold tabular-nums text-white shadow-xl"
                    style={{ left: `clamp(34px, ${((hover + 0.5) / SLOTS) * 100}%, calc(100% - 34px))`, opacity: q !== null && hover === q ? 0 : 1 }}
                  >
                    {hover}% <span className="text-slate-400">·</span> <span style={{ color: byPercent.get(hover) ? B : undefined }}>{byPercent.get(hover) ? `×${byPercent.get(hover)!.count}` : 'no deaths'}</span>
                  </div>
                )}

                {/* marker */}
                {q !== null ? (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2" style={{ left: `${markerLeft}%`, background: '#fff', boxShadow: '0 0 14px 2px rgba(255,255,255,.55)' }} aria-hidden="true" />
                    <div
                      className="pointer-events-none absolute top-1.5 -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums text-[#070b0e] shadow-lg"
                      style={{ left: `clamp(20px, ${markerLeft}%, calc(100% - 20px))` }}
                    >
                      {q}%
                    </div>
                  </>
                ) : null}
              </div>

              <div className="relative mt-1.5 h-3 text-[10px] font-semibold tabular-nums text-slate-600">
                {[0, 25, 50, 75, 100].map((m) => (
                  <span key={m} className="absolute top-0" style={{ left: `${m}%`, transform: m === 0 ? 'none' : m === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
                    {m}%
                  </span>
                ))}
              </div>

              {/* what the picked percent means */}
              {check ? (
                <div className="relative mt-3 border-t border-white/[0.07] pt-3">
                  <div className="grid grid-cols-2 items-stretch gap-2.5 sm:grid-cols-[auto_1fr_1fr]">
                    <div className="col-span-2 grid place-items-center sm:col-span-1">
                      <Ring value={check.rate} />
                    </div>

                    <div className="relative flex flex-col justify-center overflow-hidden rounded-xl border px-3 py-2 leading-tight" style={{ borderColor: 'rgba(52,211,153,.28)', background: 'linear-gradient(135deg, rgba(52,211,153,.12), rgba(52,211,153,.02))' }}>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">
                        <TrendingUp className="size-3.5" /> Passed {check.q}%
                      </div>
                      <div className="mt-0.5 font-heading text-2xl font-extrabold tabular-nums text-emerald-300">×{check.passed}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">attempts that went further</div>
                    </div>

                    <div className="relative flex flex-col justify-center overflow-hidden rounded-xl border px-3 py-2 leading-tight" style={{ borderColor: 'rgba(251,113,133,.28)', background: 'linear-gradient(135deg, rgba(251,113,133,.12), rgba(251,113,133,.02))' }}>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300/80">
                        <Skull className="size-3.5" /> Died at {check.q}%
                      </div>
                      <div className="mt-0.5 font-heading text-2xl font-extrabold tabular-nums text-rose-300">×{check.diedAt}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400" suppressHydrationWarning>
                        {matchWhen ? (
                          <>
                            <Clock className="size-3" /> last {matchWhen}
                          </>
                        ) : (
                          'attempts that ended here'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* all attempts split in three */}
                  {check.total > 0 && (
                    <div className="mt-3">
                      <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
                        <span className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-500" style={{ width: `${(check.passed / check.total) * 100}%` }} />
                        <span className="h-full bg-white transition-[width] duration-500" style={{ width: `${(check.diedAt / check.total) * 100}%` }} />
                        <span className="h-full flex-1 bg-rose-500/60" />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-emerald-400" /> went further {check.passed}</span>
                        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-white" /> ended here {check.diedAt}</span>
                        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-500" /> ended earlier {check.total - check.passed - check.diedAt}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="relative mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Target className="size-3.5 shrink-0" />
                  Pick a percent to see how many attempts went past it.
                </p>
              )}
            </div>

            {/* ------------------------------------------------ the list */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 rounded-full" style={{ background: `linear-gradient(to bottom, ${A}, ${C})` }} />
                <div className="leading-tight">
                  <div className="font-heading text-sm font-extrabold text-white">Every stop</div>
                  <div className="text-[11px] text-slate-500">
                    {isDeathsLogged ? 'Click a percent for its stats.' : 'Estimated from practice runs.'}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 rounded-xl border border-white/10 bg-black/25 p-0.5 text-xs font-semibold">
                {sortOptions.map((s) => {
                  const active = sort === s;
                  const Arrow = dir === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pick(s)}
                      aria-pressed={active}
                      title={active ? 'Click again to reverse' : undefined}
                      className={`flex cursor-pointer items-center gap-1 rounded-[10px] px-3 py-1.5 transition ${active ? 'shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                      style={active ? { background: `linear-gradient(135deg, ${A}, ${B})`, color: '#070b0e' } : undefined}
                    >
                      {sortLabels[s]}
                      {active && <Arrow className="size-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* what the list is showing right now */}
            {filterOn && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] px-3 py-2 text-xs font-semibold text-slate-300">
                <span className="flex min-w-0 items-center gap-2">
                  <ListFilter className="size-4 shrink-0 text-emerald-300" />
                  <span className="truncate">
                    Only deaths after <span className="font-extrabold text-white">{q}%</span>
                    <span className="text-slate-400">
                      {' '}
                      · {beyondStops} {beyondStops === 1 ? 'spot' : 'spots'} · ×{check?.passed ?? 0}
                    </span>
                  </span>
                </span>
                <button type="button" onClick={() => setQuery('')} className="shrink-0 cursor-pointer rounded-md px-2 py-1 font-bold text-emerald-300 transition hover:bg-white/10">
                  Show all
                </button>
              </div>
            )}

            {filterOn && visibleAttempts.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-sm text-slate-500">
                You never died after {q}%.
              </p>
            )}

            <ul ref={listRef} className="relative grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {visibleAttempts.map(({ percent, count, lastDiedAt }) => {
                const heat = count / maxCount; // 0..1, how deadly compared to the worst stop
                const selected = q === percent;
                const when = whenLabel(lastDiedAt, now);
                const full = lastDiedAt && now != null ? new Date(lastDiedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : undefined;
                return (
                  <li
                    key={percent}
                    ref={(el) => {
                      if (el) itemRefs.current.set(percent, el);
                      else itemRefs.current.delete(percent);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    title={selected ? 'Click to clear' : `Show stats for ${percent}%`}
                    onClick={() => setQuery(selected ? '' : String(percent))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setQuery(selected ? '' : String(percent));
                      }
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border bg-gradient-to-br from-white/[0.05] to-white/[0.015] py-1.5 pl-3.5 pr-2.5 outline-none transition duration-200 hover:-translate-y-px hover:from-white/[0.09] focus-visible:ring-2"
                    style={{
                      borderColor: selected ? '#fff' : 'rgba(255,255,255,0.08)',
                      boxShadow: selected ? '0 0 0 1px #fff, 0 0 22px -6px #fff' : undefined,
                      '--tw-ring-color': B,
                    } as CSSProperties}
                  >
                    {/* left stripe: hotter = more deaths */}
                    <span className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(to bottom, ${A}, ${C})`, opacity: 0.25 + heat * 0.75 }} aria-hidden="true" />

                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-heading text-lg font-extrabold leading-none tabular-nums text-white">{percent}</span>
                        <span className="text-xs font-bold text-slate-500">%</span>
                        
                      </span>
                      <span className="rounded-md px-2 py-0.5 font-heading text-xs font-extrabold tabular-nums text-white" style={{ background: `color-mix(in srgb, ${C} ${28 + heat * 50}%, #0f172a)` }}>
                        ×{count}
                      </span>
                    </div>

                    {/* heat bar: this stop compared to the deadliest */}
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="gd-grow h-full rounded-full" style={{ width: `${Math.max(6, heat * 100)}%`, background: `linear-gradient(to right, ${C}, ${B}, ${A})` }} />
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                      <span className="flex min-w-0 items-center gap-1.5" title={full ? `Last death here: ${full}` : undefined} suppressHydrationWarning>
                        <Clock className="size-3 shrink-0 text-slate-500" />
                        <span className="truncate">{when || 'no time logged'}</span>
                      </span>
                      
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Collapsible>

      <Collapsible title="All Runs" icon={<ListChecks className="size-4" />} count={`${practiceRunCount} runs`}>
        {allRuns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-sm text-slate-500">
            No practice runs logged yet.
          </p>
        ) : (
          <>
            <ol className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
              {allRuns.map((r, i) => (
                <RunRow
                  key={`${r.startPercent}-${r.endPercent}`}
                  startPercent={r.startPercent}
                  endPercent={r.endPercent}
                  length={totalSecs}
                  badge={i + 1}
                  highlight={inPlan(r)}
                  delay={Math.min(i, 10) * 45}
                  attemptNo={r.totalAttempts}
                  count={r.count}
                  fresh={Boolean(freshKey && r.keys.includes(freshKey))}
                />
              ))}
            </ol>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block size-2 rounded-full" style={{ background: B }} />
              Highlighted runs are part of your minimum route to 100%.
            </p>
          </>
        )}
      </Collapsible>
    </div>
  )
}