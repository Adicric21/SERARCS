"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, Loader2 } from "lucide-react";
import type { CrewDTO } from "@/lib/types";
import { CrewEmblem } from "./ui";

export function ClaimMenu({
  requestId,
  crews,
  onDone,
  align = "right",
  label = "Claim",
  big = false,
}: {
  requestId: number;
  crews: CrewDTO[];
  onDone?: (msg: string, ok: boolean) => void;
  align?: "left" | "right";
  label?: string;
  big?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const claim = async (crew: CrewDTO) => {
    setBusy(crew.id);
    try {
      const res = await fetch(`/api/requests/${requestId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", crewId: crew.id }),
      });
      const data = await res.json();
      onDone?.(res.ok ? `${crew.name} set sail!` : data.error ?? "Claim failed", res.ok);
      setOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const sorted = [...crews].sort((a, b) => a.activeCount - b.activeCount);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className={big ? "btn-gold w-full" : "btn-gold !px-3 !py-1.5 text-xs"}
      >
        <Hand size={big ? 16 : 13} /> {label}
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-2 w-80 rounded-xl border border-gold/30 bg-[#050b18]/98 p-2 shadow-2xl backdrop-blur-xl fade-up ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Dispatch which crew?</div>
          <div className="max-h-80 space-y-1 overflow-y-auto scrollbar-thin">
            {sorted.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={busy !== null}
                onClick={(e) => {
                  e.preventDefault();
                  claim(c);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5 disabled:opacity-50"
              >
                <CrewEmblem name={c.name} color={c.color} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-slate-100">{c.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{c.specialty}</span>
                </span>
                {busy === c.id ? (
                  <Loader2 size={14} className="animate-spin text-gold" />
                ) : (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.activeCount === 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {c.activeCount === 0 ? "Ready" : `${c.activeCount} active`}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
