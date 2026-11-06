// components/level/level-background.tsx
"use client"

import { useState } from 'react';

interface LevelBackgroundProps {
  thumb: string | null | undefined;
}

export default function LevelBackground({ thumb }: LevelBackgroundProps) {
  const [thumbOk, setThumbOk] = useState(true);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {thumbOk && thumb ? (
        <>
          <img 
            src={thumb} 
            alt="" 
            onError={() => setThumbOk(false)} 
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl saturate-150" 
          />
          <img 
            src={thumb} 
            alt="" 
            onError={() => setThumbOk(false)} 
            className="absolute inset-x-0 top-0 h-[80vh] w-full object-cover opacity-80" 
            style={{ 
              maskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 90%)', 
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 30%, transparent 90%)' 
            }} 
          />
        </>
      ) : (
        <>
          <div className="absolute -left-24 top-0 size-[32rem] rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -right-24 top-20 size-[32rem] rounded-full bg-violet-600/15 blur-3xl" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b0e]/10 via-[#070b0e]/65 to-[#070b0e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_35%,#070b0e_100%)]" />
    </div>
  )
}