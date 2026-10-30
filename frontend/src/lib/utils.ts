import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

  if (Math.abs(diffInSeconds) < 60) return diffInSeconds > 0 ? 'in a few seconds' : 'just now';
  if (Math.abs(diffInSeconds) < 3600) {
    const mins = Math.floor(Math.abs(diffInSeconds) / 60);
    return diffInSeconds > 0 ? `in ${mins}m` : `${mins}m ago`;
  }
  if (Math.abs(diffInSeconds) < 86400) {
    const hours = Math.floor(Math.abs(diffInSeconds) / 3600);
    return diffInSeconds > 0 ? `in ${hours}h` : `${hours}h ago`;
  }
  const days = Math.floor(Math.abs(diffInSeconds) / 86400);
  return diffInSeconds > 0 ? `in ${days}d` : `${days}d ago`;
}
