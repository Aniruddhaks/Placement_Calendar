'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShortlistCard } from '@/components/shortlists/shortlist-card';
import { ShortlistDetail } from '@/components/shortlists/shortlist-detail';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { PlacementEvent, Shortlist } from '@/types/events';

interface ShortlistsSectionProps {
  shortlists: Shortlist[];
  eventsById?: Record<string, PlacementEvent>;
  title?: string;
  showViewAll?: boolean;
}

export function ShortlistsSection({
  shortlists,
  eventsById = {},
  title = 'Recent shortlists',
  showViewAll = true,
}: ShortlistsSectionProps) {
  const [selected, setSelected] = useState<Shortlist | null>(null);

  if (shortlists.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {showViewAll && (
          <Link
            href="/shortlists"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {shortlists.map((shortlist) => (
          <ShortlistCard
            key={shortlist.id}
            shortlist={shortlist}
            event={shortlist.event_id ? eventsById[shortlist.event_id] : null}
            onClick={setSelected}
          />
        ))}
      </div>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent side="right" showCloseButton={false} className="overflow-y-auto sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Shortlist details</SheetTitle>
            <SheetDescription>
              Shortlisted students for the selected announcement.
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <ShortlistDetail
              shortlist={selected}
              event={
                selected.event_id ? eventsById[selected.event_id] : null
              }
              onClose={() => setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}