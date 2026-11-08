// components/layout/sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  History,
  Settings,
  ChevronsLeft,
  Flame,
  Menu,
  Wifi,
  X,
} from "lucide-react";

/**
 * Sidebar in the same style as /levels: dark panel, lime accent, angled corners, mono labels.
 *
 *  - Desktop (lg and up): a sticky column next to the page (15rem open, 4.5rem collapsed). The arrow on its edge, placed below the slim bar so it is never covered, collapses it to icons only
 *    (the choice is remembered).
 *  - Phones: hidden. A lime menu button (bottom left) opens it as a drawer; Esc, the dark area or a tap on a link closes it.
 *  - It publishes its width as the CSS variable --sb-w (0px on phones). Fixed bars on the page (like the slim bar on /levels)
 *    use `left: var(--sb-w, 0px)` so they never slide under the sidebar.
 *
 * Items without an href are not built yet: they show a "soon" tag instead of doing nothing silently.
 * Pages: Dashboard, Levels | Statistics, Run History | Settings.
 *
 * No flash on refresh: a tiny script (rendered first) reads the saved choice and sets data-sb on <html> BEFORE the page is
 * painted, and the open/collapsed look is pure CSS driven by that attribute (classes sb-x / sb-y / sb-c ...). React state is
 * only used for the toggle itself. Put suppressHydrationWarning on <html> in app/layout.tsx (the script changes that tag).
 */

const BRAND = "#d4ff3a"; // same lime as the levels page
const STORAGE_KEY = "gd-sidebar-collapsed";
// runs before the first paint: puts the saved choice on <html>
const BOOT = `try{document.documentElement.dataset.sb=localStorage.getItem("${STORAGE_KEY}")==="1"?"collapsed":"open"}catch(e){}`;

// angled corners, like <Cut/> on the levels page
const poly = (c: number) => `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`;

const CSS = `
:root { --sb-w: 0px }
@media (min-width: 1024px) {
  :root { --sb-w: 15rem }
  :root[data-sb="collapsed"] { --sb-w: 4.5rem }
  .sb-aside { width: var(--sb-w) }
  /* sb-x = hidden when collapsed, sb-y = only shown when collapsed, sb-c = centred when collapsed */
  html[data-sb="collapsed"] .sb-aside .sb-x { display: none }
  html[data-sb="collapsed"] .sb-aside .sb-y { display: block }
  html[data-sb="collapsed"] .sb-aside .sb-c { justify-content: center }
  html[data-sb="collapsed"] .sb-aside .sb-brand { padding: 1rem .5rem }
  html[data-sb="collapsed"] .sb-aside .sb-logo { width: 2.5rem; height: 2.5rem }
  html[data-sb="collapsed"] .sb-aside .sb-col { flex-direction: column }
  html[data-sb="collapsed"] .sb-aside .sb-rot { transform: rotate(180deg) }
}
.sb-y { display: none }
@keyframes sb-in { from { transform: translateX(-100%) } to { transform: none } }
@keyframes sb-fade { from { opacity: 0 } to { opacity: 1 } }
.sb-in { animation: sb-in .28s cubic-bezier(.2, .8, .2, 1) both }
.sb-fade { animation: sb-fade .2s ease-out both }
@media (prefers-reduced-motion: reduce) { .sb-in, .sb-fade { animation: none !important } }
`;

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string | number;
  href?: string;
};

// The pages of the app. Only "/" and "/levels" exist today; the others have no href yet, so they show a "soon" tag.
// When you build one, just add its href (for example href: "/stats") and the tag disappears.
const MAIN: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { id: "levels", label: "Levels", icon: Layers, href: "/levels" },
]

const TRACK: NavItem[] = [
  { id: "stats", label: "Statistics", icon: BarChart3 }, // totals, attempts per difficulty, progress over time
  { id: "history", label: "Run History", icon: History }, // every practice run, newest first
]

