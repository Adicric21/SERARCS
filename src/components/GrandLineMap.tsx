"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Anchor, Flame, MapPin, ShipWheel } from "lucide-react";
import { HQ, ISLANDS, type IslandKey } from "@/lib/lore";
import type { CrewDTO, RequestDTO } from "@/lib/types";
import { sevInfo, TypeIcon } from "./ui";

export function GrandLineMap({
  requests,
  crews,
  height = 500,
  highlightIsland,
  onPickIsland,
  compact = false,
}: {
  requests: RequestDTO[];
  crews?: CrewDTO[];
  height?: number;
  highlightIsland?: string;
  onPickIsland?: (k: IslandKey) => void;
  compact?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const byIsland = useMemo(() => {
    const m = new Map<string, RequestDTO[]>();
    for (const r of requests) m.set(r.island, [...(m.get(r.island) ?? []), r]);
    return m;
  }, [requests]);
  const deployed = crews?.filter((c) => c.activeCount > 0).length ?? 0;

  return (
    <div className="grand-map relative w-full overflow-hidden rounded-[22px]" style={{ height }}>
      <Image src="/images/theme/grand-line-map.jpg" alt="Pirate treasure map of islands and sea routes" fill priority className="object-cover" sizes="(max-width: 1000px) 100vw, 1200px" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b5260]/10 via-transparent to-[#182b20]/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_0_38%,rgba(38,20,6,.20)_82%)]" />

      {!compact && (
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="map-ribbon"><ShipWheel size={12}/> GRAND LINE</span>
          <span className="map-ribbon map-ribbon-red"><Flame size={12}/> ACE ROUTE</span>
          <span className="map-ribbon map-ribbon-blue"><Anchor size={12}/> {deployed} crews sailing</span>
        </div>
      )}

      <div className="absolute bottom-4 left-4 max-w-xs rounded-xl border border-[#5a3518]/35 bg-[#f0d59b]/92 px-3 py-2 text-[#2b1808] shadow-xl backdrop-blur-sm">
        <div className="font-display text-lg leading-none">Log Pose</div>
        <div className="mt-1 text-[10px] uppercase tracking-[.18em] opacity-70">Distress signals appear on their island</div>
      </div>

      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${HQ.x}%`, top: `${HQ.y}%` }}>
        <div className="map-marker map-marker-hq"><span className="marker-pulse" /> <Anchor size={13}/> HQ · {deployed} crews</div>
      </div>

      {(Object.keys(ISLANDS) as IslandKey[]).map((k) => {
        const isl = ISLANDS[k];
        const list = byIsland.get(k) ?? [];
        const has = list.length > 0;
        const maxSev = has ? Math.max(...list.map((r) => r.severity)) : 0;
        const color = has ? sevInfo(maxSev).color : "#f8e3ae";
        const highlighted = highlightIsland === k;
        const size = has ? 30 + Math.min(18, list.length * 4) : highlighted ? 30 : 22;
        const marker = (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${isl.x}%`, top: `${isl.y}%`, zIndex: hover === k ? 50 : has ? 30 : 20 }}
            onMouseEnter={() => setHover(k)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="relative grid place-items-center" style={{ width: size, height: size }}>
              {(has || highlighted) && <span className="map-sonar" style={{ borderColor: highlighted ? "#f3bf48" : color }} />}
              <span className="island-pin" style={{ borderColor: color, background: has ? `${color}dd` : "rgba(49,29,13,.86)" }}>
                {has ? <span className="font-mono text-[10px] font-black text-[#241507]">{list.length}</span> : <MapPin size={13} />}
              </span>
            </div>
            <div className="island-label">{isl.name}</div>
            {hover === k && has && (
              <div className="map-popover">
                <div className="flex items-center justify-between gap-3 border-b border-[#6d421b]/20 pb-2">
                  <span className="font-display text-lg">{isl.name}</span><span className="text-[10px] uppercase tracking-widest opacity-60">{isl.sea}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {list.slice(0, 4).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-[11px]">
                      <span style={{ color: sevInfo(r.severity).color }}><TypeIcon type={r.emergencyType} size={13}/></span>
                      <span className="min-w-0 flex-1 truncate">{r.title}</span>
                      <span className="font-mono">{r.priorityScore.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        if (onPickIsland) return <button key={k} type="button" onClick={() => onPickIsland(k)} className="contents">{marker}</button>;
        if (list[0]) return <Link key={k} href={`/requests/${list[0].id}`} className="contents">{marker}</Link>;
        return <div key={k}>{marker}</div>;
      })}
    </div>
  );
}
