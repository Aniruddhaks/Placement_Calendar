import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getNowIST } from '@/lib/utils/date';
import type { PlacementEvent, PlacementEventInput } from '@/types/events';

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
