// app/levels/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import LevelInfo from './LevelInfo' // Make sure this path is correct based on where you put LevelInfo
import type { Level } from '@/lib/tracker'
import Loader from '@/components/ui/loading'
import { extractColorsFromImage } from '@/lib/server-colors' // 👈 Import the server extractor

interface CSharpCombinedAttempts {
  combinedAttempts: number;
}

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
  return res.json() as Promise<CSharpCombinedAttempts>
}

async function LevelContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [backendLevel, attemptsData] = await Promise.all([
    getLevelData(id),
    getCombinedAttempts(id)
  ])

  if (!backendLevel) {
    notFound()
  }

  const imageUrl = `https://levelthumbs.prevter.me/thumbnail/${backendLevel.id}`;

  // 👇 1. Extract the colors on the server before rendering
  // const { primary, secondary } = await extractColorsFromImage(imageUrl);

  const level: Level = {
    ...backendLevel,
    attempts: attemptsData.combinedAttempts || backendLevel.totalAttempts || 0,
    image: imageUrl, 
  }

  return (
    <>
      {/* 👇 2. Inject the extracted colors into the HTML payload */}
      {/* <style>{`
        :root {
          --scroll-primary: ${primary};
          --scroll-secondary: ${secondary};
        }
      `}</style> */}
      <LevelInfo level={level} />
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