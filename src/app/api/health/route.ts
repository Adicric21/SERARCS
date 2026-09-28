import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureBootstrap } from "@/lib/server/bootstrap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureBootstrap().catch((e) => console.error("bootstrap", e));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
