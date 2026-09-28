import { notFound } from "next/navigation";
import { RequestConsole } from "@/components/RequestConsole";
import { getRequestDetail } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export default async function RequestPage({ params }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isInteger(num)) notFound();
  const detail = await getRequestDetail(num);
  if (!detail) notFound();
  return <RequestConsole initial={detail} />;
}
