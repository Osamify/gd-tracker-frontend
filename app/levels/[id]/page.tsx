// app/levels/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import LevelInfo from './LevelInfo'
import type { Level, CombinedAttempts, DeathStat } from '@/lib/types'
import Loader from '@/components/ui/loading'
import { extractColorsFromImage } from '@/lib/server-colors'
import ScrollColors from '@/components/level-detail/scroll-colors'



async function getLevelData(id: string) {
  const res = await fetch(`${process.env.BACKEND_API_URL}/api/Levels/${id}`, { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error('Failed to fetch level')
  }
  return res.json() as Promise<Level>
}

async function getCombinedAttempts(id: string) {
  const res = await fetch(`${process.env.BACKEND_API_URL}/api/Levels/${id}/combined-attempts`, { cache: 'no-store' })
  if (!res.ok) return { combinedAttempts: 0 }
  return res.json() as Promise<CombinedAttempts>
}

async function getDeathStats(id: string) {
  const res = await fetch(`${process.env.BACKEND_API_URL}/api/Runs/stats/${id}`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json() as Promise<DeathStat[]>
}


async function LevelContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [backendLevel, attemptsData, deathStats] = await Promise.all([
    getLevelData(id),
    getCombinedAttempts(id),
    getDeathStats(id)
  ])

  if (!backendLevel) {
    notFound()
  }

  const imageUrl = `https://levelthumbs.prevter.me/thumbnail/${backendLevel.id}`;

  // 👇 SAFE COLOR EXTRACTION
  let primary = '#8b5cf6'; // Default Purple
  let secondary = '#d946ef'; // Default Pink
// throw new Error("Testing the error boundary!");
  try {
    const colors = await extractColorsFromImage(imageUrl);
    primary = colors.primary;
    secondary = colors.secondary;
  } catch (error) {
    console.error("Color extraction failed, using fallback colors:", error);
    // It will just use the default purple/pink variables from above
  }

  const level: Level = {
    ...backendLevel,
    attempts: attemptsData.combinedAttempts || backendLevel.totalAttempts || 0,
    image: imageUrl,
  }

  return (
    <>
      <style>{`
        :root {
          --scroll-primary: ${primary};
          --scroll-secondary: ${secondary};
        }
      `}</style>
      <ScrollColors primary={primary} secondary={secondary} />
      <LevelInfo level={level} deathStats={deathStats} />
    </>
  )
}

export default function LevelPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <Loader
          title="Loading level"
          messages={[
            "Fetching data from backend",
            "Syncing practice runs",
            "Calculating coverage",
            "Crunching the numbers"
          ]}
        />
      }
    >
      <LevelContent params={params} />
    </Suspense>
  )
}