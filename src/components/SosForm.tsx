"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Radio, Sparkles, Users } from "lucide-react";
import {
  EMERGENCY_TYPES,
  ISLANDS,
  SEVERITIES,
  computePriority,
  formatBounty,
  tierFor,
  type EmergencyTypeKey,
  type IslandKey,
  type Severity,
} from "@/lib/lore";
import type { DashboardData, RequestDTO } from "@/lib/types";
import { GrandLineMap } from "./GrandLineMap";
import { SeverityPips, TypeIcon } from "./ui";
import { useToast } from "./Toast";

const PRESETS: { label: string; v: Partial<FormState> }[] = [
  {
    label: "Drum Island blizzard",
    v: { emergencyType: "blizzard", island: "drum", severity: 4, title: "Climbers trapped in whiteout", locationDetail: "Drum Rockies, north face", description: "Expedition team stranded by blizzard, two unconscious from hypothermia.", peopleAffected: 6 },
  },
  {
    label: "Alabasta sandstorm",
    v: { emergencyType: "sandstorm", island: "alabasta", severity: 3, title: "Sandstorm buries Nanohana road", locationDetail: "Nanohana → Katorea route", description: "Travelers disoriented; camels lost. Water running out.", peopleAffected: 12 },
  },
  {
    label: "Punk Hazard gas leak",
    v: { emergencyType: "toxic_gas", island: "punk", severity: 5, title: "Gas cloud engulfs research wing", locationDetail: "Frozen half, Lab C", description: "Lethal gas leak; researchers sealed inside, air running out.", peopleAffected: 40 },
  },
];

type FormState = {
  emergencyType: EmergencyTypeKey;
  island: IslandKey;
  locationDetail: string;
  severity: Severity;
  title: string;
  description: string;
  callerName: string;
  peopleAffected: number;
};

