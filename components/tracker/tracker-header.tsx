import { Crosshair, Flame, Skull, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Stat = { label: string; value: string; icon: LucideIcon; tone: 'primary' | 'accent' }

export function TrackerHeader({
  totalDemons,
  activeProjects,
  totalAttempts,
  completedPlans,
}: {
  totalDemons: number
  activeProjects: number
  totalAttempts: number
  completedPlans: number
}) {
  const stats: Stat[] = [
    { label: 'Total Demons Tracked', value: totalDemons.toString(), icon: Skull, tone: 'primary' },
    { label: 'Active Projects', value: activeProjects.toString(), icon: Flame, tone: 'accent' },
    { label: 'Total Attempts', value: totalAttempts.toLocaleString('en-US'), icon: Crosshair, tone: 'primary' },
    { label: 'Runs Stitched to 100%', value: `${completedPlans}/${totalDemons}`, icon: Target, tone: 'accent' },
  ]

  return (
    <header className="border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-primary/40 bg-primary/15 shadow-[0_0_24px_-4px] shadow-primary/60">
              <Skull className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-heading text-xl font-bold uppercase tracking-wider text-foreground sm:text-2xl">
                Practice Tracker
              </h1>
              <p className="text-sm text-muted-foreground">Geometry Dash demon progress</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent sm:inline-flex">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
            Session live
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/40 p-3 sm:p-4"
            >
              <stat.icon
                className={stat.tone === 'primary' ? 'size-5 shrink-0 text-primary' : 'size-5 shrink-0 text-accent'}
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-col">
                <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="font-heading text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                  {stat.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </header>
  )
}
