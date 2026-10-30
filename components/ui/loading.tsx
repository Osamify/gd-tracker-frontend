// components/ui/loading.tsx
//
// A reusable, animated loading screen.
//
//   <Loader messages="Loading level..." />
//   <Loader title="Loading level" messages={['Fetching data', 'Syncing runs', 'Crunching coverage']} />
//   <Loader messages="Loading levels..." fullScreen={false} />   // fills its parent instead of the screen
//
// One string shows as it is. A list rotates, one message every `interval` ms.
//
// The rotation is pure CSS (no useState / useEffect). That matters because a Suspense fallback
// is shown BEFORE the page's JavaScript has started, so a JS timer would never run and the
// first message would stay forever. CSS animations run from the first frame.

type LoaderProps = {
  /** Text to show. A single string, or a list that rotates. */
  messages?: string | string[]
  /** Optional bold line above the message. */
  title?: string
  /** Time each message stays on screen, in milliseconds. */
  interval?: number
  /** true = fills the whole screen (default). false = fills the parent box. */
  fullScreen?: boolean
  className?: string
}

const BASE_CSS = `
@keyframes ld-spin { to { transform: rotate(360deg) } }
@keyframes ld-spin-rev { to { transform: rotate(-360deg) } }
@keyframes ld-core { 0%, 100% { transform: scale(.8); box-shadow: 0 0 14px 2px rgba(34,211,238,.6) } 50% { transform: scale(1.25); box-shadow: 0 0 28px 8px rgba(139,92,246,.75) } }
@keyframes ld-ripple { 0% { transform: scale(.35); opacity: .7 } 100% { transform: scale(1.7); opacity: 0 } }
@keyframes ld-bar { 0% { transform: translateX(-120%) } 100% { transform: translateX(320%) } }
@keyframes ld-shine { from { background-position: 200% 0 } to { background-position: -200% 0 } }
@keyframes ld-drift-a { 0%, 100% { transform: translate(0, 0) scale(1) } 50% { transform: translate(60px, -40px) scale(1.15) } }
@keyframes ld-drift-b { 0%, 100% { transform: translate(0, 0) scale(1) } 50% { transform: translate(-70px, 50px) scale(1.2) } }
@keyframes ld-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
.ld-spin { animation: ld-spin 1.2s linear infinite }
.ld-spin-slow { animation: ld-spin 3.2s linear infinite }
.ld-spin-rev { animation: ld-spin-rev 5s linear infinite }
.ld-core { animation: ld-core 1.4s ease-in-out infinite }
.ld-ripple { animation: ld-ripple 2.4s ease-out infinite }
.ld-bar { animation: ld-bar 1.3s ease-in-out infinite }
.ld-shine { background-size: 200% 100%; animation: ld-shine 2.6s linear infinite }
.ld-drift-a { animation: ld-drift-a 9s ease-in-out infinite }
.ld-drift-b { animation: ld-drift-b 11s ease-in-out infinite }
.ld-bob { animation: ld-bob 2.2s ease-in-out infinite }
`

/**
 * CSS for rotating `n` messages. Every message gets the same animation, lasting n * interval,
 * but starts `index * interval` later, so they take turns being visible.
 * Each message is visible for 100/n percent of the cycle (its "slot").
 */
function rotationCss(n: number) {
  const slot = 100 / n // percent of the cycle one message owns
  const fade = Math.min(4, slot / 4) // how long the fade in / out takes (percent)
  return `
@keyframes ld-msg-${n} {
  0% { opacity: 0; transform: translateY(10px); filter: blur(4px) }
  ${fade}% { opacity: 1; transform: none; filter: none }
  ${slot - fade}% { opacity: 1; transform: none; filter: none }
  ${slot}% { opacity: 0; transform: translateY(-10px); filter: blur(4px) }
  100% { opacity: 0; transform: translateY(-10px); filter: blur(4px) }
}
@keyframes ld-dot-${n} {
  0% { width: 6px; background-color: #334155 }
  ${fade}% { width: 20px; background-color: #22d3ee }
  ${slot - fade}% { width: 20px; background-color: #22d3ee }
  ${slot}% { width: 6px; background-color: #334155 }
  100% { width: 6px; background-color: #334155 }
}`
}

