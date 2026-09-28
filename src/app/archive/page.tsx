import { ArchiveView } from "@/components/ArchiveView";
import { getHistory } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Captain's Log · Den Den Mushi Dispatch" };

export default async function ArchivePage() {
  const data = await getHistory();
  return <ArchiveView data={data} />;
}
