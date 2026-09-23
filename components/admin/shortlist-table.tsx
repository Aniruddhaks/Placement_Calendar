'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Pencil, Trash2, Users } from 'lucide-react';
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
import {
  deleteShortlistAction,
  setShortlistStatusAction,
} from '@/lib/events/actions';
import { formatEventDate } from '@/lib/utils/date';
import type { Shortlist } from '@/types/events';

interface ShortlistTableProps {
  shortlists: Shortlist[];
}

function StatusBadge({ status }: { status: Shortlist['status'] }) {
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

export function ShortlistTable({ shortlists }: ShortlistTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (shortlists.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No shortlists yet. Incoming shortlist emails appear here as drafts.
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
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Students</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shortlists.map((shortlist) => {
              const studentCount =
                shortlist.student_count ??
                (shortlist.students ? shortlist.students.length : 0);
              return (
                <tr
                  key={shortlist.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{shortlist.company_name}</div>
                    <div className="text-muted-foreground">
                      {shortlist.event_id ? 'Linked to event' : 'No event link'}
                    </div>
                  </td>
                  <td className="px-4 py-3">{shortlist.role || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3.5" aria-hidden="true" />
                      {studentCount > 0 ? `${studentCount} students` : 'Unknown'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formatEventDate(shortlist.announcement_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={shortlist.status} />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            await setShortlistStatusAction(
                              shortlist.id,
                              shortlist.status === 'published' ? 'draft' : 'published'
                            );
                          });
                        }}
                        aria-label={
                          shortlist.status === 'published'
                            ? `Unpublish ${shortlist.company_name}`
                            : `Publish ${shortlist.company_name}`
                        }
                      >
                        {shortlist.status === 'published' ? (
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
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link href={`/admin/shortlists/${shortlist.id}/edit`} />
                        }
                      >
                        <Pencil /> Edit
                      </Button>
                      <AlertDialog
                        open={pendingId === shortlist.id}
                        onOpenChange={(open) =>
                          setPendingId(open ? shortlist.id : null)
                        }
                      >
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => setPendingId(shortlist.id)}
                          aria-label={`Delete ${shortlist.company_name}`}
                        >
                          <Trash2 />
                        </Button>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this shortlist?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {shortlist.company_name}
                              {shortlist.role ? ` — ${shortlist.role}` : ''} and its
                              student list will be removed permanently.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  await deleteShortlistAction(shortlist.id);
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}