export function Loader({ messages = 'Loading...', title, interval = 1800, fullScreen = true, className = '' }: LoaderProps) {
  const list = Array.isArray(messages) ? messages : [messages]
  const n = list.length
  const rotate = n > 1
  const cycle = n * interval // ms for one full round of messages

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative isolate grid place-items-center overflow-hidden bg-[#070b0e] text-slate-200 ${fullScreen ? 'min-h-screen' : 'min-h-[60vh] rounded-2xl'} ${className}`}
    >
      <style>{BASE_CSS + (rotate ? rotationCss(n) : '')}</style>

      {/* colour glows that slowly drift around */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="ld-drift-a absolute left-1/4 top-1/4 size-[26rem] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="ld-drift-b absolute bottom-1/4 right-1/4 size-[28rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="ld-drift-a absolute bottom-1/3 left-1/2 size-72 rounded-full bg-pink-500/10 blur-3xl" style={{ animationDelay: '-4s' }} />
      </div>

      <div className="flex flex-col items-center gap-7 px-6 text-center">
        {/* spinner */}
        <div className="ld-bob relative grid size-28 place-items-center" aria-hidden="true">
          {/* ripples spreading outwards */}
          <span className="ld-ripple absolute inset-0 rounded-full border border-cyan-300/50" />
          <span className="ld-ripple absolute inset-0 rounded-full border border-violet-400/50" style={{ animationDelay: '0.8s' }} />
          <span className="ld-ripple absolute inset-0 rounded-full border border-pink-400/40" style={{ animationDelay: '1.6s' }} />

          {/* fast gradient arc */}
          <div
            className="ld-spin absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0 35%, #22d3ee, #8b5cf6, #ec4899)',
              maskImage: 'radial-gradient(circle, transparent 66%, black 68%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 66%, black 68%)',
            }}
          />
          {/* slower reverse arc inside */}
          <div
            className="ld-spin-rev absolute inset-3 rounded-full"
            style={{
              background: 'conic-gradient(from 90deg, transparent 0 55%, #f472b6, #8b5cf6)',
              maskImage: 'radial-gradient(circle, transparent 64%, black 66%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 64%, black 66%)',
            }}
          />
          {/* two dots orbiting the ring */}
          <div className="ld-spin-slow absolute inset-0">
            <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_3px_rgba(34,211,238,0.8)]" />
          </div>
          <div className="ld-spin-slow absolute inset-0" style={{ animationDirection: 'reverse', animationDuration: '4.5s' }}>
            <span className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-pink-400 shadow-[0_0_10px_3px_rgba(244,114,182,0.8)]" />
          </div>
          {/* beating core */}
          <div className="ld-core size-4 rounded-full bg-gradient-to-br from-cyan-300 to-violet-500" />
        </div>

        <div className="flex flex-col items-center gap-2">
          {title && <h2 className="font-heading text-xl font-extrabold tracking-tight text-white">{title}</h2>}

          {/* All messages sit on top of each other in the same grid cell, so the box is as wide as the
              longest one. CSS fades each in and out on its own turn (see rotationCss). */}
          <div className="grid min-h-6 text-sm font-bold">
            {list.map((text, idx) => (
              <p
                key={idx}
                className="col-start-1 row-start-1"
                style={
                  rotate
                    ? { animation: `ld-msg-${n} ${cycle}ms ease-in-out ${idx * interval}ms infinite both`, opacity: 0 }
                    : undefined
                }
              >
                {/* gradient text with a light sweeping across it */}
                <span
                  className="ld-shine bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(90deg, #64748b 0%, #64748b 35%, #e2e8f0 50%, #64748b 65%, #64748b 100%)' }}
                >
                  {text}
                </span>
              </p>
            ))}
          </div>
        </div>

        {/* endless sweeping bar */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
          <div className="ld-bar h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
        </div>

        {/* dots: the one for the message on screen stretches and lights up */}
        {rotate && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {list.map((_, idx) => (
              <span
                key={idx}
                className="h-1 w-1.5 rounded-full bg-slate-700"
                style={{ animation: `ld-dot-${n} ${cycle}ms ease-in-out ${idx * interval}ms infinite both` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Loader