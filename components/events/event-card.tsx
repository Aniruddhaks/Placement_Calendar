import type { PlacementEvent } from '@/types/events';
import { EventBadge } from './event-badge';
import { formatEventDate, formatTime } from '@/lib/utils/date';
import { MapPin, Clock, Calendar } from 'lucide-react';

interface EventCardProps {
  event: PlacementEvent;
  onClick?: (event: PlacementEvent) => void;
  isSelected?: boolean;
}

export function EventCard({ event, onClick, isSelected }: EventCardProps) {
  return (
    <button
      onClick={() => onClick?.(event)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:border-primary/20 group ${
        isSelected
          ? 'border-primary/30 bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:bg-card'
      }`}
      aria-label={`${event.company_name} - ${event.role}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Company name */}
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {event.company_name}
          </h3>
          {/* Role */}
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {event.role}
          </p>
        </div>
        <EventBadge type={event.event_type} size="sm" />
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          {formatEventDate(event.event_date)}
        </span>
        {event.start_time && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {formatTime(event.start_time)}
          </span>
        )}
        {(event.mode || event.location) && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            {event.mode || event.location}
          </span>
        )}
      </div>
    </button>
  );
}
