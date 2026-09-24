'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Link2Off, Upload } from 'lucide-react';
import { removeEventJdAction, uploadEventJdAction } from '@/lib/events/actions';
import type { PlacementEvent } from '@/types/events';

interface JdManagerProps {
  event: PlacementEvent;
}

function jdLabel(path: string | null): string {
  if (!path) return 'No JD attached';
  const parts = path.split('/');
  return parts[parts.length - 1] || 'Job description';
}

export function JdManager({ event }: JdManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Job Description</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Attach the role description. It is visible to the public only after the
        event is published.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {event.job_description_url ? (
          <>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={`/api/events/${event.id}/jd`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Eye /> {jdLabel(event.job_description_url)}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await removeEventJdAction(event.id);
                });
              }}
            >
              <Link2Off /> Remove
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No JD attached yet.</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError(null);
            startTransition(async () => {
              const form = new FormData();
              form.append('file', file);
              const result = await uploadEventJdAction(event.id, form);
              if (result?.error) setError(result.error);
              if (inputRef.current) inputRef.current.value = '';
            });
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload /> {event.job_description_url ? 'Replace JD' : 'Upload JD'}
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}