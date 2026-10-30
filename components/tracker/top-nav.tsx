import { useState } from "react";
import {
  Sparkles,
  Search,
  Bell,
  Plus,
  LayoutDashboard,
  ListOrdered,
  BarChart3,
  Command,
} from "lucide-react";

const LINKS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "list", label: "Demon List", icon: ListOrdered },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

export function TopNav() {
  const [active, setActive] = useState("dashboard");

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-[#070b0e]/90 px-4 backdrop-blur-md md:px-6">
      {/* bottom accent line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 shadow-[0_0_22px_-2px_rgba(139,92,246,0.7)]">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="hidden leading-tight sm:block">
          <h1 className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-lg font-extrabold tracking-[0.2em] text-transparent">
            DEMONTRACK
          </h1>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Practice HUD
          </span>
        </div>
      </div>

      {/* Nav pills */}
      <nav className="hidden items-center gap-1 rounded-full border border-slate-800 bg-white/[0.03] p-1 md:flex">
        {LINKS.map(({ id, label, icon: Icon }) => {
          const on = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                on
                  ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/40 shadow-[0_0_20px_-6px_rgba(34,211,238,0.7)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search */}
        <button className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-white/[0.03] px-3 py-2 text-sm text-slate-500 transition hover:border-slate-700 hover:text-slate-300 lg:flex">
          <Search className="h-4 w-4" />
          <span className="w-32 text-left">Search levels…</span>
          <kbd className="flex items-center gap-0.5 rounded-md border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
        <button
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-white/[0.03] text-slate-400 transition hover:text-cyan-300 lg:hidden"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-white/[0.03] text-slate-400 transition hover:border-slate-700 hover:text-cyan-300"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-pink-500 ring-2 ring-[#070b0e]" />
        </button>

        {/* CTA */}
        <button className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.7)] transition hover:scale-[1.03] hover:shadow-[0_0_32px_-2px_rgba(34,211,238,0.7)] active:scale-95">
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          <span className="hidden sm:inline">Add Demon</span>
        </button>
      </div>
    </header>
  );
}