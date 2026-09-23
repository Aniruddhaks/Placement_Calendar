import { EventForm } from '@/components/admin/event-form';

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This will appear on the public home and calendar pages.
        </p>
      </div>
      <EventForm />
    </div>
  );
}