export function SosForm() {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<FormState>({
    emergencyType: "medical",
    island: "drum",
    locationDetail: "",
    severity: 3,
    title: "",
    description: "",
    callerName: "",
    peopleAffected: 1,
  });
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<RequestDTO[]>([]);

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: DashboardData) => setActive(d.active))
      .catch(() => {});
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const score = computePriority({ severity: f.severity, peopleAffected: f.peopleAffected, createdAt: new Date() });
  const tier = tierFor(score);
  const sev = SEVERITIES[f.severity];
  const island = ISLANDS[f.island];
  const queuePos = useMemo(() => {
    const now = new Date();
    return (
      active.filter((r) => r.status === "pending" && computePriority({ severity: r.severity, peopleAffected: r.peopleAffected, createdAt: r.createdAt, now }) > score)
        .length + 1
    );
  }, [active, score]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 3) {
      toast.show("Give the distress call a short title.", false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data.error ?? "Transmission failed", false);
        return;
      }
      toast.show(`Gacha! ${data.code} received by dispatch.`);
      router.push(`/requests/${data.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <header className="panel panel-gold relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative h-20 w-20 shrink-0">
              <span className="sonar absolute inset-1 rounded-full" style={{ ["--pulse" as string]: "#f2c14e" }} />
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-gold/50">
                <Image src="/images/theme/den-den-mushi.png" alt="" fill sizes="80px" className="object-cover ringing" />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">Puru puru puru… gacha!</div>
              <h1 className="font-display text-5xl leading-none gold-text">Transmit a Distress Call</h1>
              <p className="mt-2 text-sm text-slate-400">Your call is instantly ranked by the Haki Priority Engine and broadcast to every rescue crew at sea.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Quick scenarios:</span>
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setF((prev) => ({ ...prev, ...p.v }) as FormState)} className="btn-ghost !px-3 !py-1.5 text-xs">
                <Sparkles size={12} className="text-gold" /> {p.label}
              </button>
            ))}
          </div>
        </header>

        {/* Step 1 */}
        <section className="panel p-5">
          <StepTitle n={1} title="Nature of the emergency" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {(Object.keys(EMERGENCY_TYPES) as EmergencyTypeKey[]).map((k) => {
              const t = EMERGENCY_TYPES[k];
              const on = f.emergencyType === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("emergencyType", k)}
                  className={`group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
                    on ? "border-gold/70 bg-gold/10 shadow-[0_0_24px_-10px_#f2c14e]" : "border-white/[0.06] bg-black/20 hover:border-gold/30"
                  }`}
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${on ? "bg-gold text-[#1b1206]" : "bg-white/5 text-slate-300 group-hover:text-gold"}`}>
                    <TypeIcon type={k} size={18} />
                  </span>
                  <span className="text-[13px] font-semibold leading-tight text-slate-100">{t.name}</span>
                  <span className="text-[10.5px] leading-tight text-slate-500">{t.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2 */}
        <section className="panel p-5">
          <StepTitle n={2} title="Location on the Grand Line" />
          <GrandLineMap requests={active} height={320} highlightIsland={f.island} onPickIsland={(k) => set("island", k)} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Island</span>
              <select className="field" value={f.island} onChange={(e) => set("island", e.target.value as IslandKey)}>
                {(Object.keys(ISLANDS) as IslandKey[]).map((k) => (
                  <option key={k} value={k} className="bg-[#050b18]">
                    {ISLANDS[k].name} — {ISLANDS[k].sea}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Exact location / landmark</span>
              <input className="field" placeholder="e.g. Bighorn village, east slope" value={f.locationDetail} onChange={(e) => set("locationDetail", e.target.value)} />
            </label>
          </div>
        </section>

        {/* Step 3 */}
        <section className="panel p-5">
          <StepTitle n={3} title="Severity level" />
          <div className="grid gap-5 md:grid-cols-[1fr_260px] md:items-center">
            <div>
              <input type="range" min={1} max={5} step={1} value={f.severity} onChange={(e) => set("severity", Number(e.target.value) as Severity)} className="sev-range w-full" />
              <div className="mt-3 grid grid-cols-5 text-center">
                {([1, 2, 3, 4, 5] as Severity[]).map((l) => (
                  <button type="button" key={l} onClick={() => set("severity", l)} className="flex flex-col items-center gap-0.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${f.severity === l ? "" : "opacity-50"}`} style={{ color: SEVERITIES[l].color }}>
                      {SEVERITIES[l].name}
                    </span>
                    <span className="text-[10px] text-slate-500">{SEVERITIES[l].sea}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: `${sev.color}55`, background: `${sev.color}0f` }}>
              <div className="flex items-center justify-between">
                <span className="font-title text-lg font-bold" style={{ color: sev.color }}>
                  {sev.name}
                </span>
                <SeverityPips severity={f.severity} />
              </div>
              <p className="mt-1 text-xs text-slate-300">{sev.blurb}</p>
              <p className="mt-2 font-mono text-[11px] text-slate-500">
                base {sev.base} · +{sev.agingPerMin}/min waiting
              </p>
            </div>
          </div>
        </section>

        {/* Step 4 */}
        <section className="panel p-5">
          <StepTitle n={4} title="Situation report" />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Headline *</span>
              <input className="field" placeholder="e.g. Village buried by avalanche" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={140} required />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">What is happening?</span>
              <textarea className="field min-h-28" placeholder="Injuries, hazards, access routes, supplies needed…" value={f.description} onChange={(e) => set("description", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">Caller name / transponder snail ID</span>
              <input className="field" placeholder="Anonymous" value={f.callerName} onChange={(e) => set("callerName", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-400">People affected</span>
              <input className="field" type="number" min={1} value={f.peopleAffected} onChange={(e) => set("peopleAffected", Math.max(1, Number(e.target.value) || 1))} />
            </label>
          </div>
        </section>
      </div>

      {/* PREVIEW */}
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="parchment relative overflow-hidden rounded-md p-6 text-center">
          <div className="pointer-events-none absolute inset-3 rounded border-2 border-[#5c3a14]/40" />
          <div className="font-display text-6xl leading-none tracking-wider text-[#3b2410]">DISTRESS</div>
          <div className="mt-1 font-title text-xs font-bold uppercase tracking-[0.4em] text-[#5c3a14]">Den Den Mushi Dispatch</div>

          <div className="mx-auto mt-5 grid aspect-[4/3] w-full place-items-center rounded-sm border-4 border-[#3b2410]/80 bg-[#2a1a0b]/90 shadow-inner">
            <div className="flex flex-col items-center gap-2" style={{ color: sev.color }}>
              <TypeIcon type={f.emergencyType} size={64} />
              <span className="font-title text-sm font-bold uppercase tracking-widest text-[#f3e2bd]">{EMERGENCY_TYPES[f.emergencyType].name}</span>
            </div>
          </div>

          <div className="mt-4 font-display text-3xl leading-tight text-[#2a1a0b]">{f.title || "Untitled distress call"}</div>
          <div className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-[#5c3a14]">
            <MapPin size={14} /> {island.name}
            {f.locationDetail ? ` · ${f.locationDetail}` : ""}
          </div>

          <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.35em] text-[#5c3a14]">Initial priority bounty</div>
          <div className="mt-1 flex items-center justify-center gap-2 font-title text-3xl font-black text-[#2a1a0b]">
            <span className="text-2xl">฿</span>
            {formatBounty(score)}
            <span className="text-lg">-</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-[#3b2410]">
            <div className="rounded border border-[#5c3a14]/30 bg-white/20 p-2">
              <div className="text-[9px] font-bold uppercase tracking-widest opacity-70">Tier</div>
              <div className="font-title text-sm font-black">{tier.name}</div>
            </div>
            <div className="rounded border border-[#5c3a14]/30 bg-white/20 p-2">
              <div className="text-[9px] font-bold uppercase tracking-widest opacity-70">Severity</div>
              <div className="font-title text-sm font-black">{sev.name}</div>
            </div>
            <div className="rounded border border-[#5c3a14]/30 bg-white/20 p-2">
              <div className="text-[9px] font-bold uppercase tracking-widest opacity-70">Queue</div>
              <div className="font-title text-sm font-black">#{queuePos}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-[#5c3a14]">
            <Users size={13} /> {f.peopleAffected} {f.peopleAffected === 1 ? "person" : "people"} in need
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-red mt-4 w-full !py-4 text-base">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Radio size={18} />}
          {busy ? "Transmitting…" : "Transmit SOS to all crews"}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">Priority rises automatically the longer this call waits.</p>
      </aside>
      {toast.node}
    </form>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-gold/50 bg-gold/10 font-title text-sm font-black text-gold">{n}</span>
      <h2 className="font-title text-base font-bold tracking-wide text-slate-100">{title}</h2>
      <div className="rope-divider ml-2 flex-1 opacity-30" />
    </div>
  );
}
