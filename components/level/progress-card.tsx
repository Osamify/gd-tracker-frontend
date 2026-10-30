import { Crosshair, Route, AlertTriangle, Target } from 'lucide-react';
import { GlowProgress } from '../ui/progress';
import { AnimatedNumber } from './ui';
import { panel } from '@/lib/level-helpers';
import type { RunPlan } from '@/lib/tracker';
import { type CSSProperties } from 'react';

// Level colours. themeVars() on the page root sets them; if it is missing, the default palette is used.
const A = 'var(--lv-a, #fde047)';
const B = 'var(--lv-b, #fb923c)';
const C = 'var(--lv-c, #f43f5e)';

interface ProgressCardProps {
  best: number;
  animBest: number;
  plan: RunPlan;
  t: (secs: number) => string;
  totalSecs: number;
  density: number[];
  densityMax: number;
  weakest: { start: number; end: number; count: number } | null;
  levelName: string;
}

export default function ProgressCard({
  best, animBest, plan, t, totalSecs, density, densityMax, weakest, levelName
}: ProgressCardProps) {
  const uncovered = density.filter((n) => n === 0).length;
  const coveredPct = density.length ? Math.round(((density.length - uncovered) / density.length) * 100) : 0;

  return (
    <section className={`${panel} relative flex flex-col gap-5 overflow-hidden p-5`}>
      {/* soft glow in the corner, in the level colour */}
      <div className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full opacity-15 blur-3xl" style={{ background: B }} aria-hidden="true" />

      <div className="relative flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-white">
          <Crosshair className="size-4" style={{ color: A }} />
          Progress
        </h2>
        <span className="font-heading text-lg font-extrabold tabular-nums text-white">
          <AnimatedNumber value={best} />%
        </span>
      </div>

      <GlowProgress value={animBest} label={`${levelName} best run ${best}%`} />

      {/* minimum runs to 100% (or the first gap) */}
      {plan.complete ? (
        <div
          className="relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border p-3"
          style={{ borderColor: `color-mix(in srgb, ${B} 35%, transparent)`, background: `color-mix(in srgb, ${B} 8%, transparent)` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg text-[#070b0e]"
              style={{ background: `linear-gradient(135deg, ${A}, ${B})` }}
            >
              <Route className="size-4" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Minimum runs to 100%</div>
              <div className="text-xs text-slate-400">Fewest practice runs that cover the whole level</div>
            </div>
          </div>
          <span className="font-heading text-3xl font-extrabold tabular-nums text-white">
            <AnimatedNumber value={plan.count} />
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-500/20 text-red-300">
            <AlertTriangle className="size-4" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">No practice run covers {plan.gapAt}% yet</div>
            <div className="text-xs text-slate-400">That is the first gap in your coverage.</div>
          </div>
        </div>
      )}

      {/* practice coverage strip: one thin bar per percent */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span>
            Practice coverage <span className="ml-1 text-slate-400">{coveredPct}%</span>
          </span>
          <span>{t(totalSecs)}</span>
        </div>

        <div className="relative flex h-8 items-end gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-900/80 p-0.5">
          {density.map((n, i) => {
            const h = n === 0 ? 100 : 28 + 72 * (n / densityMax);
            return (
              <div
                key={i}
                title={`${i}–${i + 1}%: ${n} ${n === 1 ? 'run' : 'runs'}`}
                className="gd-fade flex-1 rounded-[1px]"
                style={
                  {
                    height: `${h}%`,
                    '--o': n === 0 ? 0.55 : 0.4 + 0.6 * (n / densityMax),
                    background:
                      n === 0
                        ? 'repeating-linear-gradient(135deg, rgba(244,63,94,.35) 0 2px, transparent 2px 4px)'
                        : `linear-gradient(to top, ${B}, ${A})`,
                    animationDelay: `${i * 6}ms`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>

        <div className="relative h-3 text-[10px] font-semibold tabular-nums text-slate-600">
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

        <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-10 rounded-full" style={{ background: `linear-gradient(to right, color-mix(in srgb, ${A} 30%, transparent), ${B})` }} />
            fewer → more runs
          </span>
          {uncovered > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-[2px] border border-red-400/40"
                style={{ background: 'repeating-linear-gradient(135deg, rgba(244,63,94,.5) 0 2px, transparent 2px 4px)' }}
              />
              not covered
            </span>
          )}
        </div>
      </div>

      {/* what to practise next, with a small map of where it sits in the level */}
      {weakest && (
        <div
          className="relative overflow-hidden rounded-xl border p-3"
          style={{ borderColor: `color-mix(in srgb, ${C} 30%, transparent)`, background: `color-mix(in srgb, ${C} 6%, transparent)` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
              style={{ background: `linear-gradient(135deg, ${B}, ${C})`, boxShadow: `0 0 18px -4px ${C}` }}
            >
              <Target className="size-4" />
            </span>
            <div className="min-w-0 flex-1 text-sm leading-tight">
              <div className="font-bold text-white">
                Practice next: {weakest.start}–{weakest.end}%
              </div>
              <div className="text-xs text-slate-400">
                {weakest.count === 0
                  ? 'No run covers this part yet.'
                  : `Only ${weakest.count} ${weakest.count === 1 ? 'run covers' : 'runs cover'} this part, the least of the level.`}
              </div>
            </div>
          </div>

          {/* mini map: the section is lit up on a 0-100% line */}
          <div className="relative mt-3 h-1.5 rounded-full bg-slate-800">
            <div
              className="absolute top-0 h-full rounded-full"
              style={{
                left: `${weakest.start}%`,
                width: `${Math.max(1.5, weakest.end - weakest.start)}%`,
                background: `linear-gradient(to right, ${B}, ${C})`,
                boxShadow: `0 0 10px ${C}`,
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}