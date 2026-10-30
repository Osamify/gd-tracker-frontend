export default function Loading() {
  return (
    <div className="min-h-screen bg-[#070b0e] p-4 md:p-6 xl:px-10">
      <div className="mx-auto flex max-w-[1800px] animate-pulse flex-col gap-5">
        <div className="h-72 rounded-2xl bg-white/[0.04]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="h-96 rounded-2xl bg-white/[0.04]" />
          <div className="h-96 rounded-2xl bg-white/[0.04]" />
        </div>
      </div>
    </div>
  )
}