"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, Loader2, MapPin, Ship, Sparkles, Timer, Trophy, Zap } from "lucide-react";
import { ISLANDS, STATUSES, computePriority, formatDuration, type StatusKey } from "@/lib/lore";
import type { CrewDTO, DashboardData, RequestDTO } from "@/lib/types";
import { useNow } from "./useNow";
import { useToast } from "./Toast";
import { Bounty, CrewEmblem, SeverityBadge, StatusPill, TierBadge, TypeIcon, sevInfo, typeName } from "./ui";

const SPECIALTY: Record<string, string[]> = {
  chopper: ["medical", "blizzard", "toxic_gas"],
  sabo: ["fire", "raid", "quake"],
  heart: ["medical", "sea_king", "shipwreck"],
  franky: ["shipwreck", "quake", "aqua_laguna"],
  koala: ["sea_king", "sandstorm", "aqua_laguna"],
  marco: ["medical", "raid", "fire"],
  ivankov: ["toxic_gas", "medical"],
  kureha: ["blizzard", "medical"],
};

export function FleetConsole({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState(initial);
  const [sel, setSel] = useState<number>(initial.crews[0]?.id ?? 0);
  const [busy, setBusy] = useState<string | null>(null);
  const now = useNow(1000);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    const t = setInterval(load, 7000);
    return () => clearInterval(t);
  }, [load]);

  const crew = data.crews.find((c) => c.id === sel) ?? data.crews[0];
  const n = now ?? new Date(data.generatedAt);

  const live = useMemo(
    () =>
      data.active
        .map((r) => ({ ...r, liveScore: computePriority({ severity: r.severity, peopleAffected: r.peopleAffected, createdAt: r.createdAt, now: n }) }))
        .sort((a, b) => b.liveScore - a.liveScore),
    [data, n],
  );
  const pending = live.filter((r) => r.status === "pending");
  const mine = live.filter((r) => r.crewId === crew?.id);
  const specs = crew ? SPECIALTY[crew.slug] ?? [] : [];

  const act = async (key: string, id: number, body: Record<string, unknown>, ok: string) => {
    setBusy(key);
    try {
      const res = await fetch(`/api/requests/${id}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      toast.show(res.ok ? ok : d.error ?? "Failed", res.ok);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const leaderboard = [...data.crews].sort((a, b) => b.resolvedCount - a.resolvedCount);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">Chopper&apos;s Medical Rescue Armada × Revolutionary Army</div>
          <h1 className="font-display text-5xl leading-none gold-text">Rescue Fleet</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Select your crew to open its console. Claim the highest-bounty call in one tap, or pick a call that matches your crew&apos;s specialty.</p>
        </div>
        <div className="flex gap-3">
          <div className="panel px-4 py-2 text-center">
            <div className="font-mono text-2xl font-bold text-rose-300">{pending.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Unclaimed</div>
          </div>
          <div className="panel px-4 py-2 text-center">
            <div className="font-mono text-2xl font-bold text-sky-300">{data.crews.filter((c) => c.activeCount > 0).length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Crews at sea</div>
          </div>
        </div>
      </header>

      {/* Crew selector */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {data.crews.map((c) => {
          const on = c.id === crew?.id;
          return (
            <button
              key={c.id}
              onClick={() => setSel(c.id)}
              className={`panel group relative overflow-hidden p-4 text-left transition ${on ? "!border-transparent" : "hover:!border-gold/30"}`}
              style={on ? { boxShadow: `0 0 0 1.5px ${c.color}, 0 0 40px -12px ${c.color}` } : undefined}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl" style={{ background: c.color }} />
              <div className="flex items-center gap-3">
                <CrewEmblem name={c.name} color={c.color} size={42} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-slate-100">{c.name}</div>
                  <div className="truncate text-[11px] text-slate-500">Capt. {c.captain}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${c.activeCount ? "bg-sky-500/15 text-sky-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                  {c.activeCount ? `${c.activeCount} at sea` : "Docked"}
                </span>
                <span className="text-slate-500">{c.resolvedCount} rescued</span>
              </div>
            </button>
          );
        })}
      </section>

      {crew && (
        <section className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <div className="panel panel-gold rivets relative overflow-hidden p-6">
              <div className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: crew.color }} />
              <div className="relative flex flex-wrap items-center gap-5">
                <CrewEmblem name={crew.name} color={crew.color} size={72} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: crew.color }}>
                    Crew console
                  </div>
                  <h2 className="font-display text-4xl leading-tight text-slate-50">{crew.name}</h2>
                  <div className="flex flex-wrap gap-x-4 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Ship size={14} /> {crew.ship}
                    </span>
                    <span>Capt. {crew.captain}</span>
                    <span className="italic text-slate-500">“{crew.motto}”</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">{crew.specialty}</span>
                    {specs.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]" style={{ color: crew.color, background: `${crew.color}14` }}>
                        <TypeIcon type={s} size={11} /> {typeName(s)}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  className="btn-gold !py-3"
                  disabled={!pending.length || busy !== null}
                  onClick={() => pending[0] && act("next", pending[0].id, { action: "claim", crewId: crew.id }, `${crew.name} claimed ${pending[0].code}`)}
                >
                  {busy === "next" ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  Claim top bounty{pending[0] ? ` · ${pending[0].code}` : ""}
                </button>
              </div>
            </div>

            <div className="panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-title text-base font-bold text-slate-100">Active missions</h3>
                <span className="text-xs text-slate-500">{mine.length} assigned</span>
              </div>
              {mine.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Docked and ready. Claim a call to set sail.</div>}
              <div className="space-y-2.5">
                {mine.map((r) => (
                  <MissionRow key={r.id} r={r} n={n} busy={busy} onStatus={(s) => act(`${r.id}-${s}`, r.id, { action: "status", status: s }, `${r.code} → ${STATUSES[s].name}`)} onResolve={() => act(`${r.id}-res`, r.id, { action: "resolve" }, `${r.code} resolved!`)} />
                ))}
              </div>
            </div>

            <div className="panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-title text-base font-bold text-slate-100">Claimable calls · by live priority</h3>
                <span className="text-xs text-slate-500">
                  <Sparkles size={11} className="mr-1 inline text-gold" /> = specialty match
                </span>
              </div>
              {pending.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">All calls answered. Calm seas.</div>}
              <div className="space-y-2">
                {pending.map((r, i) => {
                  const match = specs.includes(r.emergencyType);
                  const sev = sevInfo(r.severity);
                  return (
                    <div key={r.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${match ? "border-gold/30 bg-gold/[0.04]" : "border-white/5 bg-black/20"}`}>
                      <span className="w-6 font-display text-2xl text-slate-500">{i + 1}</span>
                      <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ color: sev.color, background: `${sev.color}14` }}>
                        <TypeIcon type={r.emergencyType} size={17} />
                      </span>
                      <Link href={`/requests/${r.id}`} className="min-w-0 flex-1 hover:underline">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-mono text-gold/80">{r.code}</span>
                          {match && (
                            <span className="inline-flex items-center gap-1 text-gold">
                              <Sparkles size={11} /> Specialty
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[13.5px] font-semibold text-slate-100">{r.title}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin size={10} /> {ISLANDS[r.island as keyof typeof ISLANDS]?.name}
                          <Timer size={10} className="ml-2" /> {formatDuration(n.getTime() - new Date(r.createdAt).getTime())}
                        </div>
                      </Link>
                      <SeverityBadge severity={r.severity} />
                      <div className="w-28 text-right">
                        <TierBadge score={r.liveScore} />
                        <div className="text-[11px] text-slate-400">
                          <Bounty score={r.liveScore} />
                        </div>
                      </div>
                      <button className="btn-gold !px-3 !py-1.5 text-xs" disabled={busy !== null} onClick={() => act(`c-${r.id}`, r.id, { action: "claim", crewId: crew.id }, `${crew.name} claimed ${r.code}`)}>
                        {busy === `c-${r.id}` ? <Loader2 size={12} className="animate-spin" /> : "Claim"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <div className="panel p-5">
              <h3 className="mb-3 flex items-center gap-2 font-title text-base font-bold text-slate-100">
                <Trophy size={16} className="text-gold" /> Lives-saved leaderboard
              </h3>
              <div className="space-y-2">
                {leaderboard.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className={`w-5 text-center font-display text-xl ${i === 0 ? "gold-text" : "text-slate-500"}`}>{i + 1}</span>
                    <CrewEmblem name={c.name} color={c.color} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-slate-200">{c.name}</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full" style={{ width: `${(c.resolvedCount / Math.max(1, leaderboard[0].resolvedCount)) * 100}%`, background: c.color }} />
                      </div>
                    </div>
                    <span className="font-mono text-sm text-slate-300">{c.resolvedCount}</span>
                    {i === 0 && <Crown size={14} className="text-gold" />}
                  </div>
                ))}
              </div>
            </div>
            <CrewRoster crews={data.crews} />
          </div>
        </section>
      )}
      {toast.node}
    </div>
  );
}

