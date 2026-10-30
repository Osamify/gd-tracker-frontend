import { AlertTriangle, Crosshair, Route, Swords } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { GlowProgress } from '../../components/ui/progress'
import { bestRun, minimumRunsToComplete, type Level } from '../../lib/tracker'

/* -------------------------------------------------------------------------- */
/*  Face icons: /public/gdfaces/{difficulty}-{tier}.png  (5 x 5 = 25 files)   */
/* -------------------------------------------------------------------------- */

type FaceDifficulty = 'easy' | 'medium' | 'hard' | 'insane' | 'extreme'
type Tier = 'rated' | 'featured' | 'epic' | 'legendary' | 'mythic'

const DIFFICULTIES: FaceDifficulty[] = ['easy', 'medium', 'hard', 'insane', 'extreme']

function faceDifficulty(raw: string): FaceDifficulty {
  const first = raw.trim().toLowerCase().split(/\s+/)[0] as FaceDifficulty
  return DIFFICULTIES.includes(first) ? first : 'medium'
}

const TIER_STYLE: Record<
  Tier,
  { label: string; chip: string; hover: string; glow: string }
> = {
  rated: {
    label: 'Rated',
    chip: 'border-slate-600/60 bg-slate-700/40 text-slate-300',
    hover: 'hover:border-slate-600',
    glow: 'drop-shadow-[0_0_10px_rgba(148,163,184,0.35)]',
  },
  featured: {
    label: 'Featured',
    chip: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300',
    hover: 'hover:border-yellow-400/50 hover:shadow-[0_0_36px_-10px_rgba(250,204,21,0.6)]',
    glow: 'drop-shadow-[0_0_12px_rgba(250,204,21,0.55)]',
  },
  epic: {
    label: 'Epic',
    chip: 'border-orange-400/40 bg-orange-400/10 text-orange-300',
    hover: 'hover:border-orange-400/50 hover:shadow-[0_0_36px_-10px_rgba(251,146,60,0.65)]',
    glow: 'drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]',
  },
  legendary: {
    label: 'Legendary',
    chip: 'border-pink-400/40 bg-pink-400/10 text-pink-300',
    hover: 'hover:border-pink-400/50 hover:shadow-[0_0_36px_-10px_rgba(244,114,182,0.65)]',
    glow: 'drop-shadow-[0_0_12px_rgba(244,114,182,0.6)]',
  },
  mythic: {
    label: 'Mythic',
    chip: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
    hover: 'hover:border-cyan-400/50 hover:shadow-[0_0_36px_-10px_rgba(34,211,238,0.7)]',
    glow: 'drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]',
  },
}

// 1. ADD onClick PROP HERE
export function LevelCard({ level, onClick }: { level: Level; onClick?: () => void }) {
  const best = bestRun(level.runs)
  const plan = minimumRunsToComplete(level.runs)

  const tier: Tier = (level as Level & { tier?: Tier }).tier ?? 'rated'
  const style = TIER_STYLE[tier]
  const face = `/gdfaces/${faceDifficulty(level.difficulty)}-${tier}.png`

  return (
    <article
      onClick={onClick} // 2. ATTACH onClick TO WRAPPER
      className={`group cursor-pointer relative isolate flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1015] transition-all duration-300 hover:-translate-y-1 ${style.hover}`}
    >
      {/* Thumbnail */}
      <div className="relative h-40 w-full overflow-hidden sm:h-44">
        <img
          src="https://levelthumbs.prevter.me/thumbnail/93136999"
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0a1015] via-[#0a1015]/30 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <Badge className="border-white/10 bg-black/50 text-slate-100 backdrop-blur-md">
            <Swords aria-hidden="true" />
            {level.difficulty}
          </Badge>
          <Badge className={`backdrop-blur-md ${style.chip}`}>{style.label}</Badge>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex flex-col gap-3.5 p-4 pt-0">
        {/* Face + title + best */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-end gap-3">
            <img
              src={face}
              alt={`${level.difficulty} ${tier} demon face`}
              className={`-mt-9 size-16 shrink-0 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${style.glow}`}
            />
            <div className="flex min-w-0 flex-col pb-0.5">
              <h3 className="truncate font-heading text-lg font-extrabold leading-tight text-white">
                {level.name}
              </h3>
              <p className="truncate text-xs text-slate-500">
                by {level.creator} · {level.attempts.toLocaleString('en-US')} atts
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end pb-0.5">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <Crosshair className="size-3" aria-hidden="true" />
              Best
            </span>
            <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text font-heading text-3xl font-extrabold leading-none tabular-nums text-transparent">
              {best}%
            </span>
          </div>
        </div>

        {/* Progress */}
        <GlowProgress
          value={best}
          aria-label={`${level.name} best run ${best}%`}
          className="[&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-cyan-400 [&_[data-slot=progress-indicator]]:via-violet-500 [&_[data-slot=progress-indicator]]:to-pink-500 [&_[data-slot=progress-indicator]]:shadow-[0_0_12px_rgba(139,92,246,0.7)] [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-slate-800"
        />

        {/* Plan badge */}
        {plan.complete ? (
          <Badge className="h-8 w-full justify-center gap-2 border-cyan-400/40 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_-6px_rgba(34,211,238,0.7)]">
            <Route aria-hidden="true" />
            Min runs to 100%:
            <span className="font-heading text-base font-extrabold tabular-nums text-white">
              {plan.count}
            </span>
          </Badge>
        ) : (
          <Badge className="h-8 w-full justify-center gap-2 border-red-500/40 bg-red-500/10 text-red-400">
            <AlertTriangle aria-hidden="true" />
            Gap at {plan.gapAt}%
          </Badge>
        )}

        {/* Run chain */}
        {plan.chain.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plan.chain.map((r) => (
              <span
                key={`${r.startPercent}-${r.endPercent}`}
                className="rounded-md border border-slate-800 bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-400"
              >
                {r.startPercent}–{r.endPercent}%
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}