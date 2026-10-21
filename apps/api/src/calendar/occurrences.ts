import type { CalendarOccurrence } from "@study-os/contracts";

export interface RecurringEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  sourceType: "manual" | "task" | "course";
  recurrence: "none" | "daily" | "weekly";
  recurrenceUntil: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_OCCURRENCES = 500;

export function expandOccurrences(
  events: RecurringEvent[],
  from: Date,
  to: Date,
): CalendarOccurrence[] {
  const occurrences: CalendarOccurrence[] = [];

  for (const event of events) {
    const duration = event.endsAt.getTime() - event.startsAt.getTime();
    if (duration <= 0) continue;

    if (event.recurrence === "none") {
      if (event.endsAt >= from && event.startsAt <= to) {
        occurrences.push(toOccurrence(event, event.startsAt, duration));
      }
      continue;
    }

    const step = event.recurrence === "daily" ? DAY_MS : 7 * DAY_MS;
    let start = event.startsAt.getTime();
    if (start < from.getTime()) {
      const skipped = Math.floor((from.getTime() - start) / step);
      start += skipped * step;
      if (start + duration < from.getTime()) start += step;
    }

    for (let count = 0; count < MAX_OCCURRENCES; count += 1) {
      const startDate = new Date(start);
      if (startDate.getTime() > to.getTime()) break;
      if (event.recurrenceUntil && startDate.getTime() > event.recurrenceUntil.getTime()) break;
      if (start + duration >= from.getTime()) {
        occurrences.push(toOccurrence(event, startDate, duration));
      }
      start += step;
    }
  }

  occurrences.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return occurrences;
}

function toOccurrence(
  event: RecurringEvent,
  startsAt: Date,
  duration: number,
): CalendarOccurrence {
  return {
    eventId: event.id,
    title: event.title,
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + duration).toISOString(),
    timezone: event.timezone,
    recurrence: event.recurrence,
    sourceType: event.sourceType,
  };
}
