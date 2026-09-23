import type { PlacementEvent } from '@/types/events';
import { EventBadge } from '@/components/events/event-badge';
import { formatEventDate, formatTime } from '@/lib/utils/date';
import { Zap, Calendar, Clock, MapPin } from 'lucide-react';

interface NextUpCardProps {
  event: PlacementEvent | null;
  onClick?: (event: PlacementEvent) => void;
}

export function NextUpCard({ event, onClick }: NextUpCardProps) {
  if (!event) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Next Up
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          No upcoming placement events scheduled.
        </p>
      </div>
    );
  }

  const dateLabel = formatEventDate(event.event_date);
  const timeLabel = formatTime(event.start_time);

  return (
    <button
      onClick={() => onClick?.(event)}
      className="w-full text-left bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 group"
    >
      {/* Next Up label */}
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          Next Up
        </span>
      </div>

      {/* Company and role */}
      <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
        {event.company_name}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">{event.role}</p>

      {/* Badge */}
      <div className="mt-3">
        <EventBadge type={event.event_type} />
      </div>

      {/* Date, time, mode */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{dateLabel}</span>
        </span>
        {timeLabel && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span>{timeLabel}</span>
          </span>
        )}
        {(event.mode || event.location) && (
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span>{event.mode || event.location}</span>
          </span>
        )}
      </div>
    </button>
  );
}
