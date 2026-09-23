export type EventType = 'OA' | 'TECHNICAL_INTERVIEW';

export interface PlacementEvent {
  id: string;
  company_name: string;
  role: string;
  event_type: EventType;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  mode: string | null;
  venue: string | null;
  location: string | null;
  application_deadline: string | null;
  stipend: string | null;
  eligibility: string | null;
  description: string | null;
  additional_details: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface PlacementEventInput {
  company_name: string;
  role: string;
  event_type: EventType;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  mode?: string | null;
  venue?: string | null;
  location?: string | null;
  application_deadline?: string | null;
  stipend?: string | null;
  eligibility?: string | null;
  description?: string | null;
  additional_details?: Record<string, string> | null;
}

export interface EventFilters {
  eventType: EventType | 'ALL';
  timeRange: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';
  search: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  OA: 'OA / Test',
  TECHNICAL_INTERVIEW: 'Technical Interview',
};
