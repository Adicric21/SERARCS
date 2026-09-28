"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Anchor,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Navigation,
  Phone,
  Sailboat,
  Undo2,
  Users,
  Flag,
} from "lucide-react";
import {
  ISLANDS,
  PRIORITY_TIERS,
  SEVERITIES,
  STATUSES,
  STATUS_ORDER,
  computePriority,
  formatDuration,
  tierFor,
  timeAgo,
  PEOPLE_BONUS_CAP,
  type Severity,
  type StatusKey,
} from "@/lib/lore";
import type { RequestDetail } from "@/lib/types";
import { useNow } from "./useNow";
import { useToast } from "./Toast";
import { ClaimMenu } from "./ClaimMenu";
import { GrandLineMap } from "./GrandLineMap";
import { eventColor } from "./CommandDeck";
import { Bounty, CrewEmblem, SeverityBadge, StatusPill, TierBadge, TypeIcon, sevInfo, typeName } from "./ui";

export function RequestConsole({ initial }: { initial: RequestDetail }) {
  const [d, setD] = useState(initial);
  const [note, setNote] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const now = useNow(1000);
  const toast = useToast();
  const r = d.request;

  const load = useCallback(async () => {
    const res = await fetch(`/api/requests/${r.id}`, { cache: "no-store" });
    if (res.ok) setD(await res.json());
  }, [r.id]);

  useEffect(() => {
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (key: string, body: Record<string, unknown>, okMsg: string) => {
    setBusy(key);
    try {
      const res = await fetch(`/api/requests/${r.id}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      toast.show(res.ok ? okMsg : data.error ?? "Action failed", res.ok);
      if (res.ok) await load();
      return res.ok;
    } finally {
      setBusy(null);
    }
  };

  const n = now ?? new Date(r.priorityUpdatedAt);
  const resolved = r.status === "resolved";
  const liveScore = resolved ? r.priorityScore : computePriority({ severity: r.severity, peopleAffected: r.peopleAffected, createdAt: r.createdAt, now: n });
  const sev = sevInfo(r.severity);
  const tier = tierFor(liveScore);
  const island = ISLANDS[r.island as keyof typeof ISLANDS];
  const endMs = r.resolvedAt ? new Date(r.resolvedAt).getTime() : n.getTime();
  const waitMs = endMs - new Date(r.createdAt).getTime();
  const waitMin = waitMs / 60000;
  const crowd = Math.min(PEOPLE_BONUS_CAP, Math.log2(Math.max(1, r.peopleAffected)) * 2.5);
  const crew = d.crews.find((c) => c.id === r.crewId);
  const step = STATUSES[r.status].step;

  const stepTime = (s: StatusKey) => {
    if (s === "pending") return r.createdAt;
    const ev = [...d.events].reverse().find((e) => e.toStatus === s);
    return ev?.createdAt ?? null;
  };

  const nextStatus: Record<string, { to: StatusKey; label: string; icon: React.ReactNode } | null> = {
    claimed: { to: "en_route", label: "Set sail · En route", icon: <Sailboat size={16} /> },
    en_route: { to: "on_scene", label: "Landed on scene", icon: <Flag size={16} /> },
    on_scene: null,
  };
  const nx = nextStatus[r.status];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold">
        <ArrowLeft size={15} /> Back to Command Deck
      </Link>

      {/* HEADER */}
      <header className="panel panel-gold relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl" style={{ background: `${sev.color}22` }} />
        <div className="relative flex flex-wrap items-start gap-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2" style={{ color: sev.color, borderColor: `${sev.color}70`, background: `${sev.color}14`, boxShadow: `0 0 30px -8px ${sev.color}` }}>
            <TypeIcon type={r.emergencyType} size={30} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-gold">{r.code}</span>
              <StatusPill status={r.status} />
              <SeverityBadge severity={r.severity} />
              <TierBadge score={liveScore} />
            </div>
            <h1 className="mt-2 font-display text-4xl leading-tight text-slate-50 md:text-5xl">{r.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-gold/70" /> {island?.name} · {island?.sea}
                {r.locationDetail ? ` · ${r.locationDetail}` : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone size={14} className="text-gold/70" /> {r.callerName}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} className="text-gold/70" /> {r.peopleAffected} affected
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">{resolved ? "Total time to rescue" : "Waiting at sea"}</div>
            <div className="font-mono text-4xl font-bold tabular-nums text-slate-50">{formatDuration(waitMs)}</div>
            {d.queuePosition && <div className="mt-1 text-sm text-gold">Queue position #{d.queuePosition}</div>}
          </div>
        </div>

        {/* Voyage stepper */}
        <div className="relative mt-7 grid grid-cols-5 gap-2">
          {STATUS_ORDER.map((s, i) => {
            const st = STATUSES[s];
            const done = i <= step;
            const current = i === step;
            const t = done ? stepTime(s) : null;
            return (
              <div key={s} className="relative">
                <div className="flex items-center">
                  <span
                    className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-title text-xs font-black ${current && !resolved ? "glow-ring" : ""}`}
                    style={{
                      borderColor: done ? st.color : "rgba(255,255,255,0.1)",
                      background: done ? `${st.color}22` : "rgba(3,8,20,0.8)",
                      color: done ? st.color : "#475569",
                      ["--glow" as string]: st.color,
                    }}
                  >
                    {i === 4 ? <Anchor size={15} /> : i + 1}
                  </span>
                  {i < 4 && <div className="h-0.5 flex-1" style={{ background: i < step ? `linear-gradient(90deg, ${st.color}, ${STATUSES[STATUS_ORDER[i + 1]].color})` : "rgba(255,255,255,0.07)" }} />}
                </div>
                <div className="mt-2 pr-2">
                  <div className={`text-[12px] font-semibold ${done ? "text-slate-100" : "text-slate-600"}`}>{st.name}</div>
                  <div className="text-[10.5px] text-slate-500">{t ? new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {/* Situation */}
          <section className="panel p-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">Situation report</div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">{r.description || "No additional details transmitted."}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Fact label="Emergency" value={typeName(r.emergencyType)} />
              <Fact label="Island climate" value={island?.climate ?? "—"} />
              <Fact label="Reported" value={new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} />
              <Fact
                label="Time to claim"
                value={r.claimedAt ? formatDuration(new Date(r.claimedAt).getTime() - new Date(r.createdAt).getTime()) : resolved ? "—" : "Awaiting crew"}
              />
            </div>
            {resolved && r.resolutionNote && (
              <div className="mt-5 flex gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="shrink-0 text-emerald-300" size={20} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">Safe harbor · resolution report</div>
                  <p className="mt-1 text-sm text-emerald-50">{r.resolutionNote}</p>
                </div>
              </div>
            )}
          </section>

          {/* Captain's log */}
          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">Full request history</div>
                <h2 className="font-title text-lg font-bold text-slate-100">Captain&apos;s Log</h2>
              </div>
              <span className="text-xs text-slate-500">{d.events.length} entries</span>
            </div>

            {!resolved && (
              <form
                className="mb-5 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  if (await act("note", { action: "note", message: note }, "Log entry recorded")) setNote("");
                }}
              >
                <input className="field" placeholder="Add a field update to the log (e.g. 'Supplies dropped, 3 survivors located')" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="btn-ghost shrink-0" disabled={busy === "note" || !note.trim()}>
                  {busy === "note" ? <Loader2 size={15} className="animate-spin" /> : <MessageSquarePlus size={15} />} Log
                </button>
              </form>
            )}

            <ol className="relative space-y-4">
              {d.events.map((e, i) => (
                <li key={e.id} className="relative pl-9">
                  {i < d.events.length - 1 && <span className="absolute left-[13px] top-7 bottom-[-18px] w-px bg-gradient-to-b from-gold/30 to-transparent" />}
                  <span className="absolute left-0 top-0.5 grid h-7 w-7 place-items-center rounded-full border-2 border-[#050b18]" style={{ background: `${eventColor(e.kind)}30`, boxShadow: `0 0 0 1px ${eventColor(e.kind)}` }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: eventColor(e.kind) }} />
                  </span>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded px-1.5 py-0.5 font-bold uppercase tracking-wider" style={{ color: eventColor(e.kind), background: `${eventColor(e.kind)}14` }}>
                        {e.kind}
                      </span>
                      <span className="font-semibold text-slate-300">{e.actor}</span>
                      <span className="ml-auto text-slate-500">
                        {new Date(e.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })} · {timeAgo(e.createdAt, n)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] text-slate-200">{e.message}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6 xl:col-span-4">
          {/* Priority */}
          <section className="panel panel-gold rivets p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">{resolved ? "Final priority bounty" : "Live priority bounty"}</div>
            <div className="mt-1 font-title text-4xl font-black gold-text">
              <Bounty score={liveScore} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span style={{ color: tier.color }} className="font-semibold">
                {tier.name} tier
              </span>
              <span className="text-slate-500">· {liveScore.toFixed(1)} pts</span>
            </div>
            <PriorityChart severity={r.severity as Severity} people={r.peopleAffected} waitMin={waitMin} />
            <div className="mt-3 space-y-1.5 font-mono text-[12px]">
              <Row k={`Severity base (${sev.name})`} v={`+${SEVERITIES[r.severity as Severity].base.toFixed(1)}`} />
              <Row k={`Waiting ${waitMin.toFixed(1)}m × ${sev.agingPerMin}`} v={`+${(waitMin * sev.agingPerMin).toFixed(1)}`} />
              <Row k={`Crowd bonus (${r.peopleAffected})`} v={`+${crowd.toFixed(1)}`} />
              <div className="border-t border-gold/20 pt-1.5">
                <Row k="Total" v={liveScore.toFixed(1)} strong />
              </div>
            </div>
          </section>

          {/* Response console */}
          <section className="panel p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">Response console</div>
            <h2 className="font-title text-lg font-bold text-slate-100">Rescue Crew Controls</h2>

            {r.status === "pending" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-400">No crew has answered this call yet. Dispatch a rescue crew to claim it.</p>
                <ClaimMenu requestId={r.id} crews={d.crews} big align="left" label="Claim this rescue" onDone={(m, ok) => { toast.show(m, ok); load(); }} />
              </div>
            )}

            {crew && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: `${crew.color}40`, background: `${crew.color}0c` }}>
                <CrewEmblem name={crew.name} color={crew.color} size={44} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-100">{crew.name}</div>
                  <div className="truncate text-xs text-slate-400">Capt. {crew.captain} · {crew.ship}</div>
                  <div className="truncate text-[11px] italic text-slate-500">“{crew.motto}”</div>
                </div>
              </div>
            )}

            {!resolved && r.status !== "pending" && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(["claimed", "en_route", "on_scene"] as StatusKey[]).map((s) => (
                    <button
                      key={s}
                      disabled={busy !== null || r.status === s}
                      onClick={() => act(`s-${s}`, { action: "status", status: s }, `Status → ${STATUSES[s].name}`)}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${r.status === s ? "" : "border-white/10 text-slate-400 hover:border-gold/40 hover:text-slate-100"}`}
                      style={r.status === s ? { borderColor: STATUSES[s].color, color: STATUSES[s].color, background: `${STATUSES[s].color}14` } : undefined}
                    >
                      {busy === `s-${s}` ? <Loader2 size={12} className="mx-auto animate-spin" /> : STATUSES[s].short}
                    </button>
                  ))}
                </div>
                {nx && (
                  <button className="btn-gold w-full" disabled={busy !== null} onClick={() => act("advance", { action: "status", status: nx.to }, `Status → ${STATUSES[nx.to].name}`)}>
                    {busy === "advance" ? <Loader2 size={16} className="animate-spin" /> : nx.icon} {nx.label}
                  </button>
                )}
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3">
                  <label className="mb-1.5 block text-xs font-semibold text-emerald-200">Resolution report</label>
                  <textarea className="field min-h-20 text-sm" placeholder="Survivors safe, injuries treated, hazards cleared…" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} />
                  <button
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2.5 font-bold text-emerald-950 shadow-lg shadow-emerald-900/40 transition hover:brightness-110 disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={async () => {
                      if (await act("resolve", { action: "resolve", note: resolveNote }, "Marked resolved · Safe harbor reached!")) setResolveNote("");
                    }}
                  >
                    {busy === "resolve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Mark as resolved
                  </button>
                </div>
                <button className="btn-ghost w-full text-xs" disabled={busy !== null} onClick={() => act("release", { action: "release" }, "Call released back to the queue")}>
                  <Undo2 size={14} /> Release call back to queue
                </button>
              </div>
            )}

            {resolved && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                <Anchor size={16} /> Resolved {r.resolvedAt ? timeAgo(r.resolvedAt, n) : ""}. Archived in the Captain&apos;s Log.
              </div>
            )}
          </section>

          <section className="panel p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">
              <Navigation size={12} /> Eternal Pose bearing
            </div>
            <GrandLineMap requests={resolved ? [] : [r]} height={220} highlightIsland={r.island} compact />
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={12} /> Last priority sync {timeAgo(r.priorityUpdatedAt, n)}
            </div>
          </section>
        </div>
      </div>
      {toast.node}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-bold text-gold" : "text-slate-400"}`}>
      <span>{k}</span>
      <span className={strong ? "" : "text-slate-200"}>{v}</span>
    </div>
  );
}

/** Priority growth curve with tier threshold lines. */
function PriorityChart({ severity, people, waitMin }: { severity: Severity; people: number; waitMin: number }) {
  const W = 320;
  const H = 120;
  const horizon = Math.max(30, waitMin * 1.35);
  const sev = SEVERITIES[severity];
  const crowd = Math.min(PEOPLE_BONUS_CAP, Math.log2(Math.max(1, people)) * 2.5);
  const at = (m: number) => sev.base + m * sev.agingPerMin + crowd;
  const maxY = Math.max(130, at(horizon) * 1.05);
  const x = (m: number) => (m / horizon) * W;
  const y = (v: number) => H - (v / maxY) * H;
  const path = `M ${x(0)} ${y(at(0))} L ${x(horizon)} ${y(at(horizon))}`;
  const nowX = x(waitMin);
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="mt-4 w-full">
      {PRIORITY_TIERS.slice(1).map((t) => (
        <g key={t.key}>
          <line x1={0} x2={W} y1={y(t.min)} y2={y(t.min)} stroke={t.color} strokeOpacity={0.35} strokeDasharray="3 4" />
          <text x={W - 2} y={y(t.min) - 3} textAnchor="end" fontSize="8" fill={t.color} opacity={0.8}>
            {t.name}
          </text>
        </g>
      ))}
      <path d={`${path} L ${x(horizon)} ${H} L 0 ${H} Z`} fill={sev.color} opacity={0.08} />
      <path d={`M ${x(0)} ${y(at(0))} L ${nowX} ${y(at(waitMin))}`} stroke={sev.color} strokeWidth={2.5} fill="none" />
      <path d={`M ${nowX} ${y(at(waitMin))} L ${x(horizon)} ${y(at(horizon))}`} stroke={sev.color} strokeWidth={1.5} strokeDasharray="4 4" fill="none" opacity={0.6} />
      <line x1={nowX} x2={nowX} y1={0} y2={H} stroke="#f2c14e" strokeOpacity={0.4} />
      <circle cx={nowX} cy={y(at(waitMin))} r={4.5} fill="#f2c14e" stroke="#050b18" strokeWidth={2} />
      <text x={0} y={H + 12} fontSize="8" fill="#64748b">
        0m
      </text>
      <text x={nowX} y={H + 12} fontSize="8" fill="#f2c14e" textAnchor="middle">
        now
      </text>
      <text x={W} y={H + 12} fontSize="8" fill="#64748b" textAnchor="end">
        {Math.round(horizon)}m
      </text>
    </svg>
  );
}
