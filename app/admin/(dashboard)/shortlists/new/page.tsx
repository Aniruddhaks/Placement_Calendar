import { ShortlistForm } from '@/components/admin/shortlist-form';
import { getAllEventsServer } from '@/lib/events/queries';

export default async function NewShortlistPage() {
  const events = await getAllEventsServer().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New shortlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a shortlisted student list for a company or role.
        </p>
      </div>
      <ShortlistForm events={events} />
    </div>
  );
}