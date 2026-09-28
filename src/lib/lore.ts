// Shared, client-safe domain constants and the priority ("bounty") engine.

export type Severity = 1 | 2 | 3 | 4 | 5;

export const SEVERITIES: Record<
  Severity,
  { level: Severity; name: string; sea: string; base: number; agingPerMin: number; color: string; blurb: string }
> = {
  1: { level: 1, name: "Ripple", sea: "East Blue", base: 10, agingPerMin: 0.75, color: "#5eead4", blurb: "Minor incident. No immediate danger to life." },
  2: { level: 2, name: "Squall", sea: "Paradise", base: 25, agingPerMin: 1.0, color: "#7dd3fc", blurb: "Injuries or property at risk. Response needed soon." },
  3: { level: 3, name: "Storm", sea: "Grand Line", base: 45, agingPerMin: 1.25, color: "#fbbf24", blurb: "Serious harm likely. Multiple people affected." },
  4: { level: 4, name: "Tempest", sea: "New World", base: 70, agingPerMin: 1.5, color: "#fb923c", blurb: "Life-threatening. Dispatch the nearest crew now." },
  5: { level: 5, name: "Buster Call", sea: "Mary Geoise Alert", base: 100, agingPerMin: 1.75, color: "#f43f5e", blurb: "Mass-casualty catastrophe. All hands on deck." },
};

export const PRIORITY_TIERS = [
  { key: "rookie", name: "Rookie", min: 0, color: "#5eead4", label: "Low" },
  { key: "supernova", name: "Supernova", min: 40, color: "#fbbf24", label: "Elevated" },
  { key: "warlord", name: "Warlord", min: 75, color: "#fb923c", label: "High" },
  { key: "emperor", name: "Emperor", min: 110, color: "#f43f5e", label: "Critical" },
] as const;

export type TierKey = (typeof PRIORITY_TIERS)[number]["key"];

export const PEOPLE_BONUS_CAP = 15;

/**
 * Priority = severity base + waiting minutes × severity aging rate + crowd bonus.
 * Aging guarantees that low-severity calls rise over time and are never starved,
 * while severe calls both start higher and escalate faster.
 */
export function computePriority(input: {
  severity: number;
  peopleAffected: number;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
  now?: Date;
}): number {
  const sev = SEVERITIES[(Math.min(5, Math.max(1, input.severity)) as Severity)];
  const created = new Date(input.createdAt).getTime();
  const end = input.resolvedAt ? new Date(input.resolvedAt).getTime() : (input.now ?? new Date()).getTime();
  const waitingMin = Math.max(0, (end - created) / 60000);
  const crowd = Math.min(PEOPLE_BONUS_CAP, Math.log2(Math.max(1, input.peopleAffected)) * 2.5);
  return Math.round((sev.base + waitingMin * sev.agingPerMin + crowd) * 10) / 10;
}

export function tierFor(score: number) {
  let t: (typeof PRIORITY_TIERS)[number] = PRIORITY_TIERS[0];
  for (const tier of PRIORITY_TIERS) if (score >= tier.min) t = tier;
  return t;
}

export function tierIndex(key: string) {
  return PRIORITY_TIERS.findIndex((t) => t.key === key);
}

/** Bounty presentation: priority points shown as Berries. */
export function formatBounty(score: number) {
  const berries = Math.round(score * 1_000_000);
  return berries.toLocaleString("en-US");
}

export const STATUSES = {
  pending: { key: "pending", name: "Signal Received", short: "SOS", color: "#f43f5e", step: 0 },
  claimed: { key: "claimed", name: "Crew Assigned", short: "Claimed", color: "#fbbf24", step: 1 },
  en_route: { key: "en_route", name: "Setting Sail", short: "En Route", color: "#38bdf8", step: 2 },
  on_scene: { key: "on_scene", name: "Landed On Scene", short: "On Scene", color: "#a78bfa", step: 3 },
  resolved: { key: "resolved", name: "Safe Harbor", short: "Resolved", color: "#34d399", step: 4 },
} as const;

