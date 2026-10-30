import { ReactNode, useState, useEffect, useRef } from 'react';
import { Info, Star, Play, Video, ExternalLink, X, Volume2, VolumeX, Maximize, Gauge, Award, Hash } from 'lucide-react';
import { usePathname } from 'next/navigation'; 
import { AnimatedNumber } from './ui';
import { panel } from '../../lib/level-helpers';
import Link from 'next/link';

// Tile colours (full class names so Tailwind can see them)
const TILE_TONES = {
  violet: { icon: 'bg-violet-400/15 text-violet-300 ring-violet-400/30', value: 'text-violet-200', glow: 'bg-violet-500/20' },
  sky: { icon: 'bg-sky-400/15 text-sky-300 ring-sky-400/30', value: 'text-sky-200', glow: 'bg-sky-500/20' },
  amber: { icon: 'bg-amber-400/15 text-amber-300 ring-amber-400/30', value: 'text-amber-200', glow: 'bg-amber-500/20' },
} as const;

/** One stat box: icon, small label, big value. */
function InfoTile({ icon, label, value, tone, wide = false }: { icon: ReactNode; label: string; value: ReactNode; tone: keyof typeof TILE_TONES; wide?: boolean }) {
  const c = TILE_TONES[tone];
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-800 bg-white/[0.03] p-3 ${wide ? 'col-span-2' : ''}`}>
      <div className={`pointer-events-none absolute -right-5 -top-5 size-16 rounded-full blur-2xl ${c.glow}`} aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1 ${c.icon}`}>{icon}</span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
          <div className={`font-heading text-lg font-extrabold tabular-nums ${c.value}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}

/** 5 stars, filled in proportion to a 0-10 rating (7.2 fills 3.6 stars). */
function Stars({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 10));
  const row = (
    <div className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((n) => (
        <Star key={n} className="size-4 shrink-0" />
      ))}
    </div>
  );
  return (
    <div className="relative inline-block" aria-hidden="true">
      <div className="text-slate-700 [&_svg]:fill-current">{row}</div>
      {/* the same row in gold, clipped to the rating */}
      <div className="absolute left-0 top-0 h-full overflow-hidden text-yellow-300 [&_svg]:fill-current" style={{ width: `${pct}%` }}>
        {row}
      </div>
    </div>
  );
}

function Showcase({ videoId, title }: { videoId: string; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); 
  
  const [volume, setVolume] = useState(15); 
  const [isMuted, setIsMuted] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowVolume(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowVolume(false);
    }, 1000); // Fixed the typo here (.1000 -> 1000)
  };

  const stopVideo = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'stopVideo', args: '' }),
        '*'
      );
      iframeRef.current.src = ''; 
    }
  };

  // 👇 ONLY STOP VIDEO ON PAGE NAVIGATION
  useEffect(() => {
    stopVideo();
    return () => stopVideo();
  }, [pathname]);

  const sendCommand = (func: string, args: any = '') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      if (key === 'f' && hasStarted) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
      }

      if (key === 'k') {
        e.preventDefault();
        if (!hasStarted) {
          setHasStarted(true);
          setIsPlaying(true);
        } else {
          const command = isPlaying ? 'pauseVideo' : 'playVideo';
          sendCommand(command);
          setIsPlaying(!isPlaying);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, isPlaying]);

  if (!hasStarted) {
    return (
      <div
        className="relative aspect-video overflow-hidden rounded-xl border border-slate-800 bg-black group cursor-pointer"
        onClick={() => {
          setHasStarted(true);
          setIsPlaying(true);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
        />
        <span className="absolute inset-0 grid place-items-center bg-black/30">
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 text-white shadow-[0_0_30px_-4px_rgba(139,92,246,0.8)] transition group-hover:scale-110">
            <Play className="ml-0.5 size-6" />
          </span>
        </span>
      </div>
    )
  }

  return (
    <div
      className={isOpen
        ? "fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm transition-all"
        : "relative aspect-video overflow-hidden rounded-xl border border-slate-800 bg-black transition-all group"
      }
      onClick={() => {
        if (isOpen) setIsOpen(false);
      }}
    >
      <div
        className={isOpen
          ? "relative w-full max-w-[90vw] h-[90vh] max-h-[800px] aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black"
          : "absolute inset-0"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* 👇 Removed the dynamic controls parameter. The src is now static, so it won't restart! */}
        <iframe
          ref={iframeRef}
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`}
          title={`${title} showcase`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          onLoad={() => {
            sendCommand('setVolume', [volume]);
            if (isMuted) sendCommand('mute');
          }}
        />
      </div>

      {!isOpen && (
        <>
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
          
          <div 
            className="absolute top-2 left-2 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-2 py-1.5 backdrop-blur-md border border-white/10"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                sendCommand(isMuted ? 'unMute' : 'mute');
                setIsMuted(!isMuted);
              }}
              className="text-white hover:text-cyan-300 transition cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
               {isMuted || volume === 0 ? <VolumeX className="size-4 text-red-400" /> : <Volume2 className="size-4" />}
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${showVolume ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVol = parseInt(e.target.value);
                  setVolume(newVol);
                  setIsMuted(newVol === 0);
                  sendCommand('setVolume', [newVol]);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-16 h-1 accent-cyan-400 cursor-pointer ml-1"
              />
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
            className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-bold text-slate-300 backdrop-blur-md border border-white/10 transition hover:text-white hover:bg-black/90 cursor-pointer"
            title="Expand Video (F)"
          >
            <Maximize className="size-3.5" />
            Expand
          </button>
        </>
      )}

      {isOpen && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          className="absolute top-6 right-6 z-[110] flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-sm font-bold text-slate-300 backdrop-blur-md transition hover:text-white hover:bg-black/90 cursor-pointer"
        >
          Close <X className="size-5" />
        </button>
      )}
    </div>
  )
}

