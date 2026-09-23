import type { PlacementEvent } from '@/types/events';
import { EventCard } from '@/components/events/event-card';

interface UpcomingEventsProps {
  events: PlacementEvent[];
  selectedEventId?: string;
  onEventClick?: (event: PlacementEvent) => void;
}

export function UpcomingEvents({
  events,
  selectedEventId,
  onEventClick,
}: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">
          No upcoming placement events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={onEventClick}
          isSelected={event.id === selectedEventId}
        />
      ))}
    </div>
  );
}
