'use client'

import { useEffect } from 'react'

const TRACK = '#070b0e'

export default function ScrollColors({ primary, secondary }: { primary: string; secondary: string }) {
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--scroll-primary', primary)
    root.style.setProperty('--scroll-secondary', secondary)
    root.style.scrollbarColor = `${primary} ${TRACK}` // set directly so Chromium redraws it right away

    return () => {
      root.style.removeProperty('--scroll-primary')
      root.style.removeProperty('--scroll-secondary')
      root.style.removeProperty('scrollbar-color') // back to the default from the css
    }
  }, [primary, secondary])

  return null
}