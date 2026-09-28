import { FleetConsole } from "@/components/FleetConsole";
import { getDashboard } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rescue Fleet · Den Den Mushi Dispatch" };

export default async function CrewsPage() {
  const data = await getDashboard();
  return <FleetConsole initial={data} />;
}
