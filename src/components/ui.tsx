import {
  Activity,
  Anchor,
  Biohazard,
  Fish,
  Flame,
  HeartPulse,
  Snowflake,
  Swords,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { EMERGENCY_TYPES, SEVERITIES, STATUSES, formatBounty, tierFor, type Severity, type StatusKey } from "@/lib/lore";

const ICONS: Record<string, LucideIcon> = {
  snow: Snowflake,
  wind: Wind,
  biohazard: Biohazard,
  waves: Waves,
  fish: Fish,
  anchor: Anchor,
  flame: Flame,
  heart: HeartPulse,
  swords: Swords,
  quake: Activity,
};

export function TypeIcon({ type, size = 18, className }: { type: string; size?: number; className?: string }) {
  const t = EMERGENCY_TYPES[type as keyof typeof EMERGENCY_TYPES];
  const Icon = ICONS[t?.icon ?? "heart"] ?? HeartPulse;
  return <Icon size={size} className={className} />;
}

export function typeName(type: string) {
  return EMERGENCY_TYPES[type as keyof typeof EMERGENCY_TYPES]?.name ?? type;
}

export function sevInfo(sev: number) {
  return SEVERITIES[(Math.min(5, Math.max(1, sev)) as Severity)];
}

export function SeverityPips({ severity, size = "md" }: { severity: number; size?: "sm" | "md" }) {
  const s = sevInfo(severity);
  const w = size === "sm" ? "w-1.5 h-3" : "w-2 h-4";
  return (
    <span className="inline-flex items-end gap-[3px]" title={`Severity ${s.level} · ${s.name}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`${w} rounded-[2px]`}
          style={{
            height: size === "sm" ? 5 + i * 2 : 6 + i * 3,
            background: i <= s.level ? s.color : "rgba(255,255,255,0.08)",
            boxShadow: i <= s.level ? `0 0 8px -2px ${s.color}` : undefined,
          }}
        />
      ))}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: number }) {
  const s = sevInfo(severity);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
      style={{ borderColor: `${s.color}55`, color: s.color, background: `${s.color}12` }}
    >
      <SeverityPips severity={severity} size="sm" />
      {s.name}
    </span>
  );
}

export function StatusPill({ status }: { status: StatusKey | string }) {
  const s = STATUSES[status as StatusKey] ?? STATUSES.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
      style={{ borderColor: `${s.color}50`, color: s.color, background: `${s.color}14` }}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status !== "resolved" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: s.color }} />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      </span>
      {s.short}
    </span>
  );
}

export function TierBadge({ score }: { score: number }) {
  const t = tierFor(score);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-title text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ color: t.color, background: `${t.color}18`, border: `1px solid ${t.color}40` }}
    >
      {t.name}
    </span>
  );
}

export function Bounty({ score, className = "" }: { score: number; className?: string }) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      <span className="mr-0.5 opacity-70">฿</span>
      {formatBounty(score)}
    </span>
  );
}

export function CrewEmblem({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initials = name
    .replace(/[^A-Za-z ]/g, " ")
    .split(" ")
    .filter((w) => w.length > 2 && !["the", "and"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full font-title font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        color,
        background: `radial-gradient(circle at 30% 30%, ${color}33, #050b18 70%)`,
        border: `1.5px solid ${color}90`,
        boxShadow: `0 0 18px -6px ${color}`,
      }}
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
        <circle cx="20" cy="20" r="17" fill="none" stroke={color} strokeDasharray="2 3" strokeWidth="1" />
      </svg>
      {initials}
    </span>
  );
}

export function SectionTitle({ kicker, title, right }: { kicker?: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {kicker && <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/70">{kicker}</div>}
        <h2 className="font-title text-lg font-bold tracking-wide text-slate-100">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "#f2c14e",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className="panel group overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <span className="grid h-8 w-8 place-items-center rounded-lg border" style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}>
          {icon}
        </span>
      </div>
      <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
