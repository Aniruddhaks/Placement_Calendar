import { HomeDashboard } from '@/components/dashboard/home-dashboard';
import {
  getAllEventsServer,
  getPublishedShortlistsServer,
  getUpcomingEventsServer,
} from '@/lib/events/queries';
import type { PlacementEvent, Shortlist } from '@/types/events';

export default async function HomePage() {
  let events: PlacementEvent[] = [];
  let shortlists: Shortlist[] = [];
  let allEvents: PlacementEvent[] = [];

  try {
    events = await getUpcomingEventsServer();
  } catch (error) {
    console.error('[HomePage] getUpcomingEventsServer failed:', error);
    events = [];
  }

  try {
    shortlists = await getPublishedShortlistsServer();
  } catch (error) {
    console.error('[HomePage] getPublishedShortlistsServer failed:', error);
    shortlists = [];
  }

  try {
    allEvents = await getAllEventsServer();
  } catch (error) {
    console.error('[HomePage] getAllEventsServer failed:', error);
    allEvents = [];
  }

  const eventsById: Record<string, PlacementEvent> = {};
  for (const event of allEvents) {
    eventsById[event.id] = event;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Placement schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming OAs, technical interviews, and shortlist announcements, ordered by date.
        </p>
      </div>
      <HomeDashboard
        events={events}
        shortlists={shortlists}
        eventsById={eventsById}
      />
    </div>
  );
}