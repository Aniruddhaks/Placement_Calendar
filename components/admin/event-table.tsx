'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { EventBadge } from '@/components/events/event-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteEventAction, setEventStatusAction } from '@/lib/events/actions';
import { formatEventDate, formatTime } from '@/lib/utils/date';
import type { PlacementEvent } from '@/types/events';

interface EventTableProps {
  events: PlacementEvent[];
}

function StatusBadge({ status }: { status: PlacementEvent['status'] }) {
  const draft = status === 'draft';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        draft
          ? 'bg-amber-100 text-amber-800'
          : 'bg-emerald-100 text-emerald-800'
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${draft ? 'bg-amber-600' : 'bg-emerald-600'}`}
        aria-hidden="true"
      />
      {draft ? 'Draft' : 'Published'}
    </span>
  );
}

export function EventTable({ events }: EventTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No events yet. Create the first placement event.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{event.company_name}</div>
                  <div className="text-muted-foreground">{event.role}</div>
                </td>
                <td className="px-4 py-3">
                  <EventBadge type={event.event_type} size="sm" />
                </td>
                <td className="px-4 py-3">{formatEventDate(event.event_date)}</td>
                <td className="px-4 py-3">{formatTime(event.start_time) || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={event.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          await setEventStatusAction(
                            event.id,
                            event.status === 'published' ? 'draft' : 'published'
                          );
                        });
                      }}
                      aria-label={
                        event.status === 'published'
                          ? `Unpublish ${event.company_name}`
                          : `Publish ${event.company_name}`
                      }
                    >
                      {event.status === 'published' ? (
                        <>
                          <EyeOff /> Unpublish
                        </>
                      ) : (
                        <>
                          <Eye /> Publish
                        </>
                      )}
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      nativeButton={false}
                      render={<Link href={`/admin/events/${event.id}/edit`} />}
                      aria-label={`Edit ${event.company_name}`}
                    >
                      <Pencil />
                    </Button>
                    <AlertDialog
                      open={pendingId === event.id}
                      onOpenChange={(open) => setPendingId(open ? event.id : null)}
                    >
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => setPendingId(event.id)}
                        aria-label={`Delete ${event.company_name}`}
                      >
                        <Trash2 />
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {event.company_name} — {event.role} will be removed permanently.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await deleteEventAction(event.id);
                                setPendingId(null);
                              });
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
