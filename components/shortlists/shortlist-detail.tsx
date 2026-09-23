import type { PlacementEvent, Shortlist } from '@/types/events';
import { Building2, Calendar, UserCheck, Users, X } from 'lucide-react';
import { formatEventDate } from '@/lib/utils/date';

interface ShortlistDetailProps {
  shortlist: Shortlist;
  event?: PlacementEvent | null;
  onClose?: () => void;
}

function studentLabel(index: number, name?: string, usn?: string): string {
  if (name && usn) return `${name} — ${usn}`;
  return name || usn || `Student ${index + 1}`;
}

export function ShortlistDetail({
  shortlist,
  event,
  onClose,
}: ShortlistDetailProps) {
  const studentCount =
    shortlist.student_count ??
    (shortlist.students ? shortlist.students.length : 0);
  const students = shortlist.students ?? [];

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">
              {shortlist.company_name}
            </h2>
            {shortlist.role && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {shortlist.role}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary whitespace-nowrap">
              <Users className="size-3.5" aria-hidden="true" />
              {studentCount > 0
                ? `${studentCount} student${studentCount === 1 ? '' : 's'} shortlisted`
                : 'Shortlist'}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close shortlist details"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-foreground">
          {shortlist.announcement_date && (
            <span className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              Announced {formatEventDate(shortlist.announcement_date)}
            </span>
          )}
          {event && (
            <span className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
              {event.company_name} — {event.role} ·{' '}
              {event.event_type === 'OA' ? 'OA / Test' : 'Technical Interview'} ·{' '}
              {formatEventDate(event.event_date)}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <UserCheck className="size-4" aria-hidden="true" />
          Shortlisted students
        </h3>

        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Student list not available yet.
          </p>
        ) : (
          <ol className="divide-y divide-border/60">
            {students.map((student, index) => (
              <li key={index} className="flex items-center gap-3 py-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 truncate text-sm">
                  {studentLabel(index, student.name, student.usn)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}