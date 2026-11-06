"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react'

/**
 * "Could not load this page" screen, in the same style as /levels and the 404 page: dark panel, lime accent,
 * angled corners, monospace labels.
 *
 * The clever part: a heartbeat line runs across the top, beats a few times, then goes flat and turns red
 * (the backend stopped answering). Under it a small terminal types out what happened, ending with a blinking cursor.
 *
 * Must be a client component: Next.js error boundaries are (the `reset` function runs in the browser).
 * FILE: the same file you have now (an error.tsx next to the page that can fail). Keep the default export.
 */

const BRAND = '#d4ff3a' // lime accent, same as the levels page
const RED = '#ef4444' // the failure

// Angled corners, like <Cut/> on the levels page.
const cut = (c: number) => `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`

const CSS = `
@keyframes er-in { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes er-draw { to { stroke-dashoffset: 0 } }
@keyframes er-line { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: none } }
@keyframes er-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
@keyframes er-glow { 0%, 100% { filter: drop-shadow(0 0 2px ${RED}) } 50% { filter: drop-shadow(0 0 10px ${RED}) } }
@keyframes er-spin { to { transform: rotate(360deg) } }
.er-in { animation: er-in .7s cubic-bezier(.2, .8, .2, 1) both }
.er-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: er-draw 1.8s ease-out both }
.er-flat { stroke-dasharray: 1; stroke-dashoffset: 1; animation: er-draw .9s linear 1.7s both, er-glow 1.8s ease-in-out 2.6s infinite }
.er-line { animation: er-line .4s ease-out both }
.er-cursor { animation: er-blink 1s steps(1, end) infinite }
.er-spin { animation: er-spin 1s linear infinite }
@media (prefers-reduced-motion: reduce) { .er-in, .er-draw, .er-flat, .er-line, .er-cursor, .er-spin { animation: none !important } .er-draw, .er-flat { stroke-dashoffset: 0 } }
`

export default function LevelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // "Trying..." on the button until the page remounts (a failed retry shows this screen again, fresh)
  const [busy, setBusy] = useState(false)

  // keep the real error in the browser console (it is never shown on the page)
  useEffect(() => {
    console.error(error)
  }, [error])

  const mono = 'font-mono text-[10px] font-bold uppercase tracking-[0.3em]'
  const logLine = 'er-line flex gap-2'

  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#08090b] p-5 text-center text-slate-200 sm:p-8">
      <style>{CSS}</style>

      {/* backdrop: faint grid + a lime glow top left + a red glow in the middle */}
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
        <div className="absolute inset-0" style={{ background: `radial-gradient(40% 35% at 50% 40%, ${RED}18, transparent 70%)` }} />
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
        <div className={`${mono} er-in flex items-center gap-2 text-slate-500`}>
          <span className="size-1.5 animate-pulse" style={{ background: RED }} />
          Error
          <span className="text-slate-700">//</span>
          No response
        </div>

        {/* the heartbeat: beats, then flat-lines in red */}
        <div className="er-in w-full" style={{ animationDelay: '80ms' }} aria-hidden="true">
          <svg viewBox="0 0 600 70" className="h-auto w-full">
            <path
              className="er-draw"
              pathLength={1}
              d="M0 35H90L104 35L114 10L128 60L140 35H196L206 22L216 35H262L272 12L286 58L298 35H330"
              fill="none"
              stroke={BRAND}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path className="er-flat" pathLength={1} d="M330 35H600" fill="none" stroke={RED} strokeWidth="2.5" />
          </svg>
        </div>

        <div className="er-in" style={{ animationDelay: '160ms' }}>
          <h1 className="font-heading text-3xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl">Could not load this page</h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-400">The backend did not answer. Check that it is running, then try again.</p>
        </div>

        {/* what happened, as a little terminal */}
        <div className="er-in w-full" style={{ animationDelay: '260ms' }}>
          <div className="p-px" style={{ clipPath: cut(14), background: 'rgba(255,255,255,.1)' }}>
            <div className="px-5 py-4 text-left font-mono text-xs leading-relaxed sm:px-7" style={{ clipPath: cut(14), background: '#0d1013' }} role="status">
              <div className={logLine} style={{ animationDelay: '500ms' }}>
                <span style={{ color: BRAND }}>&gt;</span>
                <span className="text-slate-400">asking the backend for your levels...</span>
              </div>
              <div className={logLine} style={{ animationDelay: '1300ms' }}>
                <span style={{ color: BRAND }}>&gt;</span>
                <span className="text-slate-400">waiting for an answer...</span>
              </div>
              <div className={logLine} style={{ animationDelay: '2200ms' }}>
                <span style={{ color: RED }}>&gt;</span>
                <span style={{ color: RED }}>no response</span>
                <span className="er-cursor ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5" style={{ background: RED }} />
              </div>
              {error.digest && (
                <div className="mt-3 border-t border-white/[0.06] pt-2 text-[10px] text-slate-600">
                  reference <span className="text-slate-500">{error.digest}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="er-in flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '360ms' }}>
          <button
            onClick={() => {
              setBusy(true)
              reset()
            }}
            disabled={busy}
            className="group inline-flex items-center gap-2.5 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 disabled:opacity-70"
            style={{ background: BRAND, clipPath: cut(10), boxShadow: `0 14px 34px -14px ${BRAND}` }}
          >
            {busy ? <Loader2 className="er-spin size-4" /> : <RotateCcw className="size-4 transition group-hover:-rotate-90" />}
            {busy ? 'Trying...' : 'Try again'}
          </button>
          <Link
            href="/levels"
            className="group inline-flex items-center gap-2.5 border border-white/15 bg-black/30 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition hover:border-white/40 hover:text-white"
            style={{ clipPath: cut(10) }}
          >
            <ArrowLeft className="size-4 transition group-hover:-translate-x-1" />
            Back to levels
          </Link>
        </div>
      </div>
    </main>
  )
}