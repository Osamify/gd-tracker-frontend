"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Play,
  BarChart3,
  Trophy,
  History,
  Target,
  Settings,
  ChevronsLeft,
  Plus,
  Sparkles,
  Flame,
  Wifi,
} from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  href?: string;
};

const MAIN: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { id: "projects", label: "Levels", icon: Layers, badge: 5, href: "/levels" },
  { id: "practice", label: "Practice Mode", icon: Play },
  { id: "stats", label: "Statistics", icon: BarChart3 },
];

const TRACK: NavItem[] = [
  { id: "history", label: "Run History", icon: History },
  { id: "goals", label: "Goals", icon: Target, badge: "3" },
  { id: "completed", label: "Completed", icon: Trophy },
];

function NavButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const className = `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
        active
          ? "bg-gradient-to-r from-cyan-500/20 via-violet-500/15 to-transparent text-cyan-300 ring-1 ring-cyan-400/30 shadow-[0_0_24px_-6px_rgba(34,211,238,0.5)]"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
      } ${collapsed ? "justify-center" : ""}`;
  const content = (
    <>
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.8)]" />
      )}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110 ${
          active ? "text-cyan-300" : "text-slate-500 group-hover:text-cyan-300"
        }`}
      />
      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
      {!collapsed && item.badge !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            active ? "bg-cyan-400/20 text-cyan-200" : "bg-slate-800 text-slate-300"
          }`}
        >
          {item.badge}
        </span>
      )}
      {collapsed && item.badge !== undefined && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-pink-500 ring-2 ring-[#070b0e]" />
      )}
    </>
  );
  return item.href ? (
    <Link href={item.href} onClick={onClick} title={collapsed ? item.label : undefined} className={className}>
      {content}
    </Link>
  ) : (
    <button onClick={onClick} title={collapsed ? item.label : undefined} className={className}>
      {content}
    </button>
  );
}

function Section({ label, collapsed }: { label: string; collapsed: boolean }) {
  return collapsed ? (
    <div className="mx-3 my-2 h-px bg-slate-800" />
  ) : (
    <span className="mb-1 mt-4 block px-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
      {label}
    </span>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("");
  const pathname = usePathname();
  const isActive = (i: NavItem) =>
    i.href ? (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)) : active === i.id;

  return (
    <aside
      className={`sticky top-0 z-20 flex h-screen shrink-0 flex-col border-r border-slate-800 bg-[#070b0e] transition-[width] duration-300 ${
        collapsed ? "w-[84px]" : "w-72"
      }`}
    >
      {/* ambient glow (clipped inside its own wrapper so the edge button can overhang) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-violet-600/15 blur-3xl" />
      </div>

      {/* Edge toggle arrow */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="group absolute -right-3.5 top-7 z-30 grid h-7 w-7 place-items-center rounded-full border border-slate-700 bg-[#0d1318] text-slate-400 shadow-lg transition hover:scale-110 hover:border-cyan-400/60 hover:text-cyan-300 hover:shadow-[0_0_16px_-2px_rgba(34,211,238,0.6)]"
      >
        <ChevronsLeft
          className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
        />
      </button>

      {/* Brand */}
      <div className={`relative flex items-center gap-3 p-4 ${collapsed ? "justify-center" : ""}`}>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_24px_-2px_rgba(139,92,246,0.7)]">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight text-white">DemonLab</div>
            <div className="text-xs font-medium text-slate-500">Practice Tracker</div>
          </div>
        )}
      </div>

      {/* New project CTA */}
      <div className="relative px-4">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/40 bg-cyan-400/5 py-2.5 text-sm font-bold text-cyan-300 transition hover:border-cyan-300/70 hover:bg-cyan-400/10 hover:shadow-[0_0_20px_-6px_rgba(34,211,238,0.6)]"
          title="New project"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && "New Project"}
        </button>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto px-3 pb-3">
        <Section label="Workspace" collapsed={collapsed} />
        <div className="space-y-1">
          {MAIN.map((i) => (
            <NavButton key={i.id} item={i} active={isActive(i)} collapsed={collapsed} onClick={() => setActive(i.id)} />
          ))}
        </div>

        <Section label="Track" collapsed={collapsed} />
        <div className="space-y-1">
          {TRACK.map((i) => (
            <NavButton key={i.id} item={i} active={isActive(i)} collapsed={collapsed} onClick={() => setActive(i.id)} />
          ))}
        </div>

        <Section label="Account" collapsed={collapsed} />
        <NavButton
          item={{ id: "settings", label: "Settings", icon: Settings }}
          active={active === "settings"}
          collapsed={collapsed}
          onClick={() => setActive("settings")}
        />
      </nav>

      {/* Streak + sync widget */}
      {!collapsed && (
        <div className="relative mx-4 mb-3 space-y-3 rounded-2xl border border-slate-800 bg-white/[0.03] p-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/15 text-orange-400">
              <Flame className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold text-white">12 day streak</div>
              <div className="text-[11px] text-slate-500">Keep grinding</div>
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-400">
              <span>Weekly goal</span>
              <span>34 / 50 runs</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_10px_rgba(139,92,246,0.7)]" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              SYNC ACTIVE
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <Wifi className="h-3 w-3" /> 1.2ms
            </span>
          </div>
        </div>
      )}

      {/* Profile + collapse */}
      <div className={`relative flex items-center gap-3 border-t border-slate-800 p-3 ${collapsed ? "flex-col" : ""}`}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-sm font-extrabold text-white ring-2 ring-slate-800">
          P
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-bold text-white">Player One</div>
            <div className="truncate text-xs text-slate-500">Demon grinder</div>
          </div>
        )}
      </div>
    </aside>
  );
}