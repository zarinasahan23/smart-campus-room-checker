export type Minutes = number;

export type Booking = { start: Minutes; end: Minutes; label: string };

export type Outcome =
  | { kind: 'available' }
  | { kind: 'unavailable'; reason: string };

export type ReasonCode =
  | 'AVAILABLE'
  | 'BLOCKED'
  | 'NEGATIVE_START'
  | 'INVALID_RANGE'
  | 'PAST_TIME'
  | 'OUT_OF_DAY'
  | 'TOO_LONG'
  | 'OVERLAP';

export type DetailedOutcome = Outcome & { reasonCode: ReasonCode };

export const MAX_DURATION = 120;

const toHHMM = (mins: Minutes): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const overlaps = (a: Booking, start: Minutes, end: Minutes): boolean =>
  start < a.end && a.start < end;

export function evaluateDetailed(
  start: Minutes,
  end: Minutes,
  now: Minutes,
  blocked: boolean,
  bookings: Booking[]
): DetailedOutcome {
  if (blocked) {
    return { kind: 'unavailable', reason: 'The room is currently flagged as blocked by the facilities team.', reasonCode: 'BLOCKED' };
  }
  if (start < 0) {
    return { kind: 'unavailable', reason: 'Start time cannot be before 00:00.', reasonCode: 'NEGATIVE_START' };
  }
  if (start >= end) {
    return { kind: 'unavailable', reason: 'End time must be later than the start time.', reasonCode: 'INVALID_RANGE' };
  }
  if (start <= now) {
    return { kind: 'unavailable', reason: `Start time must be strictly after the current time (${toHHMM(now)}).`, reasonCode: 'PAST_TIME' };
  }
  if (end > 1440) {
    return { kind: 'unavailable', reason: 'End time cannot go past 24:00 (midnight).', reasonCode: 'OUT_OF_DAY' };
  }
  const duration = end - start;
  if (duration > MAX_DURATION) {
    return {
      kind: 'unavailable',
      reason: `Requested booking is ${duration} minutes long. The maximum allowed is ${MAX_DURATION} minutes.`,
      reasonCode: 'TOO_LONG',
    };
  }
  const conflict = bookings.find((b) => overlaps(b, start, end));
  if (conflict) {
    return {
      kind: 'unavailable',
      reason: `Overlaps an existing booking (${conflict.label}). Bookings that only touch at an endpoint are fine.`,
      reasonCode: 'OVERLAP',
    };
  }
  return { kind: 'available', reasonCode: 'AVAILABLE' };
}

export function evaluate(
  start: Minutes,
  end: Minutes,
  now: Minutes,
  blocked: boolean,
  bookings: Booking[]
): Outcome {
  const detailed = evaluateDetailed(start, end, now, blocked, bookings);
  if (detailed.kind === 'available') {
    return { kind: 'available' };
  }
  return { kind: 'unavailable', reason: detailed.reason };
}

export function canBook({
  start,
  end,
  now,
  blocked,
  bookings,
}: {
  start: Minutes;
  end: Minutes;
  now: Minutes;
  blocked: boolean;
  bookings: Booking[];
}): boolean {
  return evaluate(start, end, now, blocked, bookings).kind === 'available';
}
