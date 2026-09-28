import { db } from "@/db";
import { crews, emergencyRequests, requestEvents, type Crew, type EmergencyRequest, type RequestEvent } from "@/db/schema";
import {
  ACTIVE_STATUSES,
  EMERGENCY_TYPES,
  ISLANDS,
  PRIORITY_TIERS,
  STATUSES,
  computePriority,
  tierFor,
  tierIndex,
  type StatusKey,
} from "@/lib/lore";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { ensureBootstrap } from "./bootstrap";
import type { CrewDTO, DashboardData, EventDTO, HistoryData, RequestDTO, RequestDetail } from "@/lib/types";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toRequestDTO(r: EmergencyRequest, crewMap: Map<number, Crew>): RequestDTO {
  const crew = r.crewId ? crewMap.get(r.crewId) : undefined;
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    emergencyType: r.emergencyType,
    island: r.island,
    locationDetail: r.locationDetail,
    severity: r.severity,
    description: r.description,
    callerName: r.callerName,
    peopleAffected: r.peopleAffected,
    status: r.status as StatusKey,
    crewId: r.crewId,
    crewName: crew?.name ?? null,
    crewColor: crew?.color ?? null,
    priorityScore: r.priorityScore,
    priorityTier: r.priorityTier,
    resolutionNote: r.resolutionNote,
    createdAt: r.createdAt.toISOString(),
    claimedAt: iso(r.claimedAt),
    resolvedAt: iso(r.resolvedAt),
    updatedAt: r.updatedAt.toISOString(),
    priorityUpdatedAt: r.priorityUpdatedAt.toISOString(),
  };
}

function toEventDTO(e: RequestEvent, req?: { code: string; title: string; severity: number }): EventDTO {
  return {
    id: e.id,
    requestId: e.requestId,
    kind: e.kind,
    message: e.message,
    actor: e.actor,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    createdAt: e.createdAt.toISOString(),
    requestCode: req?.code,
    requestTitle: req?.title,
    requestSeverity: req?.severity,
  };
}

async function crewMap() {
  const all = await db.select().from(crews).orderBy(crews.id);
  return { all, map: new Map(all.map((c) => [c.id, c])) };
}

/**
 * Backend priority engine: recomputes every active request's score from
 * severity + waiting time, persists it, and logs escalations when a
 * request crosses into a higher bounty tier.
 */
export async function refreshPriorities() {
  await ensureBootstrap();
  const now = new Date();
  const active = await db.select().from(emergencyRequests).where(inArray(emergencyRequests.status, ACTIVE_STATUSES));
  for (const r of active) {
    const score = computePriority({ severity: r.severity, peopleAffected: r.peopleAffected, createdAt: r.createdAt, now });
    const tier = tierFor(score);
    const escalated = tierIndex(tier.key) > tierIndex(r.priorityTier);
    if (score !== r.priorityScore || tier.key !== r.priorityTier) {
      await db
        .update(emergencyRequests)
        .set({ priorityScore: score, priorityTier: tier.key, priorityUpdatedAt: now })
        .where(eq(emergencyRequests.id, r.id));
    }
    if (escalated) {
      await db.insert(requestEvents).values({
        requestId: r.id,
        kind: "escalated",
        message: `Waiting time pushed priority to ${tier.name} tier (${score.toFixed(1)} pts).`,
        actor: "Haki Priority Engine · Log Pose",
      });
    }
  }
}

