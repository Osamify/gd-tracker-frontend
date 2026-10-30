// components/ui/glow-progress.tsx
//
// "Level run" progress. Instead of a plain bar, the progress is a mini Geometry Dash level:
//   - a ground strip that fills up with flowing colour as your best % grows
//   - a cube that sits at the end of the fill and keeps hopping (it rotates 90deg each jump)
//   - a spike on the ground at 25 / 50 / 75%: bright red if you have not passed it, dim once cleared
//   - a finish portal at 100% that lights up green when you beat the level
//   - milestone labels under the ground and a caption ("Next milestone 75%, 12% to go")
//
//   <GlowProgress value={78} label="Daydream best run 78%" />
//   <GlowProgress value={animBest} size="md" milestones={false} caption={false} />
//
// COLOURS: three CSS variables, with the DEFAULT palette below as fallback:
//   --lv-a (start)   --lv-b (middle)   --lv-c (end)
// Set them once on a parent and the whole page follows:
//   <div style={themeVars(level.accent)}> ... </div>      // themeVars() is exported at the bottom
//
// No hooks, so it works in server and client components.

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type GlowProgressProps = {
  /** 0 to 100 (anything outside is clamped) */
  value: number
  /** Text read out by screen readers */
  label?: string
  /** md = small, lg = big */
  size?: 'md' | 'lg'
  /** Spikes + labels for 25 / 50 / 75 / 100 */
  milestones?: boolean
  /** "Next milestone ..." line at the bottom */
  caption?: boolean
  className?: string
}

// DEFAULT PALETTE (used when no level colour is set). "Ember": yellow -> orange -> rose.
// Change these three hex values to restyle the default. Other palettes:
//   Aurora:  #5eead4  #38bdf8  #818cf8        Toxic:  #bef264  #4ade80  #2dd4bf
const DEF_A = '#fde047'
const DEF_B = '#fb923c'
const DEF_C = '#f43f5e'
const A = `var(--lv-a, ${DEF_A})`
const B = `var(--lv-b, ${DEF_B})`
const C = `var(--lv-c, ${DEF_C})`
const GRADIENT = `linear-gradient(90deg, ${A}, ${B}, ${C})`
// Colours mirrored (A B C B A) so the sliding loop has no visible jump.
const FLOW = `linear-gradient(90deg, ${A}, ${B}, ${C}, ${B}, ${A})`
const MARKS = [25, 50, 75, 100]

// All sizes in px: cube = the player, hop = how high it jumps, ground = ground strip thickness
const SIZES = {
  lg: { cube: 28, hop: 32, ground: 16, stage: 92 },
  md: { cube: 22, hop: 24, ground: 12, stage: 70 },
} as const

const CSS = `
@keyframes gp-flow { from { background-position: 0% 0 } to { background-position: -200% 0 } }
@keyframes gp-sweep { from { transform: translateX(-120%) } to { transform: translateX(340%) } }
/* the hop: up with a quarter turn, then back down, then a rest. A square looks the same after 90deg, so the loop is seamless */
@keyframes gp-hop {
  0%   { transform: translateY(0) rotate(0deg); animation-timing-function: cubic-bezier(.25, .7, .4, 1) }
  30%  { transform: translateY(calc(var(--hop) * -1)) rotate(55deg); animation-timing-function: cubic-bezier(.6, 0, .9, .5) }
  52%  { transform: translateY(0) rotate(90deg) }
  100% { transform: translateY(0) rotate(90deg) }
}
@keyframes gp-trail { 0%, 100% { opacity: .55; transform: scaleX(1) } 30% { opacity: .25; transform: scaleX(.6) } }
@keyframes gp-next { 0%, 100% { opacity: .55 } 50% { opacity: 1 } }
@keyframes gp-portal { 0%, 100% { opacity: .7; transform: scaleY(.96) } 50% { opacity: 1; transform: scaleY(1.04) } }
@keyframes gp-done { 0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,.5), 0 0 18px 0 rgba(52,211,153,.35) } 50% { box-shadow: 0 0 0 8px rgba(52,211,153,0), 0 0 30px 4px rgba(52,211,153,.55) } }
.gp-flow { background-size: 200% 100%; animation: gp-flow 3.4s linear infinite }
.gp-sweep { animation: gp-sweep 2.6s ease-in-out infinite }
.gp-hop { animation: gp-hop 1.5s infinite }
.gp-hop-fast { animation: gp-hop .8s infinite }
.gp-trail { transform-origin: right; animation: gp-trail 1.5s ease-in-out infinite }
.gp-next { animation: gp-next 1.6s ease-in-out infinite }
.gp-portal { animation: gp-portal 1.8s ease-in-out infinite }
.gp-done { animation: gp-done 2s ease-out infinite }
`