/** The GD monogram with progress ticks (same drawing as the levels page). */
function Logo({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="GD Tracker logo">
      <path d="M22 0H178L200 22V178L178 200H22L0 178V22Z" fill="#0d1013" />
      <path d="M22 0H178L200 22V178L178 200H22L0 178V22Z" fill="none" stroke={BRAND} strokeWidth="3" opacity=".35" />
      <g transform="translate(0 -14)">
        <path d="M92 64H58Q42 64 42 80V120Q42 136 58 136H92V102H70" fill="none" stroke={BRAND} strokeWidth="20" />
        <path d="M120 64H136Q164 64 164 100Q164 136 136 136H120Z" fill="none" stroke="#fff" strokeWidth="20" />
      </g>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={42 + i * 12.5} y="150" width="9.5" height="12" fill={BRAND} opacity={i < 7 ? 1 : 0.22} />
      ))}
      <path d="M0 22V0H22M200 178V200H178" fill="none" stroke={BRAND} strokeWidth="6" />
    </svg>
  );
}

function NavButton({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  const soon = !item.href;

  const className = `sb-c group relative flex w-full items-center gap-3 px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
    active ? "text-white" : soon ? "cursor-default text-slate-600" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
  }`;
  const style = active ? { background: `${BRAND}14`, clipPath: poly(8) } : undefined;

  const content = (
    <>
      {active && <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: BRAND, boxShadow: `0 0 12px ${BRAND}` }} aria-hidden="true" />}
      <Icon className={`size-[18px] shrink-0 transition-transform ${soon ? "" : "group-hover:scale-110"}`} style={{ color: active ? BRAND : undefined }} />
      <span className="sb-x flex-1 text-left">{item.label}</span>
      {item.badge !== undefined && (
        <span className="sb-x border px-1.5 py-0.5 text-[10px] tabular-nums" style={active ? { borderColor: `${BRAND}66`, color: BRAND } : { borderColor: "rgba(255,255,255,.12)", color: "#94a3b8" }}>
          {item.badge}
        </span>
      )}
      {soon && item.badge === undefined && <span className="sb-x border border-white/10 px-1.5 py-0.5 text-[9px] tracking-[0.2em] text-slate-600">soon</span>}
    </>
  );

  // the tooltip (title) is useful when only the icons are visible
  return item.href ? (
    <Link href={item.href} onClick={onNavigate} title={item.label} aria-current={active ? "page" : undefined} className={className} style={style}>
      {content}
    </Link>
  ) : (
    <button type="button" aria-disabled="true" title={`${item.label} (soon)`} className={className} style={style} onClick={(e) => e.preventDefault()}>
      {content}
    </button>
  );
}

function Section({ label }: { label: string }) {
  return (
    <>
      <div className="sb-y mx-3 my-3 h-px bg-white/10" />
      <span className="sb-x mb-1.5 mt-5 flex items-center gap-2 px-3 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
        <span className="h-px w-4" style={{ background: BRAND }} />
        {label}
      </span>
    </>
  );
}

