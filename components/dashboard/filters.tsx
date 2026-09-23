'use client';

import type { EventFilters, EventType } from '@/types/events';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
}

export function Filters({ filters, onFiltersChange }: FiltersProps) {
  const typeOptions: { value: EventType | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'OA', label: 'OA / Test' },
    { value: 'TECHNICAL_INTERVIEW', label: 'Technical Interview' },
  ];

  const timeOptions: { value: EventFilters['timeRange']; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'TODAY', label: 'Today' },
    { value: 'THIS_WEEK', label: 'This Week' },
    { value: 'THIS_MONTH', label: 'This Month' },
  ];

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search company or role..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9 h-10 bg-card"
          aria-label="Search events"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {/* Type filters */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                onFiltersChange({ ...filters, eventType: opt.value })
              }
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filters.eventType === opt.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Time filters */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {timeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                onFiltersChange({ ...filters, timeRange: opt.value })
              }
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filters.timeRange === opt.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
