import { formatInTimeZone } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

export function formatTimeIST(timestamp: number): string {
  if (!timestamp) return '';
  return formatInTimeZone(timestamp, IST_TIMEZONE, 'h:mm a');
}

export function formatDateIST(timestamp: number): string {
  if (!timestamp) return '';
  return formatInTimeZone(timestamp, IST_TIMEZONE, 'MMM d, yyyy');
}

export function formatMessageTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  
  if (now.toDateString() === date.toDateString()) {
    return formatTimeIST(timestamp);
  }
  return formatInTimeZone(timestamp, IST_TIMEZONE, 'MMM d');
}

export function formatLastSeen(timestamp: number): string {
  if (!timestamp) return 'Offline';
  const now = new Date();
  const date = new Date(timestamp);
  
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  if (now.toDateString() === date.toDateString()) {
    return 'Today at ' + formatTimeIST(timestamp);
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return 'Yesterday at ' + formatTimeIST(timestamp);
  }
  
  return formatInTimeZone(timestamp, IST_TIMEZONE, 'MMM d, h:mm a');
}
