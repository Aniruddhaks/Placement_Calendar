'use client';

import { useEffect, useMemo, useState } from 'react';
import { Filters } from '@/components/dashboard/filters';
import { NextUpCard } from '@/components/dashboard/next-up-card';
import { UpcomingEvents } from '@/components/dashboard/upcoming-events';
import { ShortlistsSection } from '@/components/shortlists/shortlists-section';
import { EventDetail } from '@/components/events/event-detail';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { filterEvents } from '@/lib/events/filter';
import { isEventUpcoming } from '@/lib/utils/date';
import type {
  EventFilters,
  PlacementEvent,
  Shortlist,
} from '@/types/events';

interface HomeDashboardProps {
  events: PlacementEvent[];
  shortlists?: Shortlist[];
  eventsById?: Record<string, PlacementEvent>;
}

export function HomeDashboard({ events, shortlists = [], eventsById = {} }: HomeDashboardProps) {
  const [filters, setFilters] = useState<EventFilters>({
    eventType: 'ALL',
    timeRange: 'ALL',
    search: '',
  });
  const [selectedEvent, setSelectedEvent] = useState<PlacementEvent | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const filteredEvents = useMemo(
    () => filterEvents(events, filters),
    [events, filters]
  );

  const nextEvent =
    filteredEvents.find((event) => isEventUpcoming(event.event_date)) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Filters filters={filters} onFiltersChange={setFilters} />
        <NextUpCard event={nextEvent} onClick={setSelectedEvent} />
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming events
          </h2>
          <UpcomingEvents
            events={filteredEvents}
            selectedEventId={selectedEvent?.id}
            onEventClick={setSelectedEvent}
          />
        </section>
        <ShortlistsSection shortlists={shortlists} eventsById={eventsById} />
      </div>

      <aside className="hidden lg:block">
        {selectedEvent ? (
          <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Select an event to see the full schedule details.
          </div>
        )}
      </aside>

      <Sheet
        open={Boolean(selectedEvent) && !isDesktop}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Event details</SheetTitle>
            <SheetDescription>Full details for the selected placement event.</SheetDescription>
          </SheetHeader>
          {selectedEvent && (
            <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
