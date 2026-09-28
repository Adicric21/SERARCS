import { pool } from "@/db";
import { computePriority, tierFor } from "@/lib/lore";

const g = globalThis as typeof globalThis & { __sosBootstrap?: Promise<void> };

const DDL = `
CREATE TABLE IF NOT EXISTS crews (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  captain text NOT NULL,
  ship text NOT NULL,
  specialty text NOT NULL,
  color text NOT NULL,
  motto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS emergency_requests (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  emergency_type text NOT NULL,
  island text NOT NULL,
  location_detail text NOT NULL DEFAULT '',
  severity integer NOT NULL,
  description text NOT NULL DEFAULT '',
  caller_name text NOT NULL DEFAULT 'Anonymous',
  people_affected integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  crew_id integer REFERENCES crews(id),
  priority_score real NOT NULL DEFAULT 0,
  priority_tier text NOT NULL DEFAULT 'rookie',
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  priority_updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS request_events (
  id serial PRIMARY KEY,
  request_id integer NOT NULL REFERENCES emergency_requests(id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  actor text NOT NULL DEFAULT 'Den Den Mushi Dispatch',
  from_status text,
  to_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

const CREWS = [
  ["chopper", "Chopper's Medical Rescue Armada", "Tony Tony Chopper", "Thousand Sunny · Mini Merry", "Field triage & frostbite care", "#f472b6", "A doctor can cure any disease!"],
  ["sabo", "Revolutionary Army · Flame Unit", "Sabo", "Revolutionary Flagship", "Fire suppression & mass evacuation", "#f97316", "Freedom is worth fighting for."],
  ["heart", "Heart Pirates Surgical Sub", "Trafalgar D. Water Law", "Polar Tang", "Surgical ops & underwater rescue", "#facc15", "Room. Shambles. Saved."],
  ["franky", "Franky Shipwright Corps", "Franky", "Galley-La Salvage Barge", "Shipwreck salvage & structural collapse", "#38bdf8", "SUUUPER rescue incoming!"],
  ["koala", "Koala's Fishman Karate Relief", "Koala", "Revolutionary Cutter Nami-Kiri", "Sea rescue & Sea King deterrence", "#2dd4bf", "Water is our ally."],
  ["marco", "Phoenix Aerial Medics", "Marco", "Sphinx Island Skiff", "Aerial evacuation & regeneration care", "#60a5fa", "Blue flames heal, yoi."],
  ["ivankov", "Newkama Hormone Squad", "Emporio Ivankov", "Newkama Galleon", "Toxin treatment & morale recovery", "#c084fc", "Hee-haw! Miracles on demand!"],
  ["kureha", "Drum Castle Clinic Sledders", "Dr. Kureha", "Ropeway Sled Convoy", "Cold-climate medicine & epidemics", "#e2e8f0", "Want to know the secret of youth?"],
] as const;

// [title, type, island, detail, severity, desc, caller, people, minutesAgo, status, crewSlug|null, resolvedMinutesAgo|null, note]
type SeedReq = [string, string, string, string, number, string, string, number, number, string, string | null, number | null, string | null];

const REQUESTS: SeedReq[] = [
  ["Village buried by avalanche", "blizzard", "drum", "Bighorn village, east slope", 5, "Avalanche swept through Bighorn. Dozens trapped under snow. Temperatures at -40°C.", "Dalton (Drum Guard)", 48, 34, "pending", null, null, null],
  ["Caravan lost in sandstorm", "sandstorm", "alabasta", "Sandora Desert, 20km from Yuba", 4, "Trade caravan with children missing since dawn. Water supplies exhausted.", "Toto (Yuba oasis)", 17, 52, "claimed", "koala", null, null],
  ["Shinokuni gas leak near lab", "toxic_gas", "punk", "Burning half, Building R-66", 5, "Lethal gas cloud drifting toward the lake shelter. Civilians collapsing.", "G-5 Marine deserter", 30, 12, "en_route", "ivankov", null, null],
  ["Aqua Laguna surge floods Shift Station", "aqua_laguna", "water7", "Back Street, lower docks", 3, "Tidal wave flooding lower canals. Families stranded on rooftops.", "Kokoro", 22, 41, "pending", null, null, null],
  ["Sea King capsized ferry", "sea_king", "sabaody", "Grove 44 coastline", 4, "Sea King rammed a bubble ferry. Passengers in the water.", "Shakky's Rip-off Bar", 12, 8, "pending", null, null, null],
  ["Frostbite cases at ropeway station", "medical", "drum", "Drum Rockies ropeway base", 2, "Several climbers with frostbite and hypothermia.", "Wapol's ex-guard", 5, 95, "pending", null, null, null],
  ["Market blaze spreading", "fire", "dressrosa", "Acacia port market", 3, "Fire spreading through the wooden market stalls.", "Rebecca", 9, 26, "on_scene", "sabo", null, null],
  ["Tremors collapsing tunnels", "quake", "wano", "Flower Capital outskirts, mines", 3, "Seaquake tremors collapsed mining tunnels. Miners trapped.", "Kin'emon", 14, 18, "pending", null, null, null],
  ["Fever outbreak in fishing village", "medical", "loguetown", "Harbor district", 1, "Mild fever spreading among fishermen, requesting supplies.", "Harbor master", 6, 70, "pending", null, null, null],
  ["Clouds giving way over Angel Beach", "shipwreck", "skypiea", "Angel Beach, Upper Yard", 2, "Waver boats stranded after cloud collapse.", "Conis", 4, 180, "resolved", "marco", 120, "All wavers airlifted to safety by blue-flame flights."],
  ["Blizzard traps royal sled", "blizzard", "drum", "Drum Castle road", 4, "Sled convoy lost in whiteout.", "Dr. Kureha", 7, 300, "resolved", "kureha", 220, "Convoy found and warmed at Drum Castle. No casualties."],
  ["Sandstorm swallows Rainbase", "sandstorm", "alabasta", "Rainbase casino district", 3, "Visibility zero, people trapped in buildings.", "Vivi's royal guard", 25, 420, "resolved", "koala", 330, "Evacuated 25 civilians to Alubarna shelter."],
  ["Gas exposure at Caesar's old lab", "toxic_gas", "punk", "Frozen half, Lab B", 4, "Children showing symptoms of gas exposure.", "Smoker's unit", 11, 600, "resolved", "chopper", 480, "Antidote administered; all children stable."],
  ["Galleon hull breach", "shipwreck", "water7", "Dock 1", 2, "Galleon taking water at dock.", "Paulie", 3, 260, "resolved", "franky", 200, "Hull patched with Adam wood. SUPER!"],
];

async function seed() {
  const { rows } = await pool.query<{ c: string }>("SELECT count(*)::text AS c FROM crews");
  if (Number(rows[0].c) > 0) return;

  const crewIds: Record<string, number> = {};
  for (const c of CREWS) {
    const r = await pool.query<{ id: number }>(
      "INSERT INTO crews (slug,name,captain,ship,specialty,color,motto) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id",
      [...c],
    );
    crewIds[c[0]] = r.rows[0].id;
  }
  const crewName = (slug: string) => CREWS.find((c) => c[0] === slug)?.[1] ?? slug;

  const now = Date.now();
  let n = 1;
  for (const r of REQUESTS) {
    const [title, type, island, detail, sev, desc, caller, people, minsAgo, status, crewSlug, resolvedAgo, note] = r;
    const createdAt = new Date(now - minsAgo * 60000);
    const resolvedAt = resolvedAgo != null ? new Date(now - resolvedAgo * 60000) : null;
    const claimedAt = crewSlug ? new Date(createdAt.getTime() + Math.min(minsAgo * 0.35, 25) * 60000) : null;
    const score = computePriority({ severity: sev, peopleAffected: people, createdAt, resolvedAt });
    const tier = tierFor(score).key;
    const code = `SOS-${String(n++).padStart(4, "0")}`;
    const ins = await pool.query<{ id: number }>(
      `INSERT INTO emergency_requests (code,title,emergency_type,island,location_detail,severity,description,caller_name,people_affected,status,crew_id,priority_score,priority_tier,resolution_note,created_at,claimed_at,resolved_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now()) RETURNING id`,
      [code, title, type, island, detail, sev, desc, caller, people, status, crewSlug ? crewIds[crewSlug] : null, score, tier, note, createdAt, claimedAt, resolvedAt],
    );
    const id = ins.rows[0].id;
    const ev = (kind: string, message: string, actor: string, at: Date, from: string | null, to: string | null) =>
      pool.query("INSERT INTO request_events (request_id,kind,message,actor,from_status,to_status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id, kind, message, actor, from, to, at]);

    await ev("created", `Distress signal received from ${caller}.`, "Den Den Mushi Dispatch", createdAt, null, "pending");
    if (crewSlug && claimedAt) {
      await ev("claimed", `${crewName(crewSlug)} claimed the rescue.`, crewName(crewSlug), claimedAt, "pending", "claimed");
      const order = ["claimed", "en_route", "on_scene", "resolved"];
      const target = order.indexOf(status);
      const endT = resolvedAt ? resolvedAt.getTime() : now - 60000;
      for (let i = 1; i <= target; i++) {
        const at = new Date(claimedAt.getTime() + ((endT - claimedAt.getTime()) * i) / (target + 0.001));
        if (order[i] === "resolved") {
          await ev("resolved", note ?? "Rescue complete.", crewName(crewSlug), resolvedAt ?? at, order[i - 1], "resolved");
        } else {
          await ev("status", `Status changed to ${order[i].replace("_", " ")}.`, crewName(crewSlug), at, order[i - 1], order[i]);
        }
      }
    }
  }
}

export function ensureBootstrap(): Promise<void> {
  if (!g.__sosBootstrap) {
    g.__sosBootstrap = (async () => {
      await pool.query(DDL);
      await seed();
    })().catch((e) => {
      g.__sosBootstrap = undefined;
      throw e;
    });
  }
  return g.__sosBootstrap;
}
