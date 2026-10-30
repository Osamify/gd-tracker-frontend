import { BarChart3, Skull } from 'lucide-react'
import { panel } from '../../lib/level-helpers'

interface DeathDistributionProps {
  buckets: number[];     // 10 numbers: deaths in 0-9%, 10-19% ... 90-100%
  bucketMax: number;     // the biggest of those numbers (used to scale the bars)
  deathsCount: number;   // total deaths, used for the "No deaths logged" state
}

// Level colours. They come from the CSS variables that themeVars() sets on the page root.
// If those are not set, the second value (the default palette) is used.
const A = 'var(--lv-a, #fde047)'
const B = 'var(--lv-b, #fb923c)'
const C = 'var(--lv-c, #f43f5e)'

// "0-9%", "10-19%" ... the last bucket also holds 100%, so it reads "90-100%"
const range = (i: number) => `${i * 10}–${i === 9 ? 100 : i * 10 + 9}%`

// Fake bar heights for the empty state, so the card still looks like a chart
const GHOST = [30, 55, 40, 75, 50, 85, 45, 65, 35, 55]

export default function DeathDistribution({ buckets, bucketMax, deathsCount }: DeathDistributionProps) {
  const empty = deathsCount === 0
  const total = buckets.reduce((s, n) => s + n, 0)
  const peak = Math.max(...buckets)
  const peakIdx = empty ? -1 : buckets.indexOf(peak)
  const peakShare = total > 0 ? Math.round((peak / total) * 100) : 0
  const firstHalf = total > 0 ? Math.round((buckets.slice(0, 5).reduce((s, n) => s + n, 0) / total) * 100) : 0

  return (
    <div className={`${panel} relative overflow-hidden p-5`}>
      {/* soft glow in the corner, in the level colour */}
      <div className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full opacity-20 blur-3xl" style={{ background: B }} aria-hidden="true" />

      <div className="relative mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-white">
          <BarChart3 className="size-4" style={{ color: A }} />
          Death distribution
        </h2>
        {!empty && (
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-300">
            <Skull className="size-3 text-red-400" />
            {total.toLocaleString('en-US')}
          </span>
        )}
      </div>

      {/* chart: y labels on the left, dashed guide lines, then the 10 bars */}
      <div className="relative">
        <div className="relative h-40 pl-7">
          {/* horizontal guide lines at 0 / half / max, with their numbers */}
          {[0, 50, 100].map((g) => (
            <div key={g} className="pointer-events-none absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${g}%` }} aria-hidden="true">
              <span className="w-5 text-right text-[10px] font-semibold tabular-nums text-slate-600">
                {empty ? '' : g === 0 ? 0 : g === 100 ? bucketMax : Math.round(bucketMax / 2)}
              </span>
              <span className="h-px flex-1 border-t border-dashed border-white/[0.07]" />
            </div>
          ))}

          <div className={`relative flex h-full items-end gap-1.5 ${empty ? 'opacity-30' : ''}`}>
            {buckets.map((n, i) => {
              const isPeak = i === peakIdx
              const height = empty ? GHOST[i] : n === 0 ? 2 : Math.max(6, (n / bucketMax) * 100)
              return (
                <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end" title={`${range(i)}: ${n} ${n === 1 ? 'death' : 'deaths'}`}>
                  {/* the number above each bar (hidden when 0) */}
                  {!empty && n > 0 && (
                    <span className={`mb-1 text-[10px] font-extrabold tabular-nums transition-colors ${isPeak ? 'text-white' : 'text-slate-500 group-hover:text-slate-200'}`}>{n}</span>
                  )}
                  <div
                    className="gd-grow-y w-full rounded-t-lg transition-[filter] group-hover:brightness-125"
                    style={{
                      height: `${height}%`,
                      animationDelay: `${i * 50}ms`,
                      // the worst stretch is hot (yellow to red with a glow); the rest use the level colour
                      background: isPeak
                        ? 'linear-gradient(to top, #ef4444, #fbbf24)'
                        : n === 0
                          ? 'rgba(148,163,184,0.15)'
                          : `linear-gradient(to top, color-mix(in srgb, ${B} 55%, transparent), ${C})`,
                      boxShadow: isPeak ? '0 0 22px -2px rgba(239,68,68,0.8)' : undefined,
                      opacity: isPeak || empty ? 1 : n === 0 ? 1 : 0.85,
                    }}
                  />
                </div>
              )
            })}
          </div>

          {empty && (
            <div className="absolute inset-0 grid place-items-center pl-7">
              <p className="rounded-xl border border-white/10 bg-[#0a1015]/90 px-4 py-2 text-center text-xs font-semibold text-slate-300 backdrop-blur-md">
                No deaths logged yet
              </p>
            </div>
          )}
        </div>

        {/* x labels: one per bar, the start % of each bucket */}
        <div className="mt-1.5 flex gap-1.5 pl-7 text-[10px] font-semibold tabular-nums text-slate-600">
          {buckets.map((_, i) => (
            <span key={i} className={`flex-1 text-center ${i === peakIdx ? 'text-red-300' : ''}`}>{i * 10}</span>
          ))}
        </div>
        <div className="mt-0.5 pl-7 text-right text-[10px] font-semibold text-slate-600">% of the level</div>
      </div>

      {/* what the chart says, in plain words */}
      {!empty && (
        <div className="relative mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Worst stretch', value: range(peakIdx), tone: 'text-red-300' },
              { label: 'Of all deaths', value: `${peakShare}%`, tone: 'text-orange-300' },
              { label: 'In first half', value: `${firstHalf}%`, tone: 'text-slate-200' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-800 bg-white/[0.03] px-2.5 py-2">
                <div className="truncate text-[9px] font-bold uppercase tracking-widest text-slate-500">{s.label}</div>
                <div className={`font-heading text-sm font-extrabold tabular-nums ${s.tone}`}>{s.value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {firstHalf >= 50 ? 'Most of your deaths happen early in the level.' : 'Most of your deaths happen in the second half of the level.'}
          </p>
        </div>
      )}
    </div>
  )
}