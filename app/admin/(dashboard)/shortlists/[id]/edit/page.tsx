import { notFound } from 'next/navigation';
import { ShortlistForm } from '@/components/admin/shortlist-form';
import { getAllEventsServer, getShortlistByIdServer } from '@/lib/events/queries';

interface EditShortlistPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditShortlistPage({ params }: EditShortlistPageProps) {
  const { id } = await params;
  const shortlist = await getShortlistByIdServer(id).catch(() => null);
  if (!shortlist) notFound();

  const events = await getAllEventsServer().catch(() => []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit shortlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the student list, link it to a placement event, and publish when ready.
        </p>
      </div>
      <ShortlistForm shortlist={shortlist} events={events} />
    </div>
  );
}