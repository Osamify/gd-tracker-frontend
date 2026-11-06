import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * "Level not found" page, in the same style as /levels: dark panel, lime accent, angled corners,
 * monospace labels, tick progress bar.
 *
 * The clever part: the bar in the middle is a practice run. It fills up tick by tick, then hits a red
 * spike and stops. Your run died here, because this level is not in your tracker.
 *
 * Server component (no hooks, no "use client"): the animation is plain CSS.
 * FILE: components/NotFound.tsx (or wherever your LevelNotFound lives; keep the default export)
 */

const BRAND = '#d4ff3a' // lime accent, same as the levels page
const RED = '#ef4444' // the spike
const TICKS = 36 // how many ticks the bar has
const DEATH = 15 // the run dies at this tick (about 42%)

// Angled corners, like <Cut/> on the levels page.
const cut = (c: number) => `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`

const CSS = `
@keyframes nf-in { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes nf-tick { from { opacity: .1; transform: skewX(-18deg) scaleY(.35) } to { opacity: 1; transform: skewX(-18deg) scaleY(1) } }
@keyframes nf-flicker { 0%, 90%, 100% { transform: none; opacity: .5 } 92% { transform: translate(-7px, 2px); opacity: .95 } 94% { transform: translate(6px, -2px); opacity: .7 } 96% { transform: translate(-3px, 1px); opacity: .85 } }
@keyframes nf-pulse { 0%, 100% { filter: drop-shadow(0 0 3px ${RED}) } 50% { filter: drop-shadow(0 0 14px ${RED}) } }
@keyframes nf-pop { from { opacity: 0; transform: scale(.4) translateY(8px) } to { opacity: 1; transform: none } }
.nf-in { animation: nf-in .7s cubic-bezier(.2, .8, .2, 1) both }
.nf-tick { transform: skewX(-18deg); animation: nf-tick .35s ease-out both }
.nf-ghost { animation: nf-flicker 5s steps(1, end) infinite }
.nf-spike { animation: nf-pop .35s ease-out both, nf-pulse 1.6s ease-in-out 1.4s infinite }
@media (prefers-reduced-motion: reduce) { .nf-in, .nf-tick, .nf-ghost, .nf-spike { animation: none !important } }
`