export async function getDashboard(): Promise<DashboardData> {
  await refreshPriorities();
  const { all: crewRows, map } = await crewMap();

  const activeRows = await db
    .select()
    .from(emergencyRequests)
    .where(inArray(emergencyRequests.status, ACTIVE_STATUSES))
    .orderBy(desc(emergencyRequests.priorityScore), emergencyRequests.createdAt);

  const resolvedRows = await db
    .select()
    .from(emergencyRequests)
    .where(eq(emergencyRequests.status, "resolved"))
    .orderBy(desc(emergencyRequests.resolvedAt))
    .limit(12);

  const eventRows = await db
    .select({ e: requestEvents, code: emergencyRequests.code, title: emergencyRequests.title, severity: emergencyRequests.severity })
    .from(requestEvents)
    .innerJoin(emergencyRequests, eq(requestEvents.requestId, emergencyRequests.id))
    .orderBy(desc(requestEvents.createdAt), desc(requestEvents.id))
    .limit(30);

  const statRows = await db.execute<{
    resolved_total: string;
    resolved_24h: string;
    avg_resolve_min: string | null;
    avg_claim_min: string | null;
  }>(sql`
    SELECT
      count(*) FILTER (WHERE status='resolved')::text AS resolved_total,
      count(*) FILTER (WHERE status='resolved' AND resolved_at > now() - interval '24 hours')::text AS resolved_24h,
      avg(extract(epoch FROM (resolved_at - created_at))/60) FILTER (WHERE status='resolved')::text AS avg_resolve_min,
      avg(extract(epoch FROM (claimed_at - created_at))/60) FILTER (WHERE claimed_at IS NOT NULL)::text AS avg_claim_min
    FROM emergency_requests`);
  const s = statRows.rows[0];

  const crewDTOs = await buildCrewDTOs(crewRows);
  const active = activeRows.map((r) => toRequestDTO(r, map));

  return {
    generatedAt: new Date().toISOString(),
    active,
    resolved: resolvedRows.map((r) => toRequestDTO(r, map)),
    crews: crewDTOs,
    events: eventRows.map((row) => toEventDTO(row.e, row)),
    stats: {
      active: active.length,
      unclaimed: active.filter((r) => r.status === "pending").length,
      critical: active.filter((r) => r.priorityTier === "emperor" || r.severity >= 5).length,
      resolvedTotal: Number(s?.resolved_total ?? 0),
      resolved24h: Number(s?.resolved_24h ?? 0),
      avgResolveMin: s?.avg_resolve_min ? Number(s.avg_resolve_min) : null,
      avgClaimMin: s?.avg_claim_min ? Number(s.avg_claim_min) : null,
      crewsAvailable: crewDTOs.filter((c) => c.activeCount === 0).length,
      peopleAtRisk: active.reduce((a, r) => a + r.peopleAffected, 0),
    },
  };
}

async function buildCrewDTOs(crewRows: Crew[]): Promise<CrewDTO[]> {
  const counts = await db.execute<{ crew_id: number; active: string; resolved: string; active_codes: string | null }>(sql`
    SELECT crew_id,
      count(*) FILTER (WHERE status <> 'resolved')::text AS active,
      count(*) FILTER (WHERE status = 'resolved')::text AS resolved,
      string_agg(CASE WHEN status <> 'resolved' THEN code END, ',') AS active_codes
    FROM emergency_requests WHERE crew_id IS NOT NULL GROUP BY crew_id`);
  const cm = new Map(counts.rows.map((r) => [Number(r.crew_id), r]));
  return crewRows.map((c) => {
    const row = cm.get(c.id);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      captain: c.captain,
      ship: c.ship,
      specialty: c.specialty,
      color: c.color,
      motto: c.motto,
      activeCount: Number(row?.active ?? 0),
      resolvedCount: Number(row?.resolved ?? 0),
      activeCodes: row?.active_codes ? row.active_codes.split(",").filter(Boolean) : [],
    };
  });
}

export async function getCrews(): Promise<CrewDTO[]> {
  await ensureBootstrap();
  const { all } = await crewMap();
  return buildCrewDTOs(all);
}

export async function getRequestDetail(id: number): Promise<RequestDetail | null> {
  await refreshPriorities();
  const { all, map } = await crewMap();
  const [r] = await db.select().from(emergencyRequests).where(eq(emergencyRequests.id, id));
  if (!r) return null;
  const evs = await db.select().from(requestEvents).where(eq(requestEvents.requestId, id)).orderBy(desc(requestEvents.createdAt), desc(requestEvents.id));
  // queue position among active
  let queuePosition: number | null = null;
  if (r.status !== "resolved") {
    const res = await db.execute<{ pos: string }>(sql`
      SELECT count(*)::text AS pos FROM emergency_requests
      WHERE status <> 'resolved' AND (priority_score > ${r.priorityScore} OR (priority_score = ${r.priorityScore} AND created_at < ${r.createdAt.toISOString()}))`);
    queuePosition = Number(res.rows[0]?.pos ?? 0) + 1;
  }
  return {
    request: toRequestDTO(r, map),
    events: evs.map((e) => toEventDTO(e)),
    crews: await buildCrewDTOs(all),
    queuePosition,
  };
}

