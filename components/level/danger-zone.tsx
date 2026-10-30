import { Flame, Skull, Clock } from 'lucide-react'
import { panel } from '../../lib/level-helpers'

interface DangerZonesProps {
  dangerZones: { percent: number; count: number }[];
  totalSecs: number;
  t: (secs: number) => string; // The time formatter function from LevelInfo
}

// Look of each rank (#1 is the worst). Classes are written out in full so Tailwind can see them.
// `mark` is the colour of the diamond on the level map.
const SEVERITY = [
  { label: 'Critical', pill: 'border-red-500/40 bg-red-500/15 text-red-300', badge: 'bg-red-500/20 text-red-300 ring-red-500/40', heat: 'from-red-500/25', border: 'border-red-500/30', count: 'text-red-300', mark: '#ef4444' },
  { label: 'High', pill: 'border-orange-400/40 bg-orange-400/15 text-orange-300', badge: 'bg-orange-400/20 text-orange-300 ring-orange-400/40', heat: 'from-orange-400/20', border: 'border-orange-400/25', count: 'text-orange-300', mark: '#fb923c' },
  { label: 'Watch', pill: 'border-amber-300/40 bg-amber-300/15 text-amber-200', badge: 'bg-amber-300/20 text-amber-200 ring-amber-300/40', heat: 'from-amber-300/15', border: 'border-amber-300/20', count: 'text-amber-200', mark: '#fcd34d' },
] as const

export default function DangerZone({ dangerZones, totalSecs, t }: DangerZonesProps) {
  // the biggest death count, so every bar and marker can be sized against it
  const max = Math.max(1, ...dangerZones.map((z) => z.count))

  return (
    <div className={`${panel} relative overflow-hidden p-5`}>
      {/* soft red glow in the corner */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-red-500/15 blur-3xl" aria-hidden="true" />

      <div className="relative mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-white">
          <Flame className="size-4 text-orange-400" />
          Danger zones
        </h2>
        {dangerZones.length > 0 && (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-red-300">
            Top {dangerZones.length}
          </span>
        )}
      </div>

      {dangerZones.length === 0 ? (
        <div className="relative flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-800 p-6 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-slate-800/70 text-slate-500">
            <Flame className="size-5" />
          </span>
          <p className="text-sm font-semibold text-slate-300">No deaths logged yet</p>
          <p className="text-xs text-slate-500">Play some attempts and your hardest spots show up here.</p>
        </div>
      ) : (
        <>
          {/* Level map: where the danger zones are along the level (0% on the left, 100% on the right). Bigger diamond = more deaths. */}
          <div className="relative mb-1">
            <div className="relative h-12 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800" />
              {dangerZones.map((z, i) => {
                const sev = SEVERITY[Math.min(i, SEVERITY.length - 1)]
                const size = 10 + 14 * (z.count / max)
                return (
                  <span
                    key={z.percent}
                    title={`${z.percent}%: ${z.count} ${z.count === 1 ? 'death' : 'deaths'}`}
                    className="gd-rise absolute rotate-45 rounded-[4px]"
                    style={{
                      left: `${Math.min(97, Math.max(3, z.percent))}%`,
                      bottom: 10,
                      width: size,
                      height: size,
                      marginLeft: -size / 2,
                      background: sev.mark,
                      boxShadow: `0 0 18px 3px ${sev.mark}`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                )
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-semibold tabular-nums text-slate-600">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <ul className="relative mt-3 flex flex-col gap-2.5">
            {dangerZones.map((z, i) => {
              const sev = SEVERITY[Math.min(i, SEVERITY.length - 1)]
              return (
                <li
                  key={z.percent}
                  className={`gd-rise relative overflow-hidden rounded-xl border bg-white/[0.02] p-3 ${sev.border}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  {/* heat bar behind the row: longer = more deaths than the others */}
                  <div
                    className={`gd-grow pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r ${sev.heat} to-transparent`}
                    style={{ width: `${(z.count / max) * 100}%`, animationDelay: `${i * 90 + 150}ms` }}
                    aria-hidden="true"
                  />

                  <div className="relative flex items-center gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-base font-extrabold ring-1 ${sev.badge}`}>
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading text-xl font-extrabold tabular-nums text-white">{z.percent}%</span>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${sev.pill}`}>{sev.label}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="size-3" />
                        at {t((totalSecs * z.percent) / 100)}
                      </div>
                    </div>

                    <div className="text-right leading-none">
                      <div className={`flex items-center justify-end gap-1.5 font-heading text-2xl font-extrabold tabular-nums ${sev.count}`}>
                        <Skull className="size-4 opacity-80" />×{z.count}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{z.count === 1 ? 'death' : 'deaths'}</div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}