function MissionRow({
  r,
  n,
  busy,
  onStatus,
  onResolve,
}: {
  r: RequestDTO & { liveScore: number };
  n: Date;
  busy: string | null;
  onStatus: (s: StatusKey) => void;
  onResolve: () => void;
}) {
  const next: StatusKey | null = r.status === "claimed" ? "en_route" : r.status === "en_route" ? "on_scene" : null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ color: sevInfo(r.severity).color, background: `${sevInfo(r.severity).color}14` }}>
        <TypeIcon type={r.emergencyType} size={17} />
      </span>
      <Link href={`/requests/${r.id}`} className="min-w-0 flex-1 hover:underline">
        <div className="text-[11px] font-mono text-gold/80">{r.code}</div>
        <div className="truncate text-[13.5px] font-semibold text-slate-100">{r.title}</div>
        <div className="text-[11px] text-slate-500">
          {ISLANDS[r.island as keyof typeof ISLANDS]?.name} · {formatDuration(n.getTime() - new Date(r.createdAt).getTime())}
        </div>
      </Link>
      <StatusPill status={r.status} />
      {next && (
        <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={busy !== null} onClick={() => onStatus(next)}>
          {busy === `${r.id}-${next}` ? <Loader2 size={12} className="animate-spin" /> : `→ ${STATUSES[next].short}`}
        </button>
      )}
      <button className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50" disabled={busy !== null} onClick={onResolve}>
        {busy === `${r.id}-res` ? <Loader2 size={12} className="animate-spin" /> : "Resolve"}
      </button>
    </div>
  );
}

function CrewRoster({ crews }: { crews: CrewDTO[] }) {
  return (
    <div className="panel p-5">
      <h3 className="mb-3 font-title text-base font-bold text-slate-100">Fleet manifest</h3>
      <div className="space-y-3 text-[12px]">
        {crews.map((c) => (
          <div key={c.id} className="border-l-2 pl-3" style={{ borderColor: c.color }}>
            <div className="font-semibold text-slate-200">{c.ship}</div>
            <div className="text-slate-500">{c.specialty}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
