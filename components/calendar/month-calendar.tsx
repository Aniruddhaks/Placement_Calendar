'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { EventCard } from '@/components/events/event-card';
import { EventDetail } from '@/components/events/event-detail';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getMonthDays, getNowIST } from '@/lib/utils/date';
import type { PlacementEvent } from '@/types/events';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthCalendarProps {
  events: PlacementEvent[];
}

function dateKey(year: number, month: number, day: number) {
  return format(new Date(year, month, day), 'yyyy-MM-dd');
}

export function MonthCalendar({ events }: MonthCalendarProps) {
  const now = getNowIST();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(format(now, 'yyyy-MM-dd'));
  const [selectedEvent, setSelectedEvent] = useState<PlacementEvent | null>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PlacementEvent[]>();
    for (const event of events) {
      const list = map.get(event.event_date) ?? [];
      list.push(event);
      map.set(event.event_date, list);
    }
    return map;
  }, [events]);

  const days = getMonthDays(year, month);
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{format(new Date(year, month, 1), 'MMMM yyyy')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setYear(now.getFullYear());
              setMonth(now.getMonth());
              setSelectedDate(format(now, 'yyyy-MM-dd'));
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-3">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-20 border-t border-r border-border/60 bg-muted/20" />;
            }

            const key = dateKey(year, month, day);
            const dayEvents = eventsByDate.get(key) ?? [];
            const isSelected = key === selectedDate;
            const isToday = key === format(now, 'yyyy-MM-dd');

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                className={`min-h-20 border-t border-r border-border/60 p-2 text-left transition-colors hover:bg-primary/5 ${
                  isSelected ? 'bg-primary/8' : ''
                }`}
              >
                <span
                  className={`inline-flex size-7 items-center justify-center rounded-full text-sm ${
                    isToday
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {day}
                </span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <span
                      key={event.id}
                      className={`size-1.5 rounded-full ${
                        event.event_type === 'OA' ? 'event-dot-oa' : 'event-dot-interview'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {format(new Date(`${selectedDate}T00:00:00`), 'd MMMM yyyy')}
        </h2>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events on this day.</p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={setSelectedEvent}
                isSelected={event.id === selectedEvent?.id}
              />
            ))}
          </div>
        )}
      </section>

      <Sheet
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      >
        <SheetContent side="right" showCloseButton={false} className="overflow-y-auto sm:max-w-md">
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
