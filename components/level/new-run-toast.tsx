import { Trophy, Radio,X } from "lucide-react";

export interface ToastData {
  id: number;
  tone: 'run' | 'best';
  title: string;
  body: string;
}

interface NewRunToastProps {
  toast: ToastData; // 👈 "I only accept objects that match the ToastData blueprint"
  onClose: () => void;
}

export default function NewRunToast({toast, onClose}: NewRunToastProps) {
  return <>
    <div
      key={toast.id}
      role="status"
      className="gd-rise fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-[#0a1015]/90 p-4 shadow-2xl backdrop-blur-xl"
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${toast.tone === 'best' ? 'bg-yellow-400/15 text-yellow-300' : 'bg-cyan-400/15 text-cyan-300'
          }`}
      >
        {toast.tone === 'best' ? <Trophy className="size-5" /> : <Radio className="size-5" />}
      </span>
      <div className="leading-tight">
        <div className="text-sm font-extrabold text-white">{toast.title}</div>
        <div className="text-xs tabular-nums text-slate-400">{toast.body}</div>
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="ml-1 grid size-6 place-items-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  </>
}