import type { PlacementEvent, Shortlist } from '@/types/events';
import { UserCheck, Users } from 'lucide-react';
import { formatEventDate } from '@/lib/utils/date';

interface ShortlistCardProps {
  shortlist: Shortlist;
  event?: PlacementEvent | null;
  onClick?: (shortlist: Shortlist) => void;
}

export function ShortlistCard({ shortlist, event, onClick }: ShortlistCardProps) {
  const studentCount =
    shortlist.student_count ??
    (shortlist.students ? shortlist.students.length : 0);

  return (
    <button
      onClick={() => onClick?.(shortlist)}
      className="w-full text-left rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 group"
      aria-label={`View shortlist for ${shortlist.company_name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-primary" aria-hidden="true" />
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {shortlist.company_name}
            </h3>
          </div>
          {shortlist.role && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {shortlist.role}
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary whitespace-nowrap">
          <Users className="size-3.5" aria-hidden="true" />
          {studentCount > 0 ? `${studentCount} students` : 'Shortlist'}
        </span>
      </div>

      {(event || shortlist.announcement_date) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {event && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                event.event_type === 'OA'
                  ? 'event-badge-oa'
                  : 'event-badge-interview'
              }`}
            >
              Upcoming · {event.event_type === 'OA' ? 'OA / Test' : 'Technical Interview'} ·{' '}
              {formatEventDate(event.event_date)}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
            Announced {formatEventDate(shortlist.announcement_date)}
          </span>
        </div>
      )}

      <span className="mt-3 inline-flex items-center text-xs font-medium text-primary">
        <span className="mr-1">View shortlist</span>
        <span aria-hidden="true">→</span>
      </span>
    </button>
  );
}