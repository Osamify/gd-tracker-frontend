// components/level-details/progress-over-time.tsx
import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { panel, formatDate, runTime } from '../../lib/level-helpers';
import type { Run } from '@/lib/tracker';

interface ProgressOverTimeProps {
  runs: Run[];
}

export default function ProgressOverTime({ runs }: ProgressOverTimeProps) {
  // Prepare the chart numbers once per `runs` change.
  const data = useMemo(() => {
    const pts = runs.filter((r) => !Number.isNaN(runTime(r)))
    if (pts.length < 2) return null
    const t0 = runTime(pts[0])
    const t1 = runTime(pts[pts.length - 1])
    const span = t1 - t0
    let top = 0
    const points = pts.map((r, i) => {
      top = Math.max(top, r.endPercent)
      return { x: span > 0 ? ((runTime(r) - t0) / span) * 100 : (i / (pts.length - 1)) * 100, run: r.endPercent, best: top }
    })
    
    let line = `M${points[0].x} ${100 - points[0].best}`
    for (let i = 1; i < points.length; i++) line += ` H${points[i].x} V${100 - points[i].best}`
    line += ` H100`
    return { points, line, area: `${line} V100 H${points[0].x} Z`, t0, t1 }
  }, [runs])

  return (
    <section className={`${panel} flex flex-col gap-3 p-5`}>
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-white">
        <TrendingUp className="size-4 text-pink-300" />
        Progress over time
      </h2>
      
      {!data ? (
        <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-sm text-slate-500">
          Play a few more runs and your progress over time shows up here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-4 text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-cyan-300" />
              Run result
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded bg-pink-400" />
              Best so far
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex h-44 flex-col justify-between py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
            <div className="relative h-44 flex-1 rounded-lg border border-slate-800 bg-slate-900/60">
              <div className="gd-reveal absolute inset-0">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                  <defs>
                    <linearGradient id="gdTrendFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#f472b6" stopOpacity=".28" />
                      <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[25, 50, 75].map((g) => (
                    <line key={g} x1="0" x2="100" y1={100 - g} y2={100 - g} stroke="rgba(255,255,255,.07)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                  ))}
                  <path d={data.area} fill="url(#gdTrendFill)" />
                  <path d={data.line} fill="none" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                {data.points.map((p, i) => (
                  <span
                    key={i}
                    title={`${p.run}% (best so far ${p.best}%)`}
                    className="absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-300 ring-2 ring-[#0a1015]"
                    style={{ left: `${p.x}%`, bottom: `${p.run}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between pl-9 text-[10px] font-semibold text-slate-600" suppressHydrationWarning>
            <span suppressHydrationWarning>{formatDate(new Date(data.t0).toISOString())}</span>
            <span suppressHydrationWarning>{formatDate(new Date(data.t1).toISOString())}</span>
          </div>
        </div>
      )}
    </section>
  )
}