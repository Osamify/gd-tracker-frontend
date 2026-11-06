// components/level-details/stats-row.tsx
import { ReactNode } from "react";
import { Timer, Skull, Trophy, Calendar, Layers } from "lucide-react";
// 👇 Added formatDuration to the imports
import { panel, formatDate, relativeTime, formatDuration } from '../../lib/level-helpers'
import { AnimatedNumber } from "./ui";
import { RunPlan } from "@/lib/types";

const TONES = {
  cyan:    { text: 'text-cyan-300',    bg: 'bg-cyan-400/10',    ring: 'ring-cyan-400/30',    glow: 'shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)]',  line: 'from-cyan-400',    blob: 'bg-cyan-400/20',    dot: 'bg-cyan-400',    hover: 'hover:border-cyan-400/40' },
  red:     { text: 'text-red-400',     bg: 'bg-red-500/10',     ring: 'ring-red-500/30',     glow: 'shadow-[0_0_24px_-6px_rgba(239,68,68,0.7)]',   line: 'from-red-500',     blob: 'bg-red-500/20',     dot: 'bg-red-400',     hover: 'hover:border-red-400/40' },
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-400/10', ring: 'ring-emerald-400/30', glow: 'shadow-[0_0_24px_-6px_rgba(52,211,153,0.7)]',  line: 'from-emerald-400', blob: 'bg-emerald-400/20', dot: 'bg-emerald-400', hover: 'hover:border-emerald-400/40' },
  violet:  { text: 'text-violet-300',  bg: 'bg-violet-400/10',  ring: 'ring-violet-400/30',  glow: 'shadow-[0_0_24px_-6px_rgba(167,139,250,0.7)]', line: 'from-violet-400',  blob: 'bg-violet-500/20',  dot: 'bg-violet-400',  hover: 'hover:border-violet-400/40' },
  pink:    { text: 'text-pink-300',    bg: 'bg-pink-400/10',    ring: 'ring-pink-400/30',    glow: 'shadow-[0_0_24px_-6px_rgba(244,114,182,0.7)]', line: 'from-pink-400',    blob: 'bg-pink-500/20',    dot: 'bg-pink-400',    hover: 'hover:border-pink-400/40' },
} as const

type Tone = keyof typeof TONES

function StatTile({
  icon, label, value, hint, tone, delay = 0,
}: {
  icon: ReactNode; label: string; value: ReactNode; hint?: string; tone: Tone; delay?: number;
}) {
  const c = TONES[tone]
  return (
    <div
      className={`${panel} group relative overflow-hidden p-4 transition-colors duration-300 ${c.hover}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${c.line} via-transparent to-transparent`} aria-hidden="true" />
      <div className={`pointer-events-none absolute -right-8 -top-8 size-28 rounded-full blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100 ${c.blob}`} aria-hidden="true" />
      <div className={`pointer-events-none absolute -bottom-4 -right-3 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.12] [&>svg]:size-24 ${c.text}`} aria-hidden="true">
        {icon}
      </div>

      <div className="relative flex items-center gap-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ring-1 ${c.bg} ${c.text} ${c.ring} ${c.glow}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div suppressHydrationWarning className="truncate font-heading text-2xl font-extrabold leading-tight tabular-nums text-white xl:text-3xl">
            {value}
          </div>
          {hint && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`size-1.5 shrink-0 rounded-full ${c.dot}`} />
              <span className="truncate">{hint}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatsRowProps {
  totalSecs: number;
  // 👇 Removed the `t` prop entirely
  attempts: number;
  deaths: number[];
  isDeathsLogged: boolean;
  beaten: boolean;
  lastRef: string | null | undefined;
  now: number | null;
  practiceRuns: number;
  plan: RunPlan;
}

export default function StatsRow({
  totalSecs, attempts, deaths, isDeathsLogged, beaten, lastRef, now, practiceRuns, plan
}: StatsRowProps) {
  
  // 👇 Calculate it right here! No props needed.
  const formattedLength = totalSecs > 0 ? formatDuration(totalSecs) : '—';

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        icon={<Timer className="size-5" />}
        label="Level length"
        value={formattedLength} // 👈 Use the local variable
        tone="cyan"
        delay={0}
      />
      <StatTile
        icon={<Skull className="size-5" />}
        label="Total attempts"
        value={<AnimatedNumber value={attempts} />}
        hint={`${deaths.length} ${isDeathsLogged ? 'logged deaths' : 'deaths from runs'}`}
        tone="red"
        delay={70}
      />
      <StatTile
        icon={beaten ? <Trophy className="size-5" /> : <Calendar className="size-5" />}
        label={beaten ? 'Beaten on' : 'Last played'}
        value={formatDate(lastRef)}
        hint={lastRef ? relativeTime(lastRef, now) : 'Not logged yet'}
        tone={beaten ? 'emerald' : 'violet'}
        delay={140}
      />
      <StatTile
        icon={<Layers className="size-5" />}
        label="Practice runs"
        value={<AnimatedNumber value={practiceRuns} />}
        hint={`${plan.complete ? plan.count : '—'} min to finish`}
        tone="pink"
        delay={210}
      />
    </div>
  )
}