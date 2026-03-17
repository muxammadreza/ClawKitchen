import { listTickets } from "@/lib/tickets";
import { TicketsBoardClient } from "@/app/tickets/TicketsBoardClient";
import { getWorkspaceDir } from "@/lib/paths";

// Tickets reflect live filesystem state; do not cache.
export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const team = typeof sp.team === "string" ? sp.team.trim() : "";

  // If no team is specified, fall back to legacy behavior.
  // (AppShell will try to keep /tickets synced with the globally selected team via ?team=.)
  const teamId = team || "development-team";

  const scope = teamId === "main" ? await getWorkspaceDir() : teamId;
  const tickets = await listTickets(scope);

  return <TicketsBoardClient tickets={tickets} basePath="/tickets" selectedTeamId={team || null} />;
}
