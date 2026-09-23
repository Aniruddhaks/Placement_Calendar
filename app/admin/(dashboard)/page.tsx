import Link from 'next/link';
import { EventTable } from '@/components/admin/event-table';
import { Button } from '@/components/ui/button';
import { getAllEventsServer } from '@/lib/events/queries';
import type { PlacementEvent } from '@/types/events';

export default async function AdminPage() {
  let events: PlacementEvent[] = [];

  try {
    events = await getAllEventsServer();
  } catch {
    events = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and edit placement OAs and interviews.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/events/new" />}>
          New event
        </Button>
      </div>
      <EventTable events={events} />
    </div>
  );
}
