'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { createEvent, deleteEvent, updateEvent } from '@/lib/events/queries';
import type { EventType, PlacementEventInput } from '@/types/events';

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
