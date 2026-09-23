import type { EventType } from '@/types/events';
import { EVENT_TYPE_LABELS } from '@/types/events';

interface EventBadgeProps {
  type: EventType;
  size?: 'sm' | 'md';
}

export function EventBadge({ type, size = 'md' }: EventBadgeProps) {
  const isOA = type === 'OA';
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      } ${isOA ? 'event-badge-oa' : 'event-badge-interview'}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isOA ? 'event-dot-oa' : 'event-dot-interview'}`}
        aria-hidden="true"
      />
      {EVENT_TYPE_LABELS[type]}
    </span>
  );
}