export default function LevelNotFound() {
  const mono = 'font-mono text-[10px] font-bold uppercase tracking-[0.3em]'

  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#08090b] p-5 text-center text-slate-200 sm:p-8">
      <style>{CSS}</style>

      {/* backdrop: faint grid + a lime glow top left + a red glow where the run ended */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(70% 70% at 50% 45%, #000, transparent)',
            WebkitMaskImage: 'radial-gradient(70% 70% at 50% 45%, #000, transparent)',
          }}
        />
        <div className="absolute inset-0" style={{ background: `radial-gradient(45% 45% at 12% 8%, ${BRAND}1f, transparent 70%)` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(40% 35% at 50% 62%, ${RED}18, transparent 70%)` }} />
      </div>

      {/* corner marks of the screen, like the filter box on /levels */}
      {[
        'left-4 top-4 border-l-2 border-t-2',
        'right-4 top-4 border-r-2 border-t-2',
        'bottom-4 left-4 border-b-2 border-l-2',
        'bottom-4 right-4 border-b-2 border-r-2',
      ].map((c) => (
        <span key={c} className={`pointer-events-none absolute size-5 ${c}`} style={{ borderColor: BRAND }} aria-hidden="true" />
      ))}

      {/* brand, top left */}
      <Link href="/levels" className="absolute left-6 top-6 flex items-center gap-3 sm:left-10 sm:top-9" aria-label="GD Tracker, back to levels">
        <svg viewBox="0 0 200 200" className="size-9" role="img" aria-hidden="true">
          <path d="M22 0H178L200 22V178L178 200H22L0 178V22Z" fill="#0d1013" />
          <path d="M22 0H178L200 22V178L178 200H22L0 178V22Z" fill="none" stroke={BRAND} strokeWidth="3" opacity=".35" />
          <g transform="translate(0 -14)">
            <path d="M92 64H58Q42 64 42 80V120Q42 136 58 136H92V102H70" fill="none" stroke={BRAND} strokeWidth="20" />
            <path d="M120 64H136Q164 64 164 100Q164 136 136 136H120Z" fill="none" stroke="#fff" strokeWidth="20" />
          </g>
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={42 + i * 12.5} y="150" width="9.5" height="12" fill={BRAND} opacity={i < 7 ? 1 : 0.22} />
          ))}
          <path d="M0 22V0H22M200 178V200H178" fill="none" stroke={BRAND} strokeWidth="6" />
        </svg>
        <span className="hidden font-heading text-lg font-black uppercase leading-none tracking-tighter sm:block" style={{ WebkitTextStroke: `1px ${BRAND}`, color: 'transparent' }}>
          Tracker
        </span>
      </Link>

      <div className="flex w-full max-w-2xl flex-col items-center gap-7">
        {/* eyebrow */}
        <div className={`${mono} nf-in flex items-center gap-2 text-slate-500`}>
          <span className="size-1.5" style={{ background: RED }} />
          Error
          <span className="text-slate-700">//</span>
          Level not found
        </div>

        {/* the big 404: outlined lime, with a red ghost copy that glitches now and then */}
        <div className="nf-in relative select-none" style={{ animationDelay: '80ms' }} aria-hidden="true">
          <div className="nf-ghost absolute inset-0 font-heading text-[8rem] font-black leading-[0.85] tracking-tighter sm:text-[12rem]" style={{ color: RED, WebkitTextStroke: `2px ${RED}`, WebkitTextFillColor: 'transparent' }}>
            404
          </div>
          <div className="relative font-heading text-[8rem] font-black leading-[0.85] tracking-tighter sm:text-[12rem]" style={{ WebkitTextStroke: `2px ${BRAND}`, color: 'transparent' }}>
            404
          </div>
        </div>

        <div className="nf-in" style={{ animationDelay: '160ms' }}>
          <h1 className="font-heading text-3xl font-black uppercase leading-none tracking-tight text-white sm:text-4xl">Level not found</h1>
          <p className="mt-3 text-sm text-slate-400">This level is not in your tracker.</p>
        </div>

        {/* the practice run that ends on a spike */}
        <div className="nf-in w-full" style={{ animationDelay: '260ms' }}>
          <div className="p-px" style={{ clipPath: cut(14), background: 'rgba(255,255,255,.1)' }}>
            <div className="px-5 pb-5 pt-4 sm:px-7" style={{ clipPath: cut(14), background: '#0d1013' }}>
              <div className={`${mono} flex items-center justify-between !text-[9px] !tracking-[0.22em] text-slate-500`}>
                <span>Attempt 404</span>
                <span style={{ color: RED }}>Run ended</span>
              </div>

              <div className="mt-4 flex h-9 items-end gap-[3px]" role="img" aria-label="A practice run that stops at a spike">
                {Array.from({ length: TICKS }, (_, i) => {
                  if (i === DEATH)
                    return (
                      <svg key={i} viewBox="0 0 20 28" className="nf-spike -mx-0.5 h-9 w-5 shrink-0" style={{ animationDelay: `${DEATH * 55}ms, ${DEATH * 55 + 900}ms` }} aria-hidden="true">
                        <path d="M10 0L20 28H0Z" fill={RED} />
                      </svg>
                    )
                  const lit = i < DEATH
                  return (
                    <span
                      key={i}
                      className={`h-full flex-1 ${lit ? 'nf-tick' : ''}`}
                      style={
                        lit
                          ? { background: BRAND, animationDelay: `${i * 55}ms`, opacity: 0.35 + (i / DEATH) * 0.65 }
                          : { background: 'rgba(255,255,255,.09)', transform: 'skewX(-18deg)' }
                      }
                    />
                  )
                })}
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-slate-500">
                <span>0%</span>
                <span>the run died here, there is nothing at this address</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* way back */}
        <div className="nf-in flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '360ms' }}>
          <Link
            href="/levels"
            className="group inline-flex items-center gap-2.5 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5"
            style={{ background: BRAND, clipPath: cut(10), boxShadow: `0 14px 34px -14px ${BRAND}` }}
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-1" />
            Back to levels
          </Link>
          <span className="font-mono text-[11px] text-slate-600">
            Try again with a different id, or press <kbd className="rounded border border-white/15 px-1.5 text-slate-400">/</kbd> on the levels page to search.
          </span>
        </div>
      </div>
    </main>
  )
}