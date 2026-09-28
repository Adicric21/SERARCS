import { getDashboard } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getDashboard());
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
