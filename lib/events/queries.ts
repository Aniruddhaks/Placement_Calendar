import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getNowIST } from '@/lib/utils/date';
import type {
  PlacementEvent,
  PlacementEventInput,
  Shortlist,
  ShortlistInput,
} from '@/types/events';

function todayIST(): string {
  return format(getNowIST(), 'yyyy-MM-dd');
}

// ── Public queries (can run on client or server) ──

export async function getUpcomingEvents(): Promise<PlacementEvent[]> {
  const supabase = createClient();
  const today = todayIST();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getUpcomingEventsServer(): Promise<PlacementEvent[]> {
  const supabase = await createServerSupabaseClient();
  const today = todayIST();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllEventsServer(): Promise<PlacementEvent[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getEventByIdServer(id: string): Promise<PlacementEvent | null> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getEventsByDateServer(date: string): Promise<PlacementEvent[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_date', date)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getLastUpdatedServer(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('events')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data?.updated_at || null;
}

// ── Admin mutations (server only) ──

export async function createEvent(input: PlacementEventInput): Promise<PlacementEvent> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('events')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(id: string, input: Partial<PlacementEventInput>): Promise<PlacementEvent> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('events')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function setEventStatus(
  id: string,
  status: 'draft' | 'published'
): Promise<PlacementEvent> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('events')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Shortlists (server only, admin + public) ──

export async function getAllShortlistsServer(): Promise<Shortlist[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shortlists')
    .select('*')
    .order('announcement_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPublishedShortlistsServer(): Promise<Shortlist[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shortlists')
    .select('*')
    .eq('status', 'published')
    .order('announcement_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getShortlistByIdServer(id: string): Promise<Shortlist | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shortlists')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createShortlist(input: ShortlistInput): Promise<Shortlist> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shortlists')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShortlist(
  id: string,
  input: Partial<ShortlistInput>
): Promise<Shortlist> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shortlists')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setShortlistStatus(
  id: string,
  status: 'draft' | 'published'
): Promise<Shortlist> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('shortlists')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteShortlist(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('shortlists')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
