"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Anchor, ArrowRight, BellRing, RefreshCw, Search, ShipWheel, Waves } from "lucide-react";
import { ISLANDS, SEVERITIES, computePriority, tierFor, timeAgo, type Severity } from "@/lib/lore";
import type { DashboardData, RequestDTO } from "@/lib/types";
import { useNow } from "./useNow";
import { useToast } from "./Toast";
import { ClaimMenu } from "./ClaimMenu";
import { GrandLineMap } from "./GrandLineMap";
import { DenDenMushi } from "./DenDenMushi";
import { SectionTitle, SeverityBadge, StatusPill, TierBadge, TypeIcon, sevInfo, typeName } from "./ui";

type Filter = "all" | "pending" | "progress";

export function CommandDeck({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [sevFilter, setSevFilter] = useState(0);
  const [q, setQ] = useState("");
  const [syncing, setSyncing] = useState(false);
  const now = useNow(1000);
  const router = useRouter();
  const toast = useToast();
  const prevRanks = useRef<Map<number, number>>(new Map());
  const [rankDelta, setRankDelta] = useState<Map<number, number>>(new Map());

  const load = useCallback(async () => {
    setSyncing(true);
    try { const res = await fetch("/api/dashboard", { cache: "no-store" }); if (res.ok) setData(await res.json()); }
    finally { setSyncing(false); }
  }, []);
  useEffect(() => { const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const live = useMemo(() => {
    const n = now ?? new Date(data.generatedAt);
    return data.active.map((r) => ({ ...r, liveScore: computePriority({ severity: r.severity, peopleAffected: r.peopleAffected, createdAt: r.createdAt, now: n }) })).sort((a,b)=>b.liveScore-a.liveScore || +new Date(a.createdAt)-+new Date(b.createdAt));
  }, [data, now]);

  useEffect(() => { const next = new Map<number, number>(); const delta = new Map<number, number>(); live.forEach((r,i)=>{next.set(r.id,i+1); const p=prevRanks.current.get(r.id); if(p && p!==i+1) delta.set(r.id,p-(i+1));}); if(delta.size) setRankDelta(delta); prevRanks.current=next; }, [live]);

  const filtered = live.filter((r) => {
    if(filter === "pending" && r.status !== "pending") return false;
    if(filter === "progress" && r.status === "pending") return false;
    if(sevFilter && r.severity !== sevFilter) return false;
    if(q) { const text = `${r.title} ${r.code} ${ISLANDS[r.island as keyof typeof ISLANDS]?.name ?? ""} ${r.locationDetail} ${typeName(r.emergencyType)}`.toLowerCase(); if(!text.includes(q.toLowerCase())) return false; }
    return true;
  });
  const topCall = live.find(r => r.status === "pending");
  const s = data.stats;

  return <div className="space-y-5">
    <section className="ship-hero overflow-hidden rounded-[26px]">
      <Image src="/images/theme/ship-at-sea.jpg" alt="Pirate ship sailing the Grand Line" fill priority className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#130b04]/95 via-[#1c1309]/75 to-transparent" />
      <div className="relative grid min-h-[360px] items-end gap-6 p-6 md:p-9 lg:grid-cols-[1.2fr_.8fr]">
        <div className="max-w-2xl">
          <div className="paper-kicker text-[#ffe9b1]">GRAND LINE · EMERGENCY DISPATCH</div>
          <h1 className="mt-2 font-display text-5xl leading-[.9] text-[#fff0c9] md:text-7xl">Rescue the Sea.<br/><span className="text-[#efbd43]">Answer the SOS.</span></h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#fff4dc]/85">A compact emergency command board inspired by pirate navigation charts. Distress calls rise by severity and waiting time so rescue crews know where to sail.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/sos" className="btn-pirate"><BellRing size={15}/> Transmit SOS</Link>
            {topCall && <Link href={`/requests/${topCall.id}`} className="btn-paper"><ArrowRight size={14}/> Answer {topCall.code}</Link>}
            <button onClick={load} className="btn-glass"><RefreshCw size={14} className={syncing?"animate-spin":""}/> Sync Log Pose</button>
          </div>
        </div>
        <DenDenMushi unanswered={s.unclaimed}/>
      </div>
    </section>

    <section className="paper-card overflow-hidden p-2 md:p-3">
      <div className="mb-2 flex items-center justify-between gap-3 px-2 pt-1"><SectionTitle kicker="LOG POSE · ISLAND CHART" title="Grand Line Rescue Map" right={<span className="inline-flex items-center gap-1 text-xs text-[#69461e]"><Waves size={13}/> {s.active} active signals</span>}/></div>
      <GrandLineMap requests={live as RequestDTO[]} crews={data.crews} height={520}/>
    </section>

    <section className="paper-card p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SectionTitle kicker="DISTRESS BOARD · LIVE PRIORITY" title="SOS Queue" right={<span className="text-[11px] text-[#79562b]">updated {timeAgo(data.generatedAt, now ?? new Date(data.generatedAt))}</span>}/>
        <div className="lg:ml-auto flex flex-wrap gap-2">{([ ["all",`All · ${live.length}`],["pending",`Unanswered · ${live.filter(r=>r.status==="pending").length}`],["progress",`At sea · ${live.filter(r=>r.status!=="pending").length}`] ] as [Filter,string][]).map(([k,label])=><button key={k} onClick={()=>setFilter(k)} className={`paper-filter ${filter===k?"paper-filter-active":""}`}>{label}</button>)}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[0,5,4,3,2,1].map(lv=><button key={lv} onClick={()=>setSevFilter(lv)} className={`paper-filter ${sevFilter===lv?"paper-filter-active":""}`} style={lv&&sevFilter===lv?{color:SEVERITIES[lv as Severity].color,borderColor:SEVERITIES[lv as Severity].color}:undefined}>{lv===0?"Any severity":SEVERITIES[lv as Severity].name}</button>)}
        <div className="relative ml-auto w-full sm:w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d6b3e]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search island, SOS or emergency…" className="paper-field !pl-9"/></div>
      </div>
      <div className="mt-4 space-y-2">{filtered.length===0 && <div className="paper-empty">Calm seas. No distress calls match this filter.</div>}{filtered.map(r=><QueueRow key={r.id} r={r} rank={live.findIndex(x=>x.id===r.id)+1} delta={rankDelta.get(r.id)} onOpen={()=>router.push(`/requests/${r.id}`)} claim={r.status==="pending"?<ClaimMenu requestId={r.id} crews={data.crews} onDone={(msg,ok)=>{toast.show(msg,ok);load();}}/>:null}/>)}</div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
      <div className="paper-card p-4"><SectionTitle kicker="RESCUE ARMADA" title="Ships at sea" right={<Link href="/crews" className="paper-link">Fleet →</Link>}/><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.crews.map(c=><div key={c.id} className="crew-paper-row"><span className="crew-dot" style={{background:c.color}}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{c.name}</div><div className="truncate text-[11px] opacity-70">{c.activeCodes.length?`Mission: ${c.activeCodes.join(", ")}`:c.ship}</div></div><span className="paper-status">{c.activeCount?"AT SEA":"DOCKED"}</span></div>)}</div></div>
      <div className="paper-card p-4"><SectionTitle kicker="TRANS-PONDER RELAY" title="Latest signals" right={<Link href="/archive" className="paper-link">Log →</Link>}/><div className="mt-3 space-y-2">{data.events.slice(0,6).map(e=><Link href={`/requests/${e.requestId}`} key={e.id} className="signal-paper-row"><span className="signal-dot" style={{background:eventColor(e.kind)}}/><div className="min-w-0 flex-1"><div className="flex gap-2 text-[10px] opacity-65"><span className="font-mono font-bold">{e.requestCode}</span><span>{e.kind}</span><span className="ml-auto">{timeAgo(e.createdAt,now??new Date())}</span></div><div className="truncate text-xs font-semibold">{e.message}</div></div></Link>)}</div></div>
    </section>
    {toast.node}
  </div>;
}

function QueueRow({r,rank,delta,onOpen,claim}:{r:RequestDTO & {liveScore:number};rank:number;delta?:number;onOpen:()=>void;claim:React.ReactNode}){
  const sev=sevInfo(r.severity); const tier=tierFor(r.liveScore); const island=ISLANDS[r.island as keyof typeof ISLANDS];
  return <div role="link" tabIndex={0} onClick={onOpen} onKeyDown={e=>e.key==="Enter"&&onOpen()} className={`queue-paper-row ${tier.key==="emperor"&&r.status==="pending"?"queue-critical":""}`}>
    <div className="queue-rank">#{rank}</div>
    <div className="queue-icon" style={{color:sev.color,borderColor:sev.color}}><TypeIcon type={r.emergencyType} size={17}/></div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-black opacity-60">{r.code}</span><span className="queue-title">{r.title}</span></div><div className="mt-1 flex flex-wrap gap-3 text-[11px] opacity-65"><span><Anchor size={10} className="mr-1 inline"/>{island?.name}</span><span>{r.locationDetail}</span></div></div>
    <SeverityBadge severity={r.severity}/><TierBadge score={r.liveScore}/><div onClick={e=>e.stopPropagation()}>{claim}</div>
    {delta!==undefined&&delta!==0&&<span className={`queue-delta ${delta>0?"up":"down"}`}>{delta>0?"▲":"▼"}{Math.abs(delta)}</span>}
  </div>;
}

export function eventColor(kind:string){switch(kind){case"created":return"#c7352b";case"claimed":return"#c58b28";case"status":return"#2e7f8d";case"escalated":return"#d46a2a";case"resolved":return"#3d7f51";default:return"#7b6548";}}
