import { ActionError, createRequest, getDashboard, type CreateInput } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await getDashboard();
  return Response.json({ active: d.active, resolved: d.resolved });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateInput;
    const created = await createRequest(body);
    return Response.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof ActionError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Failed to create request" }, { status: 500 });
  }
}
