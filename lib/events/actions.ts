'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';
import {
  createEvent,
  createShortlist,
  deleteEvent,
  deleteShortlist,
  setEventStatus,
  setShortlistStatus,
  updateEvent,
  updateShortlist,
} from '@/lib/events/queries';
import type {
  EventStatus,
  EventType,
  PlacementEventInput,
  ShortlistInput,
  ShortlistStatus,
} from '@/types/events';

function sanitizeJdFilename(filename: string): string {
  const base = (filename || 'job-description')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120);
  return base || 'job-description';
}

export async function uploadEventJdAction(id: string, formData: FormData) {
  await requireAdmin();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a file to upload.' };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { error: 'JD must be 20 MB or smaller.' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const objectPath = `${id}/${sanitizeJdFilename(file.name)}`;

  const supabase = createServiceClient();
  const { error: uploadError } = await supabase.storage
    .from('jds')
    .upload(objectPath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });
  if (uploadError) {
    return { error: uploadError.message || 'Could not upload the JD.' };
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({
      job_description_url: objectPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updateError) {
    return { error: updateError.message || 'Could not save the JD.' };
  }

  revalidatePath(`/admin/events/${id}/edit`);
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/calendar');
  return { success: true };
}

export async function removeEventJdAction(id: string) {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data: event } = await supabase
    .from('events')
    .select('job_description_url')
    .eq('id', id)
    .single();
  if (event?.job_description_url) {
    await supabase.storage.from('jds').remove([event.job_description_url]);
  }

  await supabase
    .from('events')
    .update({ job_description_url: null, updated_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath(`/admin/events/${id}/edit`);
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/calendar');
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const text = String(value || '').trim();
  return text ? text : null;
}

function parseAdditionalDetails(raw: string | null): Record<string, string> | null {
  if (!raw) return null;

  const details: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && value) details[key] = value;
  }

  return Object.keys(details).length > 0 ? details : null;
}

function parseEventInput(formData: FormData): PlacementEventInput {
  const eventType = String(formData.get('event_type') || '') as EventType;
  if (eventType !== 'OA' && eventType !== 'TECHNICAL_INTERVIEW') {
    throw new Error('Invalid event type.');
  }

  const companyName = String(formData.get('company_name') || '').trim();
  const role = String(formData.get('role') || '').trim();
  const eventDate = String(formData.get('event_date') || '').trim();

  if (!companyName || !role || !eventDate) {
    throw new Error('Company, role, and date are required.');
  }

  return {
    company_name: companyName,
    role,
    event_type: eventType,
    event_date: eventDate,
    start_time: emptyToNull(formData.get('start_time')),
    end_time: emptyToNull(formData.get('end_time')),
    mode: emptyToNull(formData.get('mode')),
    venue: emptyToNull(formData.get('venue')),
    location: emptyToNull(formData.get('location')),
    application_deadline: emptyToNull(formData.get('application_deadline')),
    stipend: emptyToNull(formData.get('stipend')),
    eligibility: emptyToNull(formData.get('eligibility')),
    description: emptyToNull(formData.get('description')),
    additional_details: parseAdditionalDetails(
      emptyToNull(formData.get('additional_details'))
    ),
  };
}

function revalidateEventPages() {
  revalidatePath('/');
  revalidatePath('/calendar');
  revalidatePath('/admin');
}

function revalidateShortlistPages() {
  revalidatePath('/');
  revalidatePath('/shortlists');
  revalidatePath('/admin');
  revalidatePath('/admin/shortlists');
}

export async function createEventAction(
  _prevState: { error: string } | null,
  formData: FormData
) {
  try {
    await requireAdmin();
    await createEvent(parseEventInput(formData));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create event.' };
  }

  revalidateEventPages();
  redirect('/admin');
}

export async function updateEventAction(
  id: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  try {
    await requireAdmin();
    await updateEvent(id, parseEventInput(formData));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update event.' };
  }

  revalidateEventPages();
  revalidatePath(`/admin/events/${id}/edit`);
  redirect('/admin');
}

export async function deleteEventAction(id: string) {
  await requireAdmin();
  await deleteEvent(id);
  revalidateEventPages();
}

export async function setEventStatusAction(id: string, status: EventStatus) {
  await requireAdmin();
  await setEventStatus(id, status);
  revalidateEventPages();
}

// ── Shortlists ──

function parseShortlistInput(formData: FormData): ShortlistInput {
  const companyName = String(formData.get('company_name') || '').trim();
  const announcementDate = String(formData.get('announcement_date') || '').trim();

  if (!companyName || !announcementDate) {
    throw new Error('Company and announcement date are required.');
  }

  const students: { name?: string; usn?: string }[] = [];
  const names = formData.getAll('student_name');
  const usns = formData.getAll('student_usn');
  const count = Math.max(names.length, usns.length);

  for (let i = 0; i < count; i++) {
    const name = String(names[i] || '').trim();
    const usn = String(usns[i] || '').trim();
    if (!name && !usn) continue;
    const student: { name?: string; usn?: string } = {};
    if (name) student.name = name;
    if (usn) student.usn = usn.toUpperCase();
    students.push(student);
  }

  const eventId = String(formData.get('event_id') || '').trim();

  return {
    company_name: companyName,
    role: emptyToNull(formData.get('role')),
    announcement_date: announcementDate,
    event_id: eventId || null,
    student_count: students.length > 0 ? students.length : null,
    students: students.length > 0 ? students : undefined,
  };
}

export async function createShortlistAction(
  _prevState: { error: string } | null,
  formData: FormData
) {
  try {
    await requireAdmin();
    await createShortlist(parseShortlistInput(formData));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create shortlist.' };
  }

  revalidateShortlistPages();
  redirect('/admin/shortlists');
}

export async function updateShortlistAction(
  id: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  try {
    await requireAdmin();
    await updateShortlist(id, parseShortlistInput(formData));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update shortlist.' };
  }

  revalidateShortlistPages();
  revalidatePath(`/admin/shortlists/${id}/edit`);
  redirect('/admin/shortlists');
}

export async function deleteShortlistAction(id: string) {
  await requireAdmin();
  await deleteShortlist(id);
  revalidateShortlistPages();
}

export async function setShortlistStatusAction(id: string, status: ShortlistStatus) {
  await requireAdmin();
  await setShortlistStatus(id, status);
  revalidateShortlistPages();
}
