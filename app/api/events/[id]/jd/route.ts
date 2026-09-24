import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';

interface JdRouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: JdRouteParams) {
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('status, job_description_url')
    .eq('id', id)
    .single();

  if (error || !event?.job_description_url) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isPublished = event.status === 'published';
  if (!isPublished) {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  const { data: signed } = await supabase.storage
    .from('jds')
    .createSignedUrl(event.job_description_url, 300);

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl);
}