import { TicketsBoardClient } from "@/app/tickets/TicketsBoardClient";
import { listTickets } from "@/lib/tickets";
import { getWorkspaceDir } from "@/lib/paths";

export const dynamic = "force-dynamic";

export default async function TeamTicketsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const scope = teamId === "main" ? await getWorkspaceDir() : teamId;
  const tickets = await listTickets(scope);

  return (
    <TicketsBoardClient
      tickets={tickets}
      basePath={`/teams/${encodeURIComponent(teamId)}/tickets`}
      selectedTeamId={teamId}
    />
  );
}
