import { Gauge } from "lucide-react";
import { ReactNode } from "react";
import { AnimatedNumber} from './ui'
import {panel} from '../../lib/level-helpers'
import { Run, RunPlan } from "@/lib/types";

// MiniStat = the small boxes inside the 'Plan data' card (label on top, number below).
function MiniStat({ label, value, tone = 'text-white' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-white/[0.03] p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`font-heading text-lg font-extrabold tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}


interface PlanDataProps {
  plan: RunPlan;
  covered: number;
  longestRun: number;
  avgRun: number;
  overlap: number;
  gaps: Run[];
  sinceBest: number | null;
  attemptsPerPercent: number | null;
}


export default function PlanData({ plan, covered, longestRun, avgRun, overlap, gaps, sinceBest, attemptsPerPercent }: PlanDataProps) {
  return (
    <div className={`${panel} p-5`}>
      <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-white">
        <Gauge className="size-4 text-cyan-300" />
        Plan data
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Runs needed" value={plan.complete ? <AnimatedNumber value={plan.count} /> : '—'} tone="text-cyan-300" />
        <MiniStat label="Covered" value={<><AnimatedNumber value={Math.round(covered)} />%</>} />
        <MiniStat label="Longest run" value={<><AnimatedNumber value={longestRun} />%</>} />
        <MiniStat label="Avg run" value={<><AnimatedNumber value={avgRun} decimals={1} />%</>} />
        <MiniStat label="Overlap" value={<><AnimatedNumber value={overlap} />%</>} tone="text-violet-300" />
        <MiniStat label="Gaps" value={<AnimatedNumber value={gaps.length} />} tone={gaps.length ? 'text-red-400' : 'text-emerald-300'} />
        <MiniStat label="Since best" value={sinceBest != null ? <><AnimatedNumber value={sinceBest} /> att.</> : '—'} tone="text-pink-300" />
        <MiniStat label="Att. per %" value={attemptsPerPercent != null ? <AnimatedNumber value={attemptsPerPercent} decimals={1} /> : '—'} />
      </div>
      <div className="mt-3">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Uncovered sections</div>
        {gaps.length === 0 ? (
          <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            Every part of the level is covered by a practice run.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((g) => (
              <span key={`${g.startPercent}-${g.endPercent}`} className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-red-300">
                {g.startPercent}–{g.endPercent}%
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}