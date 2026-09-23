import { HomeDashboard } from '@/components/dashboard/home-dashboard';
import { getUpcomingEventsServer } from '@/lib/events/queries';
import type { PlacementEvent } from '@/types/events';

export default async function HomePage() {
  let events: PlacementEvent[] = [];

  try {
    events = await getUpcomingEventsServer();
  } catch {
    events = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Placement schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming OAs and technical interviews, ordered by date.
        </p>
      </div>
      <HomeDashboard events={events} />
    </div>
  );
}
