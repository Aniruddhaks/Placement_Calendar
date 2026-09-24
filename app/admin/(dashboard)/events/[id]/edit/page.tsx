import { notFound } from 'next/navigation';
import { EventForm } from '@/components/admin/event-form';
import { JdManager } from '@/components/admin/jd-manager';
import { getEventByIdServer } from '@/lib/events/queries';

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const event = await getEventByIdServer(id).catch(() => null);

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes are visible immediately on the public tracker.
        </p>
      </div>
      <JdManager event={event} />
      <EventForm event={event} />
    </div>
  );
}
