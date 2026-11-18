import { describe, it, expect } from 'vitest';
import { canBook, evaluate, type Booking } from './booking';
import { NOW, DEFAULT_BOOKINGS } from './fixtures';

const DEFAULT_NOW = NOW;

const defaultBookings = (): Booking[] => [...DEFAULT_BOOKINGS];

type Case = {
  id: string;
  ac: string;
  start: number;
  end: number;
  now?: number;
  blocked?: boolean;
  bookings?: () => Booking[];
  expected: boolean;
};

const cases: Case[] = [
  { id: 'T01', ac: 'AC4 touching after', start: 660, end: 720, expected: true },
  { id: 'T02', ac: 'AC1 starts at now', start: 540, end: 570, expected: false },
  { id: 'T03', ac: 'AC1 zero duration', start: 720, end: 720, expected: false },
  { id: 'T04', ac: 'AC1 reversed', start: 750, end: 720, expected: false },
  { id: 'T05', ac: 'AC1 past day end', start: 1380, end: 1441, expected: false },
  { id: 'T06', ac: 'AC2 exactly 120', start: 720, end: 840, expected: true },
  { id: 'T07', ac: 'AC2 121 minutes', start: 720, end: 841, expected: false },
  { id: 'T08', ac: 'AC4 touching before', start: 570, end: 600, expected: true },
  { id: 'T09', ac: 'AC4 partial overlap', start: 630, end: 690, expected: false },
  { id: 'T10', ac: 'AC4 contains booking', start: 570, end: 690, expected: false },
  { id: 'T11', ac: 'AC4 inside booking', start: 615, end: 645, expected: false },
  { id: 'T12', ac: 'AC4 identical', start: 600, end: 660, expected: false },
  { id: 'T13', ac: 'AC3 room blocked', start: 660, end: 720, blocked: true, expected: false },
  { id: 'T14', ac: 'AC4 no existing bookings', start: 630, end: 690, bookings: () => [], expected: true },
  {
    id: 'T15',
    ac: 'AC5 bookings not mutated',
    start: 720,
    end: 780,
    bookings: () => [
      { start: 900, end: 960, label: '15:00 – 16:00' },
      { start: 600, end: 660, label: '10:00 – 11:00' },
    ],
    expected: true,
  },
  { id: 'T16', ac: 'AC1/AC2 ends exactly at 1440', start: 1320, end: 1440, expected: true },
  {
    id: 'T17',
    ac: 'AC4 fits gap exactly',
    start: 660,
    end: 720,
    bookings: () => [
      { start: 600, end: 660, label: '10:00 – 11:00' },
      { start: 720, end: 780, label: '12:00 – 13:00' },
    ],
    expected: true,
  },
  { id: 'T18', ac: 'AC1 start before now (now = 700)', start: 660, end: 720, now: 700, expected: false },
  { id: 'T19', ac: 'AC1 start after now (now = 700), no overlap', start: 720, end: 780, now: 700, expected: true },
];

describe('canBook', () => {
  it.each(cases)('$id ($ac): start $start, end $end -> $expected', ({ start, end, now, blocked, bookings, expected }) => {
    const bookingList = bookings ? bookings() : defaultBookings();
    const before = JSON.stringify(bookingList);

    const result = canBook({
      start,
      end,
      now: now ?? DEFAULT_NOW,
      blocked: blocked ?? false,
      bookings: bookingList,
    });

    expect(result).toBe(expected);
    expect(JSON.stringify(bookingList)).toBe(before);
  });
});

describe('regression: AC1–AC6', () => {
  // AC1 requires 0 <= start < end <= 1440 AND start strictly after now.
  // start=400 is before now (540), so the request is rejected even though
  // the interval itself is well-formed.
  it('R01 past time: start before now is rejected (AC1)', () => {
    expect(canBook({ start: 400, end: 500, now: NOW, blocked: false, bookings: defaultBookings() })).toBe(false);
  });

  // AC1 requires start < end. When start=800 and end=780 the interval is
  // reversed, so the request is rejected regardless of other conditions.
  it('R02 reversed interval: start > end is rejected (AC1)', () => {
    expect(canBook({ start: 800, end: 780, now: NOW, blocked: false, bookings: defaultBookings() })).toBe(false);
  });

  // AC2 rejects any booking strictly longer than 120 minutes. A 121-minute
  // slot (800→921) is one minute over the limit and must be unavailable.
  it('R03 121-minute duration is rejected (AC2)', () => {
    expect(canBook({ start: 800, end: 921, now: NOW, blocked: false, bookings: defaultBookings() })).toBe(false);
  });

  // AC3 rejects every request when the room is blocked, even if the time
  // slot would otherwise be valid and free of overlaps.
  it('R04 blocked room is always unavailable (AC3)', () => {
    expect(canBook({ start: 800, end: 860, now: NOW, blocked: true, bookings: defaultBookings() })).toBe(false);
  });

  // AC4 rejects intervals that overlap an existing booking. 610–620 sits
  // inside the default 600–660 booking, so the overlap check fires.
  it('R05 overlap with existing booking is rejected (AC4)', () => {
    expect(canBook({ start: 610, end: 620, now: NOW, blocked: false, bookings: defaultBookings() })).toBe(false);
  });

  // AC4 explicitly allows touching endpoints. 660–700 starts exactly when
  // the default 600–660 booking ends, so there is no overlap and the slot
  // is available.
  it('R06 touching endpoints are allowed (AC4)', () => {
    expect(canBook({ start: 660, end: 700, now: NOW, blocked: false, bookings: defaultBookings() })).toBe(true);
  });

  // AC5 requires that bookings are never modified. The shared fixture array
  // is frozen (Object.isFrozen) and its JSON snapshot is identical before
  // and after an evaluation that uses a copy of it.
  it('R07 DEFAULT_BOOKINGS is frozen and unchanged after evaluation (AC5)', () => {
    const snapshot = JSON.stringify(DEFAULT_BOOKINGS);
    expect(Object.isFrozen(DEFAULT_BOOKINGS)).toBe(true);
    canBook({ start: 660, end: 720, now: NOW, blocked: false, bookings: [...DEFAULT_BOOKINGS] });
    expect(JSON.stringify(DEFAULT_BOOKINGS)).toBe(snapshot);
  });

  // R3 (AC5): every booking object in the fixture must be frozen, not only the array.
  it('R08 every DEFAULT_BOOKINGS item is frozen and immutable (AC5)', () => {
    for (const b of DEFAULT_BOOKINGS) {
      expect(Object.isFrozen(b)).toBe(true);
    }
    const original = DEFAULT_BOOKINGS[0].label;
    let threw = false;
    try {
      (DEFAULT_BOOKINGS[0] as Booking).label = 'tampered';
    } catch {
      threw = true;
    }
    expect(threw || DEFAULT_BOOKINGS[0].label === original).toBe(true);
  });
  // R1 (AC1): a negative start must be rejected (0 <= start).
  it('R09 negative start is rejected (AC1)', () => {
    const outcome = evaluate(-10, 10, -100, false, []);
    expect(outcome.kind).toBe('unavailable');
  });
});
