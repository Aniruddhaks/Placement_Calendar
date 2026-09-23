import {
  format,
  isToday,
  isTomorrow,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isBefore,
  startOfDay,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

export function getNowIST(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function toIST(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(d, TIMEZONE);
}

export function formatEventDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = getNowIST();
  const istDate = toIST(date);

  if (isToday(istDate)) return 'Today';
  if (isTomorrow(istDate)) return 'Tomorrow';
  
  if (istDate.getFullYear() === now.getFullYear()) {
    return format(istDate, 'd MMM');
  }
  
  return format(istDate, 'd MMM yyyy');
}

export function formatEventDateFull(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMMM yyyy');
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = parseISO(timestamp);
  return format(date, "d MMMM yyyy, h:mm a");
}

export function formatLastUpdated(timestamp: string): string {
  const date = parseISO(timestamp);
  return format(date, "d MMM yyyy, h:mm a");
}

export function isEventUpcoming(eventDate: string): boolean {
  const now = getNowIST();
  const eventDay = startOfDay(parseISO(eventDate));
  const todayStart = startOfDay(now);

  if (isBefore(eventDay, todayStart)) return false;
  return true;
}

export function isInTimeRange(
  eventDate: string,
  range: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'
): boolean {
  if (range === 'ALL') return true;
  
  const now = getNowIST();
  const date = parseISO(eventDate);

  switch (range) {
    case 'TODAY':
      return isToday(date);
    case 'THIS_WEEK':
      return isWithinInterval(date, {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      });
    case 'THIS_MONTH':
      return isWithinInterval(date, {
        start: startOfMonth(now),
        end: endOfMonth(now),
      });
    default:
      return true;
  }
}

export function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay();

  const days: (number | null)[] = [];
  
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return days;
}
