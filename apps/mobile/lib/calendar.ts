import { Linking, Platform, Share } from 'react-native';

function toGoogleDates(startsAt: string, durationMinutes = 120): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `${fmt(start)}/${fmt(end)}`;
}

function buildIcs(input: {
  title: string;
  startsAt: string;
  venue?: string | null;
  durationMinutes?: number;
}): string {
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 120) * 60_000);
  const stamp = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = (s: string) => s.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Padel Nerdz//EN',
    'BEGIN:VEVENT',
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(input.title)}`,
    input.venue ? `LOCATION:${escape(input.venue)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/** Opens Google Calendar (all platforms) and offers an .ics share on native. */
export async function addSessionToCalendar(input: {
  title: string;
  startsAt: string;
  venue?: string | null;
}): Promise<void> {
  const dates = toGoogleDates(input.startsAt);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates,
    details: 'Padel Nerdz mix-in',
  });
  if (input.venue?.trim()) params.set('location', input.venue.trim());

  const googleUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
  const canOpen = await Linking.canOpenURL(googleUrl);
  if (canOpen) {
    await Linking.openURL(googleUrl);
  }

  if (Platform.OS === 'web') return;

  try {
    await Share.share({
      message: buildIcs(input),
      title: input.title,
    });
  } catch {
    /* share cancelled */
  }
}