export type StatusKey = keyof typeof STATUSES;
export const STATUS_ORDER: StatusKey[] = ["pending", "claimed", "en_route", "on_scene", "resolved"];
export const ACTIVE_STATUSES: StatusKey[] = ["pending", "claimed", "en_route", "on_scene"];

export const EMERGENCY_TYPES = {
  blizzard: { key: "blizzard", name: "Blizzard & Frostbite", hint: "Drum Island winter storms", icon: "snow" },
  sandstorm: { key: "sandstorm", name: "Sandstorm Rescue", hint: "Alabasta desert whiteouts", icon: "wind" },
  toxic_gas: { key: "toxic_gas", name: "Toxic Gas Hazard", hint: "Punk Hazard shinokuni leaks", icon: "biohazard" },
  aqua_laguna: { key: "aqua_laguna", name: "Aqua Laguna Flood", hint: "Tidal surges & flooding", icon: "waves" },
  sea_king: { key: "sea_king", name: "Sea King Attack", hint: "Calm Belt monster sightings", icon: "fish" },
  shipwreck: { key: "shipwreck", name: "Shipwreck & Capsize", hint: "Vessels in distress", icon: "anchor" },
  fire: { key: "fire", name: "Blaze & Wildfire", hint: "Flame-flame outbreaks", icon: "flame" },
  medical: { key: "medical", name: "Medical Emergency", hint: "Injury, illness, epidemic", icon: "heart" },
  raid: { key: "raid", name: "Raid & Conflict", hint: "Civilians caught in battle", icon: "swords" },
  quake: { key: "quake", name: "Seaquake", hint: "Tremors & collapses", icon: "quake" },
} as const;

export type EmergencyTypeKey = keyof typeof EMERGENCY_TYPES;

export const ISLANDS = {
  loguetown: { key: "loguetown", name: "Loguetown", sea: "East Blue", x: 12, y: 22, climate: "Temperate port" },
  drum: { key: "drum", name: "Drum Island", sea: "Paradise", x: 20, y: 40, climate: "Eternal winter" },
  alabasta: { key: "alabasta", name: "Alabasta", sea: "Paradise", x: 26, y: 58, climate: "Desert kingdom" },
  skypiea: { key: "skypiea", name: "Skypiea", sea: "Sky Island", x: 30, y: 18, climate: "White-white sea" },
  water7: { key: "water7", name: "Water 7", sea: "Paradise", x: 33, y: 47, climate: "Canal city" },
  enies: { key: "enies", name: "Enies Lobby", sea: "Paradise", x: 38, y: 62, climate: "Judicial isle" },
  thriller: { key: "thriller", name: "Thriller Bark", sea: "Florian Triangle", x: 39, y: 33, climate: "Perpetual fog" },
  sabaody: { key: "sabaody", name: "Sabaody Archipelago", sea: "Paradise", x: 44, y: 50, climate: "Mangrove bubbles" },
  fishman: { key: "fishman", name: "Fishman Island", sea: "Deep Sea", x: 48, y: 72, climate: "10,000m below" },
  punk: { key: "punk", name: "Punk Hazard", sea: "New World", x: 57, y: 43, climate: "Fire & ice" },
  dressrosa: { key: "dressrosa", name: "Dressrosa", sea: "New World", x: 63, y: 55, climate: "Mediterranean" },
  zou: { key: "zou", name: "Zou", sea: "New World", x: 70, y: 30, climate: "On an elephant" },
  wholecake: { key: "wholecake", name: "Whole Cake Island", sea: "New World", x: 77, y: 64, climate: "Confectionery" },
  wano: { key: "wano", name: "Wano Country", sea: "New World", x: 84, y: 42, climate: "Isolated nation" },
  egghead: { key: "egghead", name: "Egghead", sea: "New World", x: 90, y: 58, climate: "Future island" },
} as const;

export type IslandKey = keyof typeof ISLANDS;

export const HQ = { name: "Baltigo · Revolutionary HQ", x: 72, y: 84 };

export function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

export function timeAgo(date: Date | string, now = new Date()) {
  const ms = now.getTime() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${Math.max(0, s)}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
