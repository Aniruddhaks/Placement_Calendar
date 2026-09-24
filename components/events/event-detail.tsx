'use client';

import type { PlacementEvent } from '@/types/events';
import { EventBadge } from './event-badge';
import { formatEventDateFull, formatTime, formatTimestamp } from '@/lib/utils/date';
import {
  Calendar,
  Clock,
  MapPin,
  Monitor,
  Building2,
  IndianRupee,
  GraduationCap,
  FileText,
  Timer,
  X,
  ExternalLink,
} from 'lucide-react';

interface EventDetailProps {
  event: PlacementEvent;
  onClose?: () => void;
}

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex gap-3 py-3">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-foreground mt-0.5 whitespace-pre-line">{value}</p>
      </div>
    </div>
  );
}

function detailValue(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.map((item) => `• ${item}`).join('\n');
  }
  return value;
}

export function EventDetail({ event, onClose }: EventDetailProps) {
  const details: { icon: React.ReactNode; label: string; value: string }[] = [];

  details.push({
    icon: <Calendar className="w-4 h-4" />,
    label: 'Date',
    value: formatEventDateFull(event.event_date),
  });

  if (event.start_time) {
    const timeStr = formatTime(event.start_time);
    const endStr = event.end_time ? ` – ${formatTime(event.end_time)}` : '';
    details.push({
      icon: <Clock className="w-4 h-4" />,
      label: 'Time',
      value: `${timeStr}${endStr}`,
    });
  }

  if (event.mode) {
    details.push({
      icon: <Monitor className="w-4 h-4" />,
      label: 'Mode',
      value: event.mode,
    });
  }

  if (event.venue) {
    details.push({
      icon: <Building2 className="w-4 h-4" />,
      label: 'Venue',
      value: event.venue,
    });
  }

  if (event.location) {
    details.push({
      icon: <MapPin className="w-4 h-4" />,
      label: 'Location',
      value: event.location,
    });
  }

  if (event.stipend) {
    details.push({
      icon: <IndianRupee className="w-4 h-4" />,
      label: 'Stipend',
      value: event.stipend,
    });
  }

  if (event.eligibility) {
    details.push({
      icon: <GraduationCap className="w-4 h-4" />,
      label: 'Eligibility',
      value: event.eligibility,
    });
  }

  if (event.application_deadline) {
    details.push({
      icon: <Timer className="w-4 h-4" />,
      label: 'Application Deadline',
      value: formatTimestamp(event.application_deadline),
    });
  }

  if (event.description) {
    details.push({
      icon: <FileText className="w-4 h-4" />,
      label: 'Description',
      value: event.description,
    });
  }

  // Additional JSONB details
  const additionalDetails = event.additional_details;
  const additionalEntries = additionalDetails
    ? Object.entries(additionalDetails).filter(([, value]) => {
        if (Array.isArray(value)) {
          return value.some((item) => item && item.trim());
        }
        return value && value.trim();
      })
    : [];

  const showJd = event.status === 'published' && Boolean(event.job_description_url);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">{event.company_name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{event.role}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <EventBadge type={event.event_type} />
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 divide-y divide-border/50">
        {details.map((detail, i) => (
          <DetailRow key={i} {...detail} />
        ))}
      </div>

      {/* Additional details */}
      {additionalEntries.length > 0 && (
        <div className="px-5 pb-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Additional Details
          </h3>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2.5">
            {additionalEntries.map(([key, value]) => (
              <div key={key}>
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <p className="text-sm text-foreground whitespace-pre-line">
                  {detailValue(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showJd && (
        <div className="px-5 pb-5">
          <a
            href={`/api/events/${event.id}/jd`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <FileText className="w-4 h-4" />
            Job Description
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