export function GlowProgress({ value, label, size = 'lg', milestones = true, caption = true, className }: GlowProgressProps) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))
  const done = pct >= 100
  const next = MARKS.find((m) => pct < m) ?? 100
  const z = SIZES[size]
  // The cube's left edge. Kept inside the strip: never left of its own width, never into the portal.
  const cubeLeft = `clamp(${z.cube}px, ${pct}%, calc(100% - 16px))`
  const spikeW = Math.round(z.cube * 0.7)
  const spikeH = Math.round(z.cube * 0.8)

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn('w-full', className)}
    >
      <style>{CSS}</style>

      {/* the "level": ground at the bottom, everything else stands on it */}
      <div className="relative" style={{ height: z.stage }}>
        {/* ground: dark strip with the coloured fill inside */}
        <div
          className={cn('absolute inset-x-0 bottom-0 overflow-hidden rounded-xl bg-slate-950/90 ring-1 ring-inset ring-white/10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.7)]', done && 'gp-done')}
          style={{ height: z.ground }}
        >
          <div
            className="gp-flow absolute inset-y-0 left-0 overflow-hidden rounded-xl transition-[width] duration-150 ease-linear"
            style={{ width: `${pct}%`, backgroundImage: FLOW }}
          >
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent" aria-hidden="true" />
            <div className="gp-sweep absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/50 to-transparent" aria-hidden="true" />
          </div>
        </div>

        {/* glow of the fill, seen above the ground */}
        <div
          className="pointer-events-none absolute left-0 rounded-full opacity-40 blur-xl transition-[width] duration-150 ease-linear"
          style={{ width: `${pct}%`, bottom: z.ground - 4, height: z.cube * 0.9, background: GRADIENT }}
          aria-hidden="true"
        />

        {/* spikes at 25 / 50 / 75: red and glowing ahead of you, dim once you have cleared them */}
        {milestones &&
          [25, 50, 75].map((m) => {
            const cleared = pct >= m
            return (
              <div
                key={m}
                className="pointer-events-none absolute -translate-x-1/2 transition-opacity duration-500"
                style={{ left: `${m}%`, bottom: z.ground - 1, opacity: cleared ? 0.35 : 1, filter: cleared ? 'none' : `drop-shadow(0 0 6px ${C})` }}
                aria-hidden="true"
              >
                <div
                  style={{
                    width: spikeW,
                    height: spikeH,
                    clipPath: 'polygon(50% 0, 0 100%, 100% 100%)',
                    background: cleared ? '#475569' : `linear-gradient(to top, ${B}, ${C})`,
                  }}
                />
              </div>
            )
          })}

        {/* finish portal at 100%: a tall capsule that turns green when the level is beaten */}
        <div
          className={cn('gp-portal pointer-events-none absolute right-0 rounded-full border-2', done ? 'border-emerald-300 bg-emerald-400/30' : 'bg-white/5')}
          style={{
            bottom: z.ground - 1,
            width: 12,
            height: z.cube * 1.6,
            borderColor: done ? undefined : A,
            boxShadow: done ? '0 0 22px rgba(52,211,153,0.9)' : `0 0 14px ${A}`,
          }}
          aria-hidden="true"
        />

        {/* the cube: sits at the end of the fill and hops. The wrapper moves with the value, the inner square does the hopping. */}
        {(pct > 0 || done) && (
          <div
            className="pointer-events-none absolute transition-[left] duration-150 ease-linear"
            style={{ left: cubeLeft, bottom: z.ground - 1, width: z.cube, height: z.cube, transform: 'translateX(-100%)' }}
            aria-hidden="true"
          >
            {/* speed trail behind it */}
            <div
              className="gp-trail absolute right-full top-1/2 -translate-y-1/2 rounded-full blur-[3px]"
              style={{ width: z.cube * 2.2, height: z.cube * 0.45, background: `linear-gradient(to left, ${B}, transparent)` }}
            />
            <div className={cn(done ? 'gp-hop-fast' : 'gp-hop', 'h-full w-full')} style={{ ['--hop' as string]: `${z.hop}px` } as CSSProperties}>
              <div
                className="grid h-full w-full place-items-center rounded-[7px] border-2 border-white/90"
                style={{ background: `linear-gradient(135deg, ${A}, ${C})`, boxShadow: `0 0 16px ${B}, inset 0 0 0 2px rgba(0,0,0,.12)` }}
              >
                {/* the cube's "face": a lighter inner square */}
                <div className="rounded-[3px] bg-white/90" style={{ width: z.cube * 0.38, height: z.cube * 0.38 }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* labels under the ground. Passed ones are bright, the next one pulses. */}
      {milestones && (
        <div className="relative mt-2 h-4" aria-hidden="true">
          {MARKS.map((m) => {
            const reached = pct >= m
            const isNext = m === next && !done
            return (
              <span
                key={m}
                className={cn('absolute top-0 text-[10px] font-bold tabular-nums transition-colors', isNext && 'gp-next', reached ? 'text-slate-200' : isNext ? 'text-slate-300' : 'text-slate-600')}
                style={{ left: `${m}%`, transform: `translateX(${m === 100 ? '-100%' : '-50%'})` }}
              >
                {m}%
              </span>
            )
          })}
        </div>
      )}

      {caption && (
        <p className="mt-1.5 text-xs text-slate-400">
          {done ? (
            <span className="font-bold text-emerald-300">Level complete. 100% cleared.</span>
          ) : (
            <>
              Next milestone <span className="font-bold text-white">{next}%</span>, <span className="font-bold tabular-nums text-white">{Math.max(0, Math.round(next - pct))}%</span> to go
            </>
          )}
        </p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  themeVars: turn ONE colour (the level's main colour) into the three        */
/*  variables above, so a whole section can follow the level's artwork.        */
/*                                                                            */
/*    <div style={themeVars('#a855f7')}>...</div>                              */
/*                                                                            */
/*  It also keeps the colour readable: not too dark, not washed out.           */
/*  Returns the default palette for a missing/invalid colour.                  */
/* -------------------------------------------------------------------------- */

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l * 100]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, s * 100, l * 100]
}

const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(s)}% ${Math.round(l)}%)`

// The default look, as variables (same three colours as DEF_A / DEF_B / DEF_C above).
const DEFAULT_THEME = { '--lv-a': DEF_A, '--lv-b': DEF_B, '--lv-c': DEF_C } as CSSProperties

export function themeVars(hex?: string | null): CSSProperties {
  if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return DEFAULT_THEME
  const [h, s, l] = hexToHsl(hex.startsWith('#') ? hex : `#${hex}`)
  const S = Math.min(95, Math.max(60, s)) // never grey
  const L = Math.min(66, Math.max(52, l)) // never too dark or too pale
  return {
    '--lv-a': hsl(h - 25, S, Math.min(72, L + 8)), // lighter, shifted one way
    '--lv-b': hsl(h, S, L), //                        the main colour
    '--lv-c': hsl(h + 40, S, Math.max(52, L - 2)), // shifted the other way
  } as CSSProperties
}

export default GlowProgress