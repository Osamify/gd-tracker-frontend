// components/level-details/all-runs-column.tsx
"use client"

import { useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { ListOrdered, ListChecks, Flame, Skull, Crosshair, ArrowUp, ArrowDown, Search, X } from "lucide-react";
import { Collapsible, RunRow } from "./ui";
import type { Run } from "@/lib/tracker";

// Level colours. themeVars() on the page root sets them; if it is missing, the default palette is used.
const A = 'var(--lv-a, #fde047)';
const B = 'var(--lv-b, #fb923c)';
const C = 'var(--lv-c, #f43f5e)';

// Type definition for grouped deaths
type GroupedDeath = { percent: number; count: number };

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

/** One small summary box above the attempts list. */
function Mini({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-white/[0.03] px-3 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${B} 16%, transparent)`, color: A }}>
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
        <div className="font-heading text-base font-extrabold tabular-nums text-white">{value}</div>
      </div>
    </div>
  );
}

export default function AllRunsColumn({
  deathsCount, isDeathsLogged, groupedDeaths, practiceRunCount, allRuns, totalSecs, inPlan, freshKey
}: AllRunsColumnProps) {
  // sort = what we sort by, dir = 'asc' (small first) or 'desc' (big first).
  // Clicking the button that is already active flips the direction, so the toggle always changes something visible.
  const [sort, setSort] = useState<'percent' | 'count'>('percent');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const pick = (s: 'percent' | 'count') => {
    if (s === sort) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(s);
      setDir(s === 'percent' ? 'asc' : 'desc'); // % starts at the beginning of the level, count starts at the deadliest
    }
  };

  const sortedAttempts = useMemo(() => {
    const k = dir === 'asc' ? 1 : -1;
    return [...groupedDeaths].sort((a, b) =>
      sort === 'percent' ? k * (a.percent - b.percent) : k * (a.count - b.count) || a.percent - b.percent,
    );
  }, [groupedDeaths, sort, dir]);

  const maxCount = Math.max(1, ...groupedDeaths.map((g) => g.count));

  // ---- percent checker: type a percent, see how often you got there ----
  const [query, setQuery] = useState('');
  const q = query.trim() === '' ? null : Math.min(100, Math.max(0, Math.round(Number(query))));
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
            {/* quick summary */}
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Mini icon={<Skull className="size-4" />} label="Deaths" value={totalDeaths.toLocaleString('en-US')} />
              <Mini icon={<Flame className="size-4" />} label="Deadliest" value={deadliest ? `${deadliest.percent}% ×${deadliest.count}` : '—'} />
              <Mini icon={<Crosshair className="size-4" />} label="Avg death" value={`${avgPercent.toFixed(0)}%`} />
            </div>

            {/* percent checker */}
            <div className="mb-3 rounded-xl border border-slate-800 bg-white/[0.03] p-3">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="pct-check">
                How many times did I pass…
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="pct-check"
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="Type a percent, e.g. 52"
                    value={query}
                    onChange={(e) => {
                      // keep digits only (no minus, dots or letters), and never above 100
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                      setQuery(digits === '' ? '' : String(Math.min(100, Number(digits))));
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-black/30 py-2 pl-9 pr-9 text-sm font-bold tabular-nums text-white placeholder:font-medium placeholder:text-slate-600 focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': B } as CSSProperties}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">%</span>
                </div>
                {query !== '' && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear"
                    className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-800 text-slate-400 transition hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {check && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: `Passed ${check.q}%`, value: check.passed, hint: 'attempts that went further' },
                    { label: `Died at ${check.q}%`, value: check.diedAt, hint: 'attempts that ended here' },
                    { label: 'Pass rate', value: `${check.rate.toFixed(0)}%`, hint: `of ${check.total} attempts` },
                  ].map((c) => (
                    <div key={c.label} className="rounded-lg border border-slate-800 bg-black/20 px-2.5 py-2 leading-tight">
                      <div className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">{c.label}</div>
                      <div className="font-heading text-2xl font-extrabold tabular-nums" style={{ color: A }}>
                        {typeof c.value === 'number' ? `×${c.value}` : c.value}
                      </div>
                      <div className="text-[10px] text-slate-500">{c.hint}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {isDeathsLogged
                  ? 'Where each attempt ended, grouped by percent.'
                  : 'Estimated from your practice runs. Log deaths for exact numbers.'}
              </p>
              <div className="flex shrink-0 rounded-lg border border-slate-800 bg-white/[0.03] p-0.5 text-xs font-semibold">
                {(['percent', 'count'] as const).map((s) => {
                  const active = sort === s;
                  const Arrow = dir === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pick(s)}
                      aria-pressed={active}
                      title={active ? 'Click again to reverse' : undefined}
                      className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 transition ${active ? '' : 'text-slate-500 hover:text-slate-300'}`}
                      style={active ? { background: `color-mix(in srgb, ${B} 25%, transparent)`, color: A } : undefined}
                    >
                      {s === 'percent' ? 'By %' : 'By count'}
                      {active && <Arrow className="size-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <ul className="grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {sortedAttempts.map(({ percent, count }) => {
                const heat = count / maxCount; // 0..1, how deadly compared to the worst stop
                const isPeak = count === maxCount && maxCount > 1;
                return (
                  <li
                    key={percent}
                    className="relative overflow-hidden rounded-xl border bg-white/[0.02] px-3 py-2"
                    style={{ borderColor: isPeak ? `color-mix(in srgb, ${C} 45%, transparent)` : 'rgb(30 41 59)' }}
                  >
                    {/* heat fill behind the row */}
                    <div
                      className="gd-grow absolute inset-y-0 left-0"
                      style={{
                        width: `${Math.max(6, heat * 100)}%`,
                        background: `linear-gradient(to right, color-mix(in srgb, ${C} ${15 + heat * 25}%, transparent), transparent)`,
                      }}
                      aria-hidden="true"
                    />
                    <div className="relative flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 font-bold tabular-nums text-white">
                        {isPeak && <Flame className="size-3.5" style={{ color: B }} />}
                        {percent}%
                      </span>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums text-white"
                        style={{ background: `color-mix(in srgb, ${C} ${30 + heat * 45}%, #0f172a)` }}
                      >
                        ×{count}
                      </span>
                    </div>
                    {/* thin position marker: where on the level this is */}
                    <div className="relative mt-1.5 h-0.5 rounded-full bg-slate-800">
                      <span
                        className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{ left: `${Math.min(100, Math.max(0, percent))}%`, background: B, boxShadow: `0 0 6px ${B}` }}
                      />
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