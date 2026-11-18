import type { Booking, Minutes } from './booking';

export const NOW: Minutes = 540;

const toHHMM = (mins: Minutes): string =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export const NOW_LABEL = toHHMM(NOW);

export const ROOM = 'Room 204';

export const DEFAULT_BOOKINGS: readonly Booking[] = Object.freeze([
  Object.freeze({ start: 600, end: 660, label: '10:00 – 11:00' }),
]);
