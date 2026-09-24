'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createEventAction, updateEventAction } from '@/lib/events/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PlacementEvent } from '@/types/events';

interface EventFormProps {
  event?: PlacementEvent;
}

function additionalDetailsText(event?: PlacementEvent) {
  if (!event?.additional_details) return '';
  return Object.entries(event.additional_details)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(', ') : value;
      return `${key}: ${text}`;
    })
    .join('\n');
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({ event }: EventFormProps) {
  const action = event
    ? updateEventAction.bind(null, event.id)
    : createEventAction;
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">Company</Label>
          <Input
            id="company_name"
            name="company_name"
            defaultValue={event?.company_name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" name="role" defaultValue={event?.role} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_type">Event type</Label>
          <select
            id="event_type"
            name="event_type"
            defaultValue={event?.event_type ?? 'OA'}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="OA">OA / Test</option>
            <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_date">Date</Label>
          <Input
            id="event_date"
            name="event_date"
            type="date"
            defaultValue={event?.event_date}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start_time">Start time</Label>
          <Input
            id="start_time"
            name="start_time"
            type="time"
            defaultValue={event?.start_time?.slice(0, 5) ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">End time</Label>
          <Input
            id="end_time"
            name="end_time"
            type="time"
            defaultValue={event?.end_time?.slice(0, 5) ?? ''}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mode">Mode</Label>
          <Input id="mode" name="mode" defaultValue={event?.mode ?? ''} placeholder="Online / Offline" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue">Venue</Label>
          <Input id="venue" name="venue" defaultValue={event?.venue ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={event?.location ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="application_deadline">Application deadline</Label>
          <Input
            id="application_deadline"
            name="application_deadline"
            type="datetime-local"
            defaultValue={toDateTimeLocal(event?.application_deadline ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stipend">Stipend</Label>
          <Input id="stipend" name="stipend" defaultValue={event?.stipend ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eligibility">Eligibility</Label>
          <Input id="eligibility" name="eligibility" defaultValue={event?.eligibility ?? ''} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={event?.description ?? ''} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional_details">Additional details</Label>
        <Textarea
          id="additional_details"
          name="additional_details"
          placeholder={'one item per line, e.g.\nplatform: Hackerrank\nrounds: 2'}
          defaultValue={additionalDetailsText(event)}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : event ? 'Save changes' : 'Create event'}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
