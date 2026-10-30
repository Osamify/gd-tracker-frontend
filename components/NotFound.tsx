import Link from 'next/link'

export default function LevelNotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#070b0e] p-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="font-heading text-6xl font-extrabold text-slate-700">404</div>
        <h1 className="font-heading text-2xl font-extrabold text-white">Level not found</h1>
        <p className="text-sm text-slate-400">This level is not in your tracker.</p>
        <Link href="/levels" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-cyan-300">
          Back to levels
        </Link>
      </div>
    </div>
  )
}