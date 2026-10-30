// components/level/level-hero.tsx
import Link from 'next/link';
import { ArrowLeft, Swords, Gauge, Award, Star, Hash, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RefreshButton } from '@/components/RefreshButton';
import { Face, AnimatedNumber } from './ui';
import type { Tier, FaceDifficulty } from '@/lib/level-helpers';

interface LevelHeroProps {
  name: string;
  creator: string;
  progress: number;
  best: number;
  difficultyLabel: string;
  faceDiff: FaceDifficulty;
  tier: Tier;
  glowClass: string;
  gddp: number | null | undefined;
  nlw: string | null | undefined;
  enjoyment: number | null | undefined;
  ratingCount: number | null | undefined;
  aredl: number | null | undefined;  beaten: boolean;
}

export default function LevelHero({
  name, creator, progress, best, difficultyLabel, faceDiff, tier, glowClass,
  gddp, nlw, enjoyment, ratingCount, aredl, beaten
}: LevelHeroProps) {
  return (
    <header className="relative isolate">
      <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 rounded-b-2xl bg-gradient-to-t from-[#070b0e]/85 to-transparent" aria-hidden="true" />
      
      <div className="flex items-start justify-between p-4">
        <Link href="/levels" className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-200 backdrop-blur-md transition hover:border-cyan-400/50 hover:text-cyan-300">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <RefreshButton />
      </div>

      <div className="flex flex-col gap-4 px-5 pb-6 pt-20 sm:flex-row sm:items-end sm:pt-28 xl:px-8 xl:pb-8 xl:pt-44">
        <Face difficulty={faceDiff} tier={tier} alt={`${difficultyLabel} ${tier} face`} className={`gd-float size-24 shrink-0 object-contain sm:size-28 ${glowClass}`} />
        
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/10 bg-black/50 text-slate-100 backdrop-blur-md">
              <Swords aria-hidden="true" /> {difficultyLabel}
            </Badge>
            {gddp != null && (
              <Badge className="border-violet-400/40 bg-violet-400/10 text-violet-300">
                <Gauge aria-hidden="true" /> GDDP {gddp.toFixed(2)}
              </Badge>
            )}
            {nlw && (
              <Badge className="border-sky-400/40 bg-sky-400/10 text-sky-300">
                <Award aria-hidden="true" /> NLW {nlw}
              </Badge>
            )}
            {enjoyment != null && (
              <Badge className="border-yellow-400/40 bg-yellow-400/10 text-yellow-300">
                <Star aria-hidden="true" /> {enjoyment.toFixed(1)}
                {ratingCount != null && <span className="text-yellow-300/70">({ratingCount.toLocaleString('en-US')})</span>}
              </Badge>
            )}
            {aredl != null && (
              <Badge className="border-amber-400/40 bg-amber-400/10 text-amber-300">
                <Hash aria-hidden="true" /> AREDL {aredl}
              </Badge>
            )}
            {beaten && (
              <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                <Trophy aria-hidden="true" /> Beaten
              </Badge>
            )}
          </div>
          
          <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.65)] sm:text-4xl xl:text-5xl">{name}</h1>
          <p className="text-sm text-slate-400">by <span className="font-semibold text-slate-200">{creator}</span></p>
        </div>

        <div className="flex flex-col items-start sm:items-end">
          {progress != 100 && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Best run</span>}
          <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text font-heading text-6xl font-extrabold leading-none tabular-nums text-transparent gd-shimmer">
            <AnimatedNumber value={best} />%
          </span>
        </div>
      </div>
    </header>
  )
}