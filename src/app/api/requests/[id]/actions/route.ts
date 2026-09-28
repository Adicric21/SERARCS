import { ActionError, performAction, type ActionInput } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext<"/api/requests/[id]/actions">) {
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as ActionInput;
    await performAction(Number(id), body);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof ActionError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Action failed" }, { status: 500 });
  }
}
