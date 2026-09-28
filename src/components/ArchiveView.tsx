"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Download, Search } from "lucide-react";
import { ISLANDS, SEVERITIES, STATUSES, formatDuration, type Severity, type StatusKey } from "@/lib/lore";
import type { HistoryData } from "@/lib/types";
import { Bounty, SeverityBadge, StatusPill, TypeIcon, sevInfo, typeName } from "./ui";

type Tab = "resolved" | "all" | "log";

function eventColor(kind: string) {
  switch (kind) {
    case "created": return "#c7352b";
    case "claimed": return "#c58b28";
    case "status": return "#2e7f8d";
    case "escalated": return "#d46a2a";
    case "resolved": return "#3d7f51";
    default: return "#7b6548";
  }
}

export function ArchiveView({ data }: { data: HistoryData }) {
  const [tab, setTab] = useState<Tab>("resolved");
  const [q, setQ] = useState("");
  const [sev, setSev] = useState(0);
  const [kind, setKind] = useState("all");

  const resolved = data.requests.filter((r) => r.status === "resolved");
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const islandName = (k: string) => ISLANDS[k as keyof typeof ISLANDS]?.name ?? k;

  const rows = (tab === "resolved" ? resolved : data.requests).filter(
    (r) => (!sev || r.severity === sev) && match(`${r.code} ${r.title} ${islandName(r.island)} ${r.crewName ?? ""} ${typeName(r.emergencyType)}`),
  );
  const events = data.events.filter((e) => (kind === "all" || e.kind === kind) && match(`${e.requestCode} ${e.message} ${e.actor}`));

  const analytics = useMemo(() => {
    const bySev = ([1, 2, 3, 4, 5] as Severity[]).map((l) => {
      const list = resolved.filter((r) => r.severity === l);
      const avg = list.length ? list.reduce((a, r) => a + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()), 0) / list.length : 0;
      return { l, count: list.length, avg };
    });
    const byIsland = new Map<string, number>();
    for (const r of data.requests) byIsland.set(r.island, (byIsland.get(r.island) ?? 0) + 1);
    const islands = [...byIsland.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const lives = resolved.reduce((a, r) => a + r.peopleAffected, 0);
    const avgAll = resolved.length ? resolved.reduce((a, r) => a + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()), 0) / resolved.length : 0;
    return { bySev, islands, lives, avgAll };
  }, [data.requests, resolved]);

  const maxSevAvg = Math.max(1, ...analytics.bySev.map((s) => s.avg));
  const maxIsl = Math.max(1, ...analytics.islands.map((i) => i[1]));

  const exportCsv = () => {
    const header = ["code", "title", "type", "island", "severity", "status", "crew", "people", "created_at", "claimed_at", "resolved_at", "priority"];
    const lines = data.requests.map((r) =>
      [r.code, r.title, r.emergencyType, islandName(r.island), r.severity, r.status, r.crewName ?? "", r.peopleAffected, r.createdAt, r.claimedAt ?? "", r.resolvedAt ?? "", r.priorityScore]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "captains-log.csv";
    a.click();
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">Request history · Poneglyph-grade records</div>
          <h1 className="font-display text-5xl leading-none gold-text">Captain&apos;s Log</h1>
          <p className="mt-2 text-sm text-slate-400">Every distress call, every claim, every status change, and every rescue is permanently inscribed here.</p>
        </div>
        <button className="btn-ghost" onClick={exportCsv}>
          <Download size={15} /> Export CSV
        </button>
      </header>

      {/* analytics */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-1">
          <div className="panel p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Rescues completed</div>
            <div className="font-mono text-4xl font-bold text-emerald-300">{resolved.length}</div>
            <div className="text-xs text-slate-500">of {data.requests.length} total calls</div>
          </div>
          <div className="panel p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Lives brought to safe harbor</div>
            <div className="font-mono text-4xl font-bold text-gold">{analytics.lives}</div>
            <div className="text-xs text-slate-500">avg rescue {formatDuration(analytics.avgAll)}</div>
          </div>
        </div>
        <div className="panel p-5 lg:col-span-5">
          <h3 className="mb-4 font-title text-sm font-bold text-slate-100">Average time to safe harbor · by severity</h3>
          <div className="space-y-3">
            {analytics.bySev.map((s) => (
              <div key={s.l} className="flex items-center gap-3">
                <span className="w-24 text-[11px] font-bold uppercase" style={{ color: SEVERITIES[s.l].color }}>
                  {SEVERITIES[s.l].name}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(s.avg / maxSevAvg) * 100}%`, background: SEVERITIES[s.l].color }} />
                </div>
                <span className="w-24 text-right font-mono text-[11px] text-slate-400">{s.count ? formatDuration(s.avg) : "—"}</span>
                <span className="w-8 text-right font-mono text-[11px] text-slate-600">×{s.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5 lg:col-span-4">
          <h3 className="mb-4 font-title text-sm font-bold text-slate-100">Busiest islands</h3>
          <div className="space-y-2.5">
            {analytics.islands.map(([k, c]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-32 truncate text-[12px] text-slate-300">{islandName(k)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-gold" style={{ width: `${(c / maxIsl) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-[11px] text-slate-400">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-gold/15 bg-black/30 p-1">
            {(
              [
                ["resolved", `Resolved · ${resolved.length}`],
                ["all", `All requests · ${data.requests.length}`],
                ["log", `Event log · ${data.events.length}`],
              ] as [Tab, string][]
            ).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === k ? "bg-gold text-[#1b1206]" : "text-slate-400 hover:text-slate-100"}`}>
                {l}
              </button>
            ))}
          </div>
          {tab !== "log" ? (
            <select className="field !w-auto !py-2 text-xs" value={sev} onChange={(e) => setSev(Number(e.target.value))}>
              <option value={0} className="bg-[#050b18]">
                All severities
              </option>
              {([5, 4, 3, 2, 1] as Severity[]).map((l) => (
                <option key={l} value={l} className="bg-[#050b18]">
                  {SEVERITIES[l].name}
                </option>
              ))}
            </select>
          ) : (
            <select className="field !w-auto !py-2 text-xs" value={kind} onChange={(e) => setKind(e.target.value)}>
              {["all", "created", "claimed", "status", "escalated", "note", "released", "resolved"].map((k) => (
                <option key={k} value={k} className="bg-[#050b18]">
                  {k === "all" ? "All event types" : k}
                </option>
              ))}
            </select>
          )}
          <div className="relative ml-auto w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="field !py-2 !pl-9 text-sm" placeholder="Search the log…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {tab !== "log" ? (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[980px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gold/15 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <th className="py-2.5 pr-3">Call</th>
                  <th className="pr-3">Island</th>
                  <th className="pr-3">Severity</th>
                  <th className="pr-3">Status</th>
                  <th className="pr-3">Crew</th>
                  <th className="pr-3">To claim</th>
                  <th className="pr-3">{tab === "resolved" ? "To resolve" : "Age"}</th>
                  <th className="pr-3 text-right">Bounty</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const end = r.resolvedAt ? new Date(r.resolvedAt).getTime() : Date.now();
                  return (
                    <tr key={r.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                      <td className="py-3 pr-3">
                        <Link href={`/requests/${r.id}`} className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color: sevInfo(r.severity).color, background: `${sevInfo(r.severity).color}14` }}>
                            <TypeIcon type={r.emergencyType} size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-mono text-[11px] text-gold/80">{r.code}</span>
                            <span className="block max-w-[280px] truncate font-semibold text-slate-100 hover:underline">{r.title}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="pr-3 text-slate-300">{islandName(r.island)}</td>
                      <td className="pr-3">
                        <SeverityBadge severity={r.severity} />
                      </td>
                      <td className="pr-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="pr-3">
                        <span style={{ color: r.crewColor ?? undefined }} className="text-[12px]">
                          {r.crewName ?? "—"}
                        </span>
                      </td>
                      <td className="pr-3 font-mono text-[12px] text-slate-400">{r.claimedAt ? formatDuration(new Date(r.claimedAt).getTime() - new Date(r.createdAt).getTime()) : "—"}</td>
                      <td className="pr-3 font-mono text-[12px] text-slate-400" suppressHydrationWarning>{formatDuration(end - new Date(r.createdAt).getTime())}</td>
                      <td className="pr-3 text-right text-[12px] text-slate-300">
                        <Bounty score={r.priorityScore} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <div className="p-10 text-center text-slate-500">No entries match.</div>}
          </div>
        ) : (
          <ol className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
                <span className="mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: eventColor(e.kind), background: `${eventColor(e.kind)}14` }}>
                  {e.kind}
                </span>
                <Link href={`/requests/${e.requestId}`} className="font-mono text-[12px] text-gold/80 hover:underline">
                  {e.requestCode}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-slate-200">{e.message}</div>
                  <div className="text-[11px] text-slate-500">
                    {e.actor}
                    {e.fromStatus && e.toStatus ? ` · ${STATUSES[e.fromStatus as StatusKey]?.short ?? e.fromStatus} → ${STATUSES[e.toStatus as StatusKey]?.short ?? e.toStatus}` : ""}
                  </div>
                </div>
                <span className="text-[11px] text-slate-500">{new Date(e.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
              </li>
            ))}
            {events.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-10 text-slate-500">
                <BookOpen size={20} /> No log entries match.
              </div>
            )}
          </ol>
        )}
      </section>
    </div>
  );
}
