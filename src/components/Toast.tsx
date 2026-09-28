"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean; id: number } | null>(null);
  const show = useCallback((msg: string, ok = true) => {
    const id = Date.now();
    setToast({ msg, ok, id });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 3200);
  }, []);
  const node = toast ? (
    <div className="fixed bottom-6 right-6 z-[100] fade-up">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
          toast.ok ? "border-emerald-400/40 bg-emerald-950/80 text-emerald-100" : "border-rose-400/40 bg-rose-950/80 text-rose-100"
        }`}
      >
        {toast.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        {toast.msg}
      </div>
    </div>
  ) : null;
  return { show, node };
}
