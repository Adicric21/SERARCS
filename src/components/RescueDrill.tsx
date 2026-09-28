"use client";

import { useEffect, useRef, useState } from "react";
import { Anchor, Pause, Play, RotateCcw, Sailboat, Siren } from "lucide-react";
import type { CrewDTO } from "@/lib/types";
import { useToast } from "./Toast";

const steps = [
  { label: "Den Den Mushi rings", detail: "Punk Hazard reports a Shinokuni leak." },
  { label: "Haki engine ranks it", detail: "Critical severity enters the top of the queue." },
  { label: "Chopper-01 dispatched", detail: "Medical rescue crew claims the mission." },
  { label: "Rescue underway", detail: "Crew changes status to EN ROUTE and ON SCENE." },
  { label: "Safe harbor", detail: "Mission is resolved and written to the Captain's Log." },
];

export function RescueDrill({ crews, onRefresh }: { crews: CrewDTO[]; onRefresh: () => Promise<void> }) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [requestId, setRequestId] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  const stop = () => {
    setRunning(false);
    if (timer.current) clearTimeout(timer.current);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const action = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Drill action failed");
    return res.json().catch(() => null);
  };

  const runStep = async (next: number, id: number) => {
    setStep(next);
    if (next === 1) {
      await onRefresh();
    } else if (next === 2) {
      const crew = crews.find((c) => c.slug === "chopper") ?? crews[0];
      if (crew) await action(`/api/requests/${id}/actions`, { action: "claim", crewId: crew.id });
    } else if (next === 3) {
      await action(`/api/requests/${id}/actions`, { action: "status", status: "en_route", actor: "Chopper-01" });
      await action(`/api/requests/${id}/actions`, { action: "status", status: "on_scene", actor: "Chopper-01" });
    } else if (next === 4) {
      await action(`/api/requests/${id}/actions`, { action: "resolve", actor: "Chopper-01", note: "Shinokuni leak contained. Civilians evacuated and medical treatment started." });
    }
    await onRefresh();
  };

  const start = async () => {
    stop();
    try {
      const created = await action("/api/requests", {
        title: "Shinokuni leak — live rescue drill",
        emergencyType: "toxic_gas",
        island: "punk",
        locationDetail: "Burning half · Lab R-66",
        severity: 5,
        description: "Controlled presentation scenario: toxic gas moving toward an evacuation shelter.",
        callerName: "G-5 lookout · Drill Channel",
        peopleAffected: 37,
      });
      const id = Number(created.id);
      setRequestId(id);
      setStep(0);
      setRunning(true);
      toast.show("Drill launched · Den Den Mushi is ringing", true);
      await onRefresh();

      let next = 1;
      const tick = async () => {
        try {
          await runStep(next, id);
          if (next < steps.length - 1) {
            next += 1;
            timer.current = setTimeout(tick, 2200);
          } else {
            setRunning(false);
            toast.show("Drill complete · mission archived", true);
          }
        } catch (e) {
          setRunning(false);
          toast.show(e instanceof Error ? e.message : "Drill failed", false);
        }
      };
      timer.current = setTimeout(tick, 1800);
    } catch (e) {
      setRunning(false);
      toast.show(e instanceof Error ? e.message : "Could not start drill", false);
    }
  };

  return (
    <div className="panel ink-border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center border border-gold/30 bg-gold/10 text-gold"><Sailboat size={17} /></div>
          <div>
            <div className="nautical-label">Captain's presentation tool</div>
            <div className="font-title text-sm font-bold text-slate-100">Grand Line Rescue Drill</div>
          </div>
        </div>
        <div className="flex gap-2">
          {!running ? (
            <button className="btn-gold !rounded-md !px-3 !py-2 text-xs" onClick={start}><Play size={14} /> Launch drill</button>
          ) : (
            <button className="btn-ghost !rounded-md !px-3 !py-2 text-xs" onClick={stop}><Pause size={14} /> Pause</button>
          )}
          <button className="btn-ghost !rounded-md !px-3 !py-2 text-xs" onClick={() => { stop(); setStep(-1); setRequestId(null); }}><RotateCcw size={14} /> Reset view</button>
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-5">
        {steps.map((s, i) => (
          <div key={s.label} className={`relative min-h-[88px] border-b border-r border-gold/10 p-3 md:border-b-0 ${i === step ? "bg-rose-500/[0.08]" : "bg-black/10"}`}>
            <div className={`mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] ${i <= step ? "text-gold" : "text-slate-600"}`}>
              {i === 0 ? <Siren size={12} /> : <Anchor size={12} />} {String(i + 1).padStart(2, "0")}
            </div>
            <div className={`text-xs font-semibold ${i <= step ? "text-slate-100" : "text-slate-500"}`}>{s.label}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-slate-600">{s.detail}</div>
          </div>
        ))}
      </div>
      {requestId && <div className="border-t border-gold/10 px-4 py-2 font-mono text-[10px] text-slate-600">DRILL SIGNAL · SOS-{String(requestId).padStart(4, "0")} · controlled demo sequence</div>}
      {toast.node}
    </div>
  );
}
