"use client"

import Link from 'next/link'

export default function LevelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#070b0e] p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <h1 className="font-heading text-2xl font-extrabold text-white">Could not load this level</h1>
        <p className="text-sm text-slate-400">The backend did not answer. Check that it is running, then try again.</p>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-4 py-2 text-sm font-bold text-white"
          >
            Try again
          </button>
          <Link href="/levels" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-300">
            Back to levels
          </Link>
        </div>
      </div>
    </div>
  )
}