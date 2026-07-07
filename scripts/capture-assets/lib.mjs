// Shared helpers for the demo-asset capture tooling. Not part of the app itself —
// these mirror small pieces of server/src/utils/timezone.ts and the server's own
// startup log output so the capture scripts can talk to the same running Mongo/Redis
// instances the live `pnpm dev` server process already started.
import { readFileSync } from 'node:fs';

export const DEMO_EMAIL = 'demo@sage.app';

// ts-node-dev restarts the server process (and its embedded Mongo/Redis) on
// every source change, so a long-lived log file can contain several of these
// lines with different ports. Always take the *last* one — the current process.
function lastMatch(log, pattern) {
  const matches = [...log.matchAll(pattern)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1];
}

export function readServerConnectionInfo(serverLogPath = process.env.SERVER_LOG ?? '/tmp/sage-server.log') {
  const log = readFileSync(serverLogPath, 'utf8');

  const mongoMatch = lastMatch(log, /started local embedded MongoDB at (mongodb:\/\/\S+)/g);
  if (!mongoMatch) throw new Error(`Could not find Mongo URI in ${serverLogPath}`);

  const redisMatch = lastMatch(log, /Redis connected: ([\d.]+):(\d+)/g);
  if (!redisMatch) throw new Error(`Could not find Redis host:port in ${serverLogPath}`);

  return {
    mongoUri: mongoMatch[1],
    redisHost: redisMatch[1],
    redisPort: Number(redisMatch[2]),
  };
}

// Mirrors server/src/utils/timezone.ts's getUserLocalMidnight exactly, so
// day-boundary math here agrees with the UTC instant braindump.routes.ts
// actually stamped entries with.
function getTimezoneOffsetMinutes(timezone, date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  const flooredDateMs = Math.floor(date.getTime() / 1000) * 1000;
  return (asUTC - flooredDateMs) / 60_000;
}

export function getUserLocalMidnight(timezone, reference = new Date()) {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, reference);
  const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(reference);
  const utcGuess = new Date(`${localDateStr}T00:00:00Z`);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

export function getUserLocalDayBounds(timezone, reference = new Date()) {
  const start = getUserLocalMidnight(timezone, reference);
  const end = getUserLocalMidnight(timezone, new Date(reference.getTime() + 24 * 60 * 60 * 1000));
  return { start, end };
}

// Small defensive margin (not compensating for any known bug) since our capture
// tooling calls getUserLocalMidnight independently across several scripts/moments
// and just wants a comfortably-inclusive boundary around "today" for cleanup/query
// purposes, not exact-instant equality.
const JITTER_BUFFER_MS = 5000;

export function getSafeUserLocalDayBounds(timezone, reference = new Date()) {
  const { start, end } = getUserLocalDayBounds(timezone, reference);
  return {
    start: new Date(start.getTime() - JITTER_BUFFER_MS),
    end: new Date(end.getTime() + JITTER_BUFFER_MS),
  };
}
