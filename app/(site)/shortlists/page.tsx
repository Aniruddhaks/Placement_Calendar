import { ShortlistsSection } from '@/components/shortlists/shortlists-section';
import {
  getAllEventsServer,
  getPublishedShortlistsServer,
} from '@/lib/events/queries';
import type { PlacementEvent, Shortlist } from '@/types/events';

export default async function ShortlistsPage() {
  let shortlists: Shortlist[] = [];
  let events: PlacementEvent[] = [];

  try {
    shortlists = await getPublishedShortlistsServer();
  } catch {
    shortlists = [];
  }

  try {
    events = await getAllEventsServer();
  } catch {
    events = [];
  }

  const eventsById: Record<string, PlacementEvent> = {};
  for (const event of events) {
    eventsById[event.id] = event;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shortlists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Students shortlisted for placement rounds, announced by the placement cell.
        </p>
      </div>
      <ShortlistsSection
        shortlists={shortlists}
        eventsById={eventsById}
        title="All shortlists"
        showViewAll={false}
      />
    </div>
  );
}