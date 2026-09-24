import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = rawUrl
    ? rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
    : '';
  return createClient(supabaseUrl, serviceKey ?? '');
}