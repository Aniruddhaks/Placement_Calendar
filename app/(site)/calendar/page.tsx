import { MonthCalendar } from '@/components/calendar/month-calendar';
import { getAllEventsServer } from '@/lib/events/queries';
import type { PlacementEvent } from '@/types/events';

export default async function CalendarPage() {
  let events: PlacementEvent[] = [];

  try {
    events = await getAllEventsServer();
  } catch {
    events = [];
  }

  return <MonthCalendar events={events} />;
}
