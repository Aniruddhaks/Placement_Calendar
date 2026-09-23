import type { EventFilters, PlacementEvent } from '@/types/events';
import { isInTimeRange } from '@/lib/utils/date';

export function filterEvents(
  events: PlacementEvent[],
  filters: EventFilters
): PlacementEvent[] {
  const query = filters.search.trim().toLowerCase();

  return events.filter((event) => {
    if (filters.eventType !== 'ALL' && event.event_type !== filters.eventType) {
      return false;
    }

    if (!isInTimeRange(event.event_date, filters.timeRange)) {
      return false;
    }

    if (!query) return true;

    return (
      event.company_name.toLowerCase().includes(query) ||
      event.role.toLowerCase().includes(query)
    );
  });
}