/** Everything inside the sidebar. Used twice: in the desktop column and in the phone drawer (the drawer is never collapsed). */
function Panel({ isActive, onNavigate }: { isActive: (i: NavItem) => boolean; onNavigate: () => void }) {
  return (
    <>
      {/* ambient glow (clipped inside its own wrapper so the edge button can overhang) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "linear-gradient(to bottom, #000, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000, transparent 70%)",
          }}
        />
        <div className="absolute -left-20 -top-24 size-64 rounded-full blur-3xl" style={{ background: `${BRAND}14` }} />
      </div>

      {/* Brand */}
      <Link href="/levels" onClick={onNavigate} className="sb-brand sb-c relative flex items-center gap-3 p-4" aria-label="GD Tracker, levels">
        <Logo className="sb-logo size-11 shrink-0" />
        <div className="sb-x leading-none">
          <div className="font-heading text-xl font-black uppercase tracking-tighter" style={{ WebkitTextStroke: `1px ${BRAND}`, color: "transparent" }}>
            Tracker
          </div>
          <div className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Practice log</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto px-3 pb-3" aria-label="Main">
        <Section label="Workspace" />
        <div className="space-y-1">
          {MAIN.map((i) => (
            <NavButton key={i.id} item={i} active={isActive(i)} onNavigate={onNavigate} />
          ))}
        </div>

        <Section label="Track" />
        <div className="space-y-1">
          {TRACK.map((i) => (
            <NavButton key={i.id} item={i} active={isActive(i)} onNavigate={onNavigate} />
          ))}
        </div>

        <Section label="Account" />
        <NavButton item={{ id: "settings", label: "Settings", icon: Settings }} active={false} onNavigate={onNavigate} />
      </nav>

      {/* Streak + sync widget (placeholder numbers, connect them to real data when you have it) */}
      <div className="sb-x relative mx-4 mb-3 p-px" style={{ clipPath: poly(12), background: "rgba(255,255,255,.1)" }}>
        <div className="space-y-3 bg-[#0d1013] p-3.5" style={{ clipPath: poly(11) }}>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center border border-white/10 text-orange-400">
              <Flame className="size-4" />
            </span>
            <div className="leading-tight">
              <div className="font-heading text-base font-black tabular-nums text-white">12 day streak</div>
              <div className="font-mono text-[10px] text-slate-500">keep grinding</div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              <span>Weekly goal</span>
              <span className="tabular-nums text-slate-300">34 / 50 runs</span>
            </div>
            {/* progress as slanted ticks, like the bars on the cards */}
            <div className="flex gap-[2px]" role="img" aria-label="34 of 50 runs">
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  key={i}
                  className="h-2 flex-1"
                  style={{
                    background: i < 14 ? BRAND : "rgba(255,255,255,.08)",
                    opacity: i < 14 ? 0.45 + 0.55 * (i / 13) : 1,
                    clipPath: "polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: BRAND }}>
            <span className="flex items-center gap-2">
              <span className="size-1.5 animate-pulse" style={{ background: BRAND }} />
              Sync active
            </span>
            <span className="flex items-center gap-1 normal-case tracking-normal text-slate-400">
              <Wifi className="size-3" /> 1.2ms
            </span>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="sb-col sb-c relative flex items-center gap-3 border-t border-white/10 p-3">
        <div className="grid size-10 shrink-0 place-items-center font-heading text-sm font-black text-black" style={{ background: BRAND, clipPath: poly(8) }}>
          P
        </div>
        <div className="sb-x min-w-0 flex-1 leading-tight">
          <div className="truncate font-heading text-sm font-black uppercase tracking-tight text-white">Player One</div>
          <div className="truncate font-mono text-[10px] text-slate-500">demon grinder</div>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false); // only used for the toggle's label; the LOOK comes from data-sb on <html>
  const [open, setOpen] = useState(false); // phone drawer
  const isActive = (i: NavItem) => (i.href ? (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)) : false);

  // sync the toggle's state with what the boot script already put on <html> (nothing is written here, so nothing can overwrite your choice)
  useEffect(() => {
    setCollapsed(document.documentElement.dataset.sb === "collapsed");
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.sb = next ? "collapsed" : "open";
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
  };

  // drawer: close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* must come first: sets data-sb before anything below is painted */}
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <style>{CSS}</style>

      {/* desktop column (its width comes from --sb-w, see CSS above) */}
      <aside className="sb-aside sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-[#0b0e11] lg:flex" aria-label="Sidebar">
        {/* edge toggle: angled square on the border, below the slim bar so it is never covered */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="group absolute -right-3.5 top-24 z-30 grid size-7 place-items-center border border-white/15 bg-[#0d1013] text-slate-400 transition hover:text-black"
          style={{ clipPath: poly(6) }}
          onMouseEnter={(e) => (e.currentTarget.style.background = BRAND)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          <ChevronsLeft className="sb-rot size-4 transition-transform duration-300" />
        </button>

        <Panel isActive={isActive} onNavigate={() => {}} />
      </aside>

      {/* phones: menu button + drawer */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed bottom-4 left-4 z-40 grid size-11 place-items-center border border-white/15 bg-[#0d1013] text-white shadow-[0_8px_30px_-6px_rgba(0,0,0,.8)] transition active:scale-95 lg:hidden"
        style={{ clipPath: poly(10), paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Menu className="size-5" style={{ color: BRAND }} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="sb-fade absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="sb-in relative flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#0b0e11]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 grid size-8 place-items-center border border-white/15 text-slate-400 transition hover:text-white"
            >
              <X className="size-4" />
            </button>
            <Panel isActive={isActive} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}