/**
 * Timezone-correct day-boundary helpers.
 *
 * Entry.date is the user's "logical local date at midnight" (see models/Entry.ts),
 * but a user's IANA timezone rarely lines up with the server process's timezone.
 * These helpers compute the actual UTC instant of local midnight for a given
 * timezone, so writes (braindump.routes.ts) and reads (dashboard.routes.ts)
 * agree on where a day starts regardless of where the server happens to run.
 */

function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});

  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60_000;
}

/** The UTC instant of local midnight, on the calendar day `reference` falls on in `timezone`. */
export function getUserLocalMidnight(timezone: string, reference: Date = new Date()): Date {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, reference);
  const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(reference); // "YYYY-MM-DD"
  const utcGuess = new Date(`${localDateStr}T00:00:00Z`);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

/** [start, end) UTC instants bounding the local calendar day `reference` falls on in `timezone`. DST-safe. */
export function getUserLocalDayBounds(timezone: string, reference: Date = new Date()): { start: Date; end: Date } {
  const start = getUserLocalMidnight(timezone, reference);
  const end = getUserLocalMidnight(timezone, new Date(reference.getTime() + 24 * 60 * 60 * 1000));
  return { start, end };
}

/**
 * A UTC-labeled noon anchor for the calendar day `reference` falls on in `timezone`.
 * Safe to mutate with setUTCDate/setUTCMonth for week/month arithmetic; convert the
 * result back to a real instant with getUserLocalMidnight before querying.
 */
export function getLocalCalendarAnchor(timezone: string, reference: Date = new Date()): Date {
  const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(reference);
  return new Date(`${localDateStr}T12:00:00Z`);
}
