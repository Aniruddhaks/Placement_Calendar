'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import {
  createShortlistAction,
  updateShortlistAction,
} from '@/lib/events/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlacementEvent, Shortlist } from '@/types/events';

interface ShortlistFormProps {
  shortlist?: Shortlist;
  events: PlacementEvent[];
}

interface StudentRow {
  name?: string;
  usn?: string;
}

function initialStudents(shortlist?: Shortlist): StudentRow[] {
  if (!shortlist?.students) return [{}, {}];
  const rows = shortlist.students.map((s) => ({ name: s.name, usn: s.usn }));
  if (rows.length === 0) return [{}];
  return rows;
}

export function ShortlistForm({ shortlist, events }: ShortlistFormProps) {
  const action = shortlist
    ? updateShortlistAction.bind(null, shortlist.id)
    : createShortlistAction;
  const [state, formAction, pending] = useActionState(action, null);
  const [students, setStudents] = useState<StudentRow[]>(() =>
    initialStudents(shortlist)
  );

  const addStudent = () => setStudents((current) => [...current, {}]);
  const removeStudent = (index: number) => {
    setStudents((current) => current.filter((_, i) => i !== index));
  };

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">Company</Label>
          <Input
            id="company_name"
            name="company_name"
            defaultValue={shortlist?.company_name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" name="role" defaultValue={shortlist?.role ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="announcement_date">Announcement date</Label>
          <Input
            id="announcement_date"
            name="announcement_date"
            type="date"
            defaultValue={
              shortlist?.announcement_date ??
              new Date().toISOString().slice(0, 10)
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_id">Linked event (optional)</Label>
          <select
            id="event_id"
            name="event_id"
            defaultValue={shortlist?.event_id ?? ''}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">No linked event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.company_name} — {event.role} ({event.event_date})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Students</Label>
          <Button variant="outline" size="sm" type="button" onClick={addStudent}>
            <Plus /> Add student
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Fill in the name and/or USN exactly as shown in the email.
        </p>

        <div className="space-y-2">
          {students.map((student, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                name="student_name"
                placeholder="Student name"
                defaultValue={student.name ?? ''}
                className="flex-1"
                aria-label={`Student ${index + 1} name`}
              />
              <Input
                name="student_usn"
                placeholder="USN"
                defaultValue={student.usn ?? ''}
                className="w-44"
                aria-label={`Student ${index + 1} USN`}
              />
              <Button
                variant="destructive"
                size="icon-sm"
                type="button"
                onClick={() => removeStudent(index)}
                aria-label={`Remove student ${index + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {students.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No students added yet.
            </p>
          )}
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : shortlist ? 'Save changes' : 'Create shortlist'}
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/admin/shortlists" />}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}