export async function getHistory(): Promise<HistoryData> {
  await refreshPriorities();
  const { all, map } = await crewMap();
  const rows = await db.select().from(emergencyRequests).orderBy(desc(emergencyRequests.createdAt));
  const eventRows = await db
    .select({ e: requestEvents, code: emergencyRequests.code, title: emergencyRequests.title, severity: emergencyRequests.severity })
    .from(requestEvents)
    .innerJoin(emergencyRequests, eq(requestEvents.requestId, emergencyRequests.id))
    .orderBy(desc(requestEvents.createdAt), desc(requestEvents.id))
    .limit(300);
  return {
    requests: rows.map((r) => toRequestDTO(r, map)),
    events: eventRows.map((row) => toEventDTO(row.e, row)),
    crews: await buildCrewDTOs(all),
  };
}

export class ActionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type CreateInput = {
  title: string;
  emergencyType: string;
  island: string;
  locationDetail?: string;
  severity: number;
  description?: string;
  callerName?: string;
  peopleAffected?: number;
};

export async function createRequest(input: CreateInput) {
  await ensureBootstrap();
  const title = (input.title ?? "").trim();
  if (title.length < 3) throw new ActionError("Give the distress call a title (3+ characters).");
  if (!(input.emergencyType in EMERGENCY_TYPES)) throw new ActionError("Unknown emergency type.");
  if (!(input.island in ISLANDS)) throw new ActionError("Unknown island.");
  const severity = Math.round(Number(input.severity));
  if (!(severity >= 1 && severity <= 5)) throw new ActionError("Severity must be between 1 and 5.");
  const people = Math.max(1, Math.min(100000, Math.round(Number(input.peopleAffected ?? 1)) || 1));
  const now = new Date();
  const score = computePriority({ severity, peopleAffected: people, createdAt: now, now });
  const tier = tierFor(score);
  const caller = (input.callerName ?? "").trim() || "Anonymous caller";

  const [row] = await db
    .insert(emergencyRequests)
    .values({
      code: `TMP-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.slice(0, 140),
      emergencyType: input.emergencyType,
      island: input.island,
      locationDetail: (input.locationDetail ?? "").trim().slice(0, 200),
      severity,
      description: (input.description ?? "").trim().slice(0, 2000),
      callerName: caller.slice(0, 80),
      peopleAffected: people,
      status: "pending",
      priorityScore: score,
      priorityTier: tier.key,
      createdAt: now,
      updatedAt: now,
      priorityUpdatedAt: now,
    })
    .returning();
  const code = `SOS-${String(row.id).padStart(4, "0")}`;
  await db.update(emergencyRequests).set({ code }).where(eq(emergencyRequests.id, row.id));
  await db.insert(requestEvents).values({
    requestId: row.id,
    kind: "created",
    message: `Distress signal received from ${caller}. Initial priority ${score.toFixed(1)} pts (${tier.name}).`,
    actor: "Den Den Mushi Dispatch",
    toStatus: "pending",
  });
  return { id: row.id, code };
}

export type ActionInput =
  | { action: "claim"; crewId: number }
  | { action: "status"; status: StatusKey; note?: string; actor?: string }
  | { action: "resolve"; note?: string; actor?: string }
  | { action: "release"; note?: string; actor?: string }
  | { action: "note"; message: string; actor?: string };

export async function performAction(id: number, input: ActionInput) {
  await ensureBootstrap();
  const [r] = await db.select().from(emergencyRequests).where(eq(emergencyRequests.id, id));
  if (!r) throw new ActionError("Request not found.", 404);
  const now = new Date();
  const crew = r.crewId ? (await db.select().from(crews).where(eq(crews.id, r.crewId)))[0] : undefined;
  const actorName = (a?: string) => (a && a.trim()) || crew?.name || "Den Den Mushi Dispatch";

  switch (input.action) {
    case "claim": {
      if (r.status !== "pending") throw new ActionError("This call has already been claimed by another crew.", 409);
      const [c] = await db.select().from(crews).where(eq(crews.id, Number(input.crewId)));
      if (!c) throw new ActionError("Unknown crew.");
      const updated = await db
        .update(emergencyRequests)
        .set({ status: "claimed", crewId: c.id, claimedAt: now, updatedAt: now })
        .where(and(eq(emergencyRequests.id, id), eq(emergencyRequests.status, "pending")))
        .returning({ id: emergencyRequests.id });
      if (updated.length === 0) throw new ActionError("This call was just claimed by another crew.", 409);
      const waitMin = Math.round((now.getTime() - r.createdAt.getTime()) / 60000);
      await db.insert(requestEvents).values({
        requestId: id,
        kind: "claimed",
        message: `${c.name} (${c.captain}) claimed the rescue after ${waitMin} min in queue.`,
        actor: c.name,
        fromStatus: "pending",
        toStatus: "claimed",
      });
      return;
    }
    case "status": {
      if (r.status === "resolved") throw new ActionError("Request is already resolved.");
      if (!r.crewId) throw new ActionError("A crew must claim this call before updating progress.");
      const allowed: StatusKey[] = ["claimed", "en_route", "on_scene"];
      if (!allowed.includes(input.status)) throw new ActionError("Invalid status.");
      if (input.status === r.status) throw new ActionError("Status unchanged.");
      await db.update(emergencyRequests).set({ status: input.status, updatedAt: now }).where(eq(emergencyRequests.id, id));
      const note = input.note?.trim();
      await db.insert(requestEvents).values({
        requestId: id,
        kind: "status",
        message: `Status → ${STATUSES[input.status].name}.${note ? ` ${note}` : ""}`,
        actor: actorName(input.actor),
        fromStatus: r.status,
        toStatus: input.status,
      });
      return;
    }
    case "resolve": {
      if (r.status === "resolved") throw new ActionError("Request is already resolved.");
      if (!r.crewId) throw new ActionError("A crew must claim this call before resolving it.");
      const score = computePriority({ severity: r.severity, peopleAffected: r.peopleAffected, createdAt: r.createdAt, resolvedAt: now });
      const note = input.note?.trim() || "Rescue complete. All survivors in safe harbor.";
      await db
        .update(emergencyRequests)
        .set({ status: "resolved", resolvedAt: now, updatedAt: now, resolutionNote: note, priorityScore: score, priorityTier: tierFor(score).key, priorityUpdatedAt: now })
        .where(eq(emergencyRequests.id, id));
      await db.insert(requestEvents).values({
        requestId: id,
        kind: "resolved",
        message: note,
        actor: actorName(input.actor),
        fromStatus: r.status,
        toStatus: "resolved",
      });
      return;
    }
    case "release": {
      if (r.status === "resolved" || r.status === "pending") throw new ActionError("Only claimed calls can be released.");
      await db.update(emergencyRequests).set({ status: "pending", crewId: null, claimedAt: null, updatedAt: now }).where(eq(emergencyRequests.id, id));
      await db.insert(requestEvents).values({
        requestId: id,
        kind: "released",
        message: `${crew?.name ?? "Crew"} released the call back to the queue.${input.note?.trim() ? ` ${input.note.trim()}` : ""}`,
        actor: actorName(input.actor),
        fromStatus: r.status,
        toStatus: "pending",
      });
      return;
    }
    case "note": {
      const msg = input.message?.trim();
      if (!msg) throw new ActionError("Note cannot be empty.");
      await db.update(emergencyRequests).set({ updatedAt: now }).where(eq(emergencyRequests.id, id));
      await db.insert(requestEvents).values({ requestId: id, kind: "note", message: msg.slice(0, 1000), actor: actorName(input.actor) });
      return;
    }
    default:
      throw new ActionError("Unknown action.");
  }
}

export { PRIORITY_TIERS };
