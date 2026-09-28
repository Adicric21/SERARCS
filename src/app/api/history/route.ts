import { getHistory } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getHistory());
}
