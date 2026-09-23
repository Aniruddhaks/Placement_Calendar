import Link from 'next/link';
import { ShortlistTable } from '@/components/admin/shortlist-table';
import { Button } from '@/components/ui/button';
import { getAllShortlistsServer } from '@/lib/events/queries';
import type { Shortlist } from '@/types/events';

export default async function AdminShortlistsPage() {
  let shortlists: Shortlist[] = [];

  try {
    shortlists = await getAllShortlistsServer();
  } catch {
    shortlists = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shortlists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review, edit, and publish shortlisted student lists. Incoming
            shortlist emails appear here as drafts.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/admin/shortlists/new" />}
        >
          New shortlist
        </Button>
      </div>
      <ShortlistTable shortlists={shortlists} />
    </div>
  );
}