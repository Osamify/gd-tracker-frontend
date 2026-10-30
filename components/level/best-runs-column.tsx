// components/level-details/best-runs-column.tsx
import { Medal, Rocket, AlertTriangle, Flag } from 'lucide-react';
import { Collapsible, RunRow } from './ui';
import { type RunPlan, type Run } from '@/lib/tracker';
import { runKey as getRunKey } from '@/lib/level-helpers';

// Level colours. themeVars() on the page root sets them; if it is missing, the default palette is used.
const A = 'var(--lv-a, #fde047)';
const B = 'var(--lv-b, #fb923c)';
const C = 'var(--lv-c, #f43f5e)';

// Type definition for grouped runs
type RunGroup = Run & { count: number; keys: string[] };

interface BestRunsColumnProps {
  bestRuns: RunGroup[];
  plan: RunPlan;
  chain: Run[];
  totalSecs: number;
  t: (secs: number) => string;
  freshKey: string | null;
}

// Rank chips: gold, silver, bronze, then plain. Full class names so Tailwind can see them.
const RANK = [
  'bg-gradient-to-br from-yellow-200 to-amber-400 text-amber-950 shadow-[0_0_14px_-2px_rgba(251,191,36,0.7)]',
  'bg-gradient-to-br from-slate-100 to-slate-400 text-slate-900 shadow-[0_0_12px_-3px_rgba(203,213,225,0.5)]',
  'bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950 shadow-[0_0_12px_-3px_rgba(251,146,60,0.6)]',
];

export default function BestRunsColumn({
  bestRuns, plan, chain, totalSecs, t, freshKey
}: BestRunsColumnProps) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* Best runs */}
      <Collapsible title="Best Runs" icon={<Medal className="size-4" />} count={`Top ${bestRuns.length}`}>
        <ol className="flex flex-col gap-2">
          {bestRuns.map((r, i) => {
            const gain = r.endPercent - r.startPercent;
            const fresh = freshKey && r.keys.includes(freshKey);
            return (
              <li
                key={`${r.startPercent}-${r.endPercent}`}
                className={`gd-rise relative flex items-center gap-3 overflow-hidden rounded-xl border bg-white/[0.02] p-2.5 ${fresh ? 'gd-flash' : ''}`}
                style={{
                  animationDelay: `${Math.min(i, 10) * 45}ms`,
                  borderColor: i === 0 ? `color-mix(in srgb, ${A} 40%, transparent)` : 'rgb(30 41 59)',
                }}
              >
                {/* the best run gets a soft glow behind it */}
                {i === 0 && (
                  <div className="pointer-events-none absolute -left-8 top-1/2 size-24 -translate-y-1/2 rounded-full opacity-25 blur-2xl" style={{ background: A }} aria-hidden="true" />
                )}

                <span
                  className={`relative grid size-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold tabular-nums ${RANK[i] ?? 'bg-slate-800 text-slate-400'}`}
                >
                  {i + 1}
                </span>

                <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-sm">
                    <span className="flex items-center gap-2 font-bold tabular-nums text-white">
                      {r.startPercent}% <span className="text-slate-600">→</span> {r.endPercent}%
                      {r.count > 1 && (
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums text-white"
                          style={{ background: `color-mix(in srgb, ${C} 55%, #0f172a)` }}
                        >
                          ×{r.count}
                        </span>
                      )}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      <span className="font-bold" style={{ color: A }}>+{gain}%</span> · {t((totalSecs * gain) / 100)}
                      {r.totalAttempts != null && r.count === 1 && <> · att. #{r.totalAttempts.toLocaleString('en-US')}</>}
                    </span>
                  </div>

                  {/* where this run sits on the level: lit segment on a 0-100 track with quarter ticks */}
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="gd-grow absolute h-full rounded-full"
                      style={{
                        left: `${r.startPercent}%`,
                        width: `${Math.max(1, gain)}%`,
                        background: `linear-gradient(to right, ${A}, ${B})`,
                        boxShadow: `0 0 8px ${B}`,
                        animationDelay: `${Math.min(i, 10) * 45 + 120}ms`,
                      }}
                    />
                    {[25, 50, 75].map((m) => (
                      <span key={m} className="absolute top-0 h-full w-px bg-black/40" style={{ left: `${m}%` }} />
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Collapsible>

      {/* Best runs to 100% */}
      <Collapsible title="Best Runs to 100%" icon={<Rocket className="size-4" />} count={plan.complete ? `${plan.count} runs` : 'Gap found'}>
        {!plan.complete && (
          <p className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertTriangle className="size-4 shrink-0" />
            No run covers {plan.gapAt}% yet. This is the partial route so far.
          </p>
        )}
        {chain.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-sm text-slate-500">
            Log a practice run to build your route to 100%.
          </p>
        ) : (
          <>
            {/* route map: one bar per run, stacked like stairs, so you see how the runs join up */}
            <div className="mb-3 rounded-xl border border-slate-800 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span>Route map</span>
                <span className="flex items-center gap-1" style={{ color: plan.complete ? A : undefined }}>
                  <Flag className="size-3" />
                  {plan.complete ? 'reaches 100%' : `stops at ${plan.gapAt}%`}
                </span>
              </div>
              <div className="relative flex flex-col gap-1">
                {chain.map((r, i) => (
                  <div key={`${getRunKey(r)}-${i}`} className="relative h-2.5 rounded-full bg-slate-800/70">
                    <div
                      className="gd-grow absolute h-full rounded-full"
                      style={{
                        left: `${r.startPercent}%`,
                        width: `${Math.max(1.5, r.endPercent - r.startPercent)}%`,
                        background: `linear-gradient(to right, ${i % 2 === 0 ? A : B}, ${i % 2 === 0 ? B : C})`,
                        boxShadow: `0 0 8px color-mix(in srgb, ${B} 60%, transparent)`,
                        animationDelay: `${i * 70}ms`,
                      }}
                    />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 pl-1 text-[8px] font-extrabold leading-none text-[#070b0e]"
                      style={{ left: `${r.startPercent}%` }}
                    >
                      {i + 1}
                    </span>
                  </div>
                ))}
                {/* quarter lines over all the bars */}
                {[25, 50, 75].map((m) => (
                  <span key={m} className="pointer-events-none absolute inset-y-0 w-px bg-white/10" style={{ left: `${m}%` }} />
                ))}
              </div>
              <div className="relative mt-1 h-3 text-[10px] font-semibold tabular-nums text-slate-600">
                {[0, 25, 50, 75, 100].map((m) => (
                  <span
                    key={m}
                    className="absolute top-0"
                    style={{ left: `${m}%`, transform: m === 0 ? 'none' : m === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}
                  >
                    {m}%
                  </span>
                ))}
              </div>
            </div>

            <ol className="flex flex-col gap-2">
              {chain.map((r, i) => (
                <RunRow
                  key={`${getRunKey(r)}-${i}`}
                  startPercent={r.startPercent}
                  endPercent={r.endPercent}
                  length={totalSecs}
                  badge={i + 1}
                  badgeTone="bg-orange-400/15 text-orange-300"
                  highlight
                  delay={Math.min(i, 10) * 45}
                  attemptNo={r.totalAttempts}
                  fresh={freshKey === getRunKey(r)}
                />
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Clear these {chain.length} runs back to back to cover 0% → 100%
              {plan.complete ? '.' : ' (route incomplete).'}
            </p>
          </>
        )}
      </Collapsible>
    </div>
  )
}