interface LevelInfoSectionProps {
  enjoyment?: number | null;
  ratingCount?: number | null;
  gddp?: number | null;
  nlw: string | null;
  aredl?: number | null;
  levelName: string;
  showcaseId?: string | null;
  difficulty?: string | null;
}

export default function LevelInfoSection({
  enjoyment, ratingCount, gddp, nlw, aredl, levelName, showcaseId, difficulty
}: LevelInfoSectionProps) {
  const pathname = usePathname();
  const isExtreme = difficulty?.toLowerCase() === 'extreme';

  return (
    <div className={`${panel} flex flex-col gap-3 p-5`}>
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-white">
        <Info className="size-4 text-cyan-300" />
        Level info
      </h2>

      {showcaseId && <Showcase key={pathname} videoId={showcaseId} title={levelName} />}
      
      {showcaseId && (
        <a
          href={`https://www.youtube.com/watch?v=${showcaseId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-cyan-300"
        >
          <Video className="size-3.5" />
          Open on YouTube
          <ExternalLink className="size-3" />
        </a>
      )}

      <div className="rounded-lg border border-slate-800 bg-white/[0.02] px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Star className="size-3.5 text-yellow-300" />
            Enjoyment
          </span>
          <span className="font-bold tabular-nums text-white">
            {enjoyment != null ? (
              <>
                <AnimatedNumber value={enjoyment} decimals={1} />
                <span className="text-slate-500">/10</span>
                <span className='text-[12px] text-slate-500'> ({ratingCount})</span>
              </>
            ) : (
              '—'
            )}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
          {enjoyment != null && (
            <div
              className="gd-grow h-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-400"
              style={{ width: `${Math.min(100, (enjoyment / 10) * 100)}%` }}
            />
          )}
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-2">
        <InfoTile icon={<Gauge className="size-4" />} label="GDDP tier" value={gddp != null ? gddp.toFixed(1) : '—'} tone="violet" wide={!isExtreme} />
        {isExtreme && (
          <>
            <InfoTile icon={<Award className="size-4" />} label="NLW tier" value={nlw ?? '—'} tone="sky" />
            <InfoTile icon={<Hash className="size-4" />} label="AREDL rank" value={aredl != null ? `#${aredl}` : '—'} tone="amber" wide />
          </>
        )}
      </div>
    </div>
  )
}