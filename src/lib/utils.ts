import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateGoogleCalendarLink({
  title,
  startDate,
  endDate,
  description,
  location,
}: {
  title: string;
  startDate: Date;
  endDate: Date;
  description: string;
  location?: string;
}) {
  const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.append('action', 'TEMPLATE');
  url.searchParams.append('text', title);
  url.searchParams.append('dates', `${fmt(startDate)}/${fmt(endDate)}`);
  url.searchParams.append('details', description);
  if (location) url.searchParams.append('location', location);
  return url.toString();
}

export function generateAppleCalendarICS({
  title,
  startDate,
  endDate,
  description,
  location,
}: {
  title: string;
  startDate: Date;
  endDate: Date;
  description: string;
  location?: string;
}) {
  const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(startDate)}`,
    `DTEND:${fmt(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\n');

  return icsContent;
}

export function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  link.click();
}

export function formatWhatsAppMessage(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
