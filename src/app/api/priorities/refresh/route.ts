import { refreshPriorities } from "@/lib/server/service";

export const dynamic = "force-dynamic";

// Can be hit by a cron / Den Den Mushi relay to recompute waiting-time priorities.
export async function POST() {
  await refreshPriorities();
  return Response.json({ ok: true, refreshedAt: new Date().toISOString() });
}
