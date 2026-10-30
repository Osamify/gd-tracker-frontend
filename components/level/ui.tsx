"use client"
import { useState, useRef, useEffect, ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { panel, formatDuration } from '../../lib/level-helpers'



export function useCountUp(target: number, duration = 1000) {
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

// Use it like <AnimatedNumber value={95} suffix="%" />  -> counts up to 95%.
// toLocaleString adds thousands commas (2,840).
export function AnimatedNumber({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const v = useCountUp(value)
  return (
    <>
      {v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  )
}

// Collapsible = a card with a clickable title that opens/closes its content.
// Each one keeps its OWN `open` state, that is why the lists open independently.
// `defaultOpen=false` -> starts closed.  The grid-rows-[0fr] -> [1fr] trick animates the height.
export function Collapsible({
  title, icon, count, defaultOpen = false, children,
}: {
  title: string; icon: ReactNode; count?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`${panel} overflow-hidden`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.03]"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">{icon}</span>
        <span className="flex-1 font-heading text-base font-bold text-white">{title}</span>
        {count && (
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-300">{count}</span>
        )}
        <ChevronDown className={`size-5 text-slate-500 transition-transform duration-300 ${open ? 'rotate-180 text-cyan-300' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-800 p-4">{children}</div>
        </div>
      </div>
    </section>
  )
}

/** Shows /gdfaces/<difficulty>-<tier>.png, and falls back to <difficulty>-rated.png if that file does not exist. */
export function Face({ difficulty, tier, alt, className }: { difficulty: string; tier: string; alt: string; className?: string }) {
  const [stage, setStage] = useState(0)
  useEffect(() => setStage(0), [difficulty, tier])
  if (stage > 1) return null
  const src = stage === 0 ? `/gdfaces/${difficulty}-${tier}.png` : `/gdfaces/${difficulty}-rated.png`
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setStage((n) => n + 1)} />
}


// RunRow = ONE row in the 'Best Runs to 100%' and 'All Runs' lists:
//   badge (number) | "12% -> 45%" (+FINISH tag if it reached 100%, ×count if repeated) | the bar
//   `length` = level length in seconds, used to show how long that stretch takes.
//   `highlight` = cyan border (the run is part of the minimum route),  `fresh` = flash animation,
//   `delay` = animation delay so rows appear one after another,  `attemptNo` = attempt number.
export function RunRow({
  startPercent, endPercent, length, badge, badgeTone = 'bg-slate-800 text-slate-400', highlight = false, delay = 0, fresh = false, attemptNo, count = 1,
}: {
  startPercent: number; endPercent: number; length: number; badge: ReactNode; badgeTone?: string; highlight?: boolean; delay?: number; fresh?: boolean; attemptNo?: number; count?: number;
}) {
  return (
    <li
      className={`gd-rise flex items-center gap-3 rounded-xl border p-2.5 ${fresh ? 'gd-flash' : ''} ${highlight ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-slate-800 bg-white/[0.02]'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold tabular-nums ${badgeTone}`}>
        {badge}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 font-bold tabular-nums text-white">
            {startPercent}% <span className="text-slate-600">→</span> {endPercent}%
            {endPercent >= 100 && (
              <span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                FINISH
              </span>
            )}
            {count > 1 && (
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-extrabold tabular-nums text-pink-300">×{count}</span>
            )}
          </span>
          <span className="text-xs tabular-nums text-slate-500">
            +{endPercent - startPercent}% · {length > 0 ? formatDuration((length * (endPercent - startPercent)) / 100) : '—'}
            {attemptNo != null && count === 1 && <> · att. #{attemptNo.toLocaleString('en-US')}</>}
          </span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="gd-grow absolute h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
            style={{ left: `${startPercent}%`, width: `${Math.max(1, endPercent - startPercent)}%`, animationDelay: `${delay + 120}ms` }}
          />
        </div>
      </div>
    </li>
  )
}

