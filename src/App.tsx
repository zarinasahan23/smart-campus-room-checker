import { useMemo, useRef, useState } from 'react';
import { Clock, DoorOpen, ShieldAlert, CheckCircle2, XCircle, CalendarClock, Sparkles } from 'lucide-react';
import { evaluateDetailed, MAX_DURATION, type Booking, type Minutes, type Outcome } from './booking';
import { NOW, NOW_LABEL, ROOM, DEFAULT_BOOKINGS } from './fixtures';
import { MockLLMAdapter } from './llm/mockAdapter';
import { explainAvailability, explanationKey } from './llm/explain';

const toMinutes = (hhmm: string, allowEndOfDay = false): Minutes | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (allowEndOfDay && h === 24 && min === 0) return 1440;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
};

const formatHHMM = (m: Minutes): string =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const mockAdapter = new MockLLMAdapter();

export default function App() {
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [bookings] = useState<Booking[]>([...DEFAULT_BOOKINGS]);
  const [submitted, setSubmitted] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationKeyState, setExplanationKeyState] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explaining, setExplaining] = useState(false);

  const parsedStart = useMemo(() => toMinutes(startInput), [startInput]);
  const parsedEnd = useMemo(() => toMinutes(endInput, true), [endInput]);

  const currentKey = useMemo(
    () => explanationKey(parsedStart, parsedEnd, blocked),
    [parsedStart, parsedEnd, blocked]
  );
  const currentKeyRef = useRef(currentKey);
  currentKeyRef.current = currentKey;

  const explanationMatches = showExplanation && explanationKeyState === currentKey;

  const result = useMemo(() => {
    if (parsedStart === null || parsedEnd === null) return null;
    return evaluateDetailed(parsedStart, parsedEnd, NOW, blocked, bookings);
  }, [parsedStart, parsedEnd, blocked, bookings]);

  const inputError =
    submitted && (parsedStart === null || parsedEnd === null)
      ? 'Please enter both times as HH:MM (for example 09:30).'
      : null;

  const handleCheck = () => {
    setSubmitted(true);
    setExplanation(null);
    setExplanationKeyState(null);
    setShowExplanation(false);
  };

  const handleReset = () => {
    setStartInput('');
    setEndInput('');
    setSubmitted(false);
    setExplanation(null);
    setExplanationKeyState(null);
    setShowExplanation(false);
  };

  const handleExplain = async () => {
    if (result === null || parsedStart === null || parsedEnd === null) return;
    const key = explanationKey(parsedStart, parsedEnd, blocked);
    setExplaining(true);
    const output = await explainAvailability(
      {
        roomLabel: ROOM,
        start: formatHHMM(parsedStart),
        end: formatHHMM(parsedEnd),
        isAvailable: result.kind === 'available',
        reasonCode: result.reasonCode,
      },
      mockAdapter
    );
    if (currentKeyRef.current !== key) {
      setExplaining(false);
      return;
    }
    setExplanation(output.explanation);
    setExplanationKeyState(key);
    setShowExplanation(true);
    setExplaining(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 sm:max-w-lg sm:py-12">
        <Header />

        <main className="mt-6 flex flex-col gap-5">
          <RoomStatusCard blocked={blocked} bookings={bookings} />

          <section
            aria-label="Check availability"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-900">Check a time slot</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter times in 24-hour HH:MM format. The maximum slot length is {MAX_DURATION} minutes.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <TimeField
                label="Start time"
                value={startInput}
                onChange={setStartInput}
                placeholder="09:30"
              />
              <TimeField
                label="End time"
                value={endInput}
                onChange={setEndInput}
                placeholder="10:30"
              />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-slate-900">Room blocked (demo)</p>
                  <p className="text-xs text-slate-500">Forces every request to be unavailable.</p>
                </div>
              </div>
              <Toggle checked={blocked} onChange={setBlocked} label="Room blocked" />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleCheck}
                className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:scale-[0.99]"
              >
                Check availability
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Reset
              </button>
            </div>

            {inputError && (
              <p className="mt-3 text-sm text-rose-600" role="alert">
                {inputError}
              </p>
            )}

            {submitted && result && <ResultPanel outcome={result} startInput={startInput} endInput={endInput} />}

            {submitted && result && !explanationMatches && (
              <button
                type="button"
                onClick={handleExplain}
                disabled={explaining}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {explaining ? 'Generating…' : 'Explain availability'}
              </button>
            )}

            {submitted && explanationMatches && explanation && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  AI-generated explanation (mock) – not a booking decision
                </p>
                <p className="mt-2 text-sm text-slate-700">{explanation}</p>
              </div>
            )}
          </section>

          <ExistingBookings bookings={bookings} />
        </main>

        <footer className="mt-8 text-center text-xs text-slate-400">
          Demo only. No bookings are created or modified.
        </footer>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
        <DoorOpen className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <h1 className="text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
          Smart Campus Room Availability
        </h1>
        <p className="text-sm text-slate-500">{ROOM} · current time {NOW_LABEL}</p>
      </div>
    </header>
  );
}

function RoomStatusCard({ blocked, bookings }: { blocked: boolean; bookings: Booking[] }) {
  const next = bookings[0];
  return (
    <section
      aria-label="Room status"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-slate-400" aria-hidden />
          <span className="text-sm font-medium text-slate-700">{ROOM}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            blocked
              ? 'bg-rose-50 text-rose-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${blocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          {blocked ? 'Blocked' : 'Open'}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        {blocked
          ? 'This room is currently blocked. All availability checks will return unavailable.'
          : next
            ? `Next existing booking: ${next.label}.`
            : 'No existing bookings today.'}
      </p>
    </section>
  );
}

function TimeField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="relative">
        <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-rose-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function ResultPanel({
  outcome,
  startInput,
  endInput,
}: {
  outcome: Outcome;
  startInput: string;
  endInput: string;
}) {
  const available = outcome.kind === 'available';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-5 rounded-2xl border p-5 transition ${
        available
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-rose-200 bg-rose-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {available ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" aria-hidden />
        )}
        <div className="min-w-0">
          <p
            className={`text-base font-bold ${
              available ? 'text-emerald-800' : 'text-rose-800'
            }`}
          >
            {available ? 'Available' : 'Unavailable'}
          </p>
          <p
            className={`mt-1 text-sm ${
              available ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {available
              ? `${ROOM} is free for ${startInput} – ${endInput}. This is a check only — no booking has been made.`
              : outcome.reason}
          </p>
        </div>
      </div>
    </div>
  );
}

function ExistingBookings({ bookings }: { bookings: Booking[] }) {
  return (
    <section
      aria-label="Existing bookings"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-slate-900">Existing bookings today</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">None.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {bookings.map((b, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-slate-800">{b.label}</span>
              <span className="text-xs text-slate-500">{b.end - b.start} min</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
