import { CommandDeck } from "@/components/CommandDeck";
import { getDashboard } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboard();
  return <CommandDeck initial={data} />;
}
