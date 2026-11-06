"use client"

import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Wrap the refresh logic in useCallback so it can be safely used in useEffect
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    router.refresh() // Tells Next.js to re-fetch Server Components
    setTimeout(() => setIsRefreshing(false), 1000) // Fake delay for UX
  }, [router])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Check if the pressed key is 'r' or 'R'
      if (event.code !== 'KeyR') return

      // 2. Ignore if the user is typing in an input, textarea, or contentEditable element
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // 3. Ignore if they are using Ctrl+R or Cmd+R (that's the browser's native refresh)
      if (event.ctrlKey || event.metaKey) return

      // 4. Trigger the refresh!
      event.preventDefault()
      handleRefresh()
    }

    // Attach the event listener to the window
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup the listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleRefresh])

  return (
    <button 
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-200 backdrop-blur-md transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:opacity-50"
    >
      <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Updating...' : 'Refresh'}
    </button>
  )
}