import { describe, it, expect } from 'vitest';
import { explainAvailability, explanationKey } from './explain';
import { MockLLMAdapter } from './mockAdapter';
import type { LLMAdapter, ExplainInput, ExplainOutput } from './contract';
import { evaluate } from '../booking';
import { DEFAULT_BOOKINGS, NOW, ROOM } from '../fixtures';

const baseInput = (overrides: Partial<ExplainInput> = {}): ExplainInput => ({
  roomLabel: ROOM,
  start: '10:00',
  end: '11:00',
  isAvailable: true,
  reasonCode: 'AVAILABLE',
  ...overrides,
});

describe('explainAvailability', () => {
  it('available: returns a mock explanation consistent with the status', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(
      baseInput({ isAvailable: true, reasonCode: 'AVAILABLE' }),
      adapter
    );
    expect(output.source).toBe('mock');
    expect(output.explanation.length).toBeGreaterThan(0);
    expect(output.explanation.toLowerCase()).not.toContain('unavailable');
  });

  it('overlap: returns a mock explanation mentioning the overlap', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(
      baseInput({ isAvailable: false, reasonCode: 'OVERLAP', start: '10:30', end: '11:30' }),
      adapter
    );
    expect(output.source).toBe('mock');
    expect(output.explanation.toLowerCase()).toContain('overlap');
  });

  it('blocked: returns a mock explanation mentioning the block', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(
      baseInput({ isAvailable: false, reasonCode: 'BLOCKED' }),
      adapter
    );
    expect(output.source).toBe('mock');
    expect(output.explanation.toLowerCase()).toContain('block');
  });

  it('invalid range: returns a mock explanation for invalid range', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(
      baseInput({ isAvailable: false, reasonCode: 'INVALID_RANGE' }),
      adapter
    );
    expect(output.source).toBe('mock');
  });

  it('past time: returns a mock explanation for past time', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(
      baseInput({ isAvailable: false, reasonCode: 'PAST_TIME' }),
      adapter
    );
    expect(output.source).toBe('mock');
  });

  it('empty input: returns fallback', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(baseInput({ roomLabel: '' }), adapter);
    expect(output.source).toBe('fallback');
  });

  it('long input: returns fallback when roomLabel exceeds 40 chars', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(baseInput({ roomLabel: 'A'.repeat(41) }), adapter);
    expect(output.source).toBe('fallback');
  });

  it('timeout: returns fallback when adapter is too slow', async () => {
    const adapter = new MockLLMAdapter({ simulateDelayMs: 200 });
    const output = await explainAvailability(baseInput(), adapter, 10);
    expect(output.source).toBe('fallback');
  });

  it('simulated API failure: returns fallback', async () => {
    const adapter = new MockLLMAdapter({ simulateFailure: true });
    const output = await explainAvailability(baseInput(), adapter);
    expect(output.source).toBe('fallback');
  });

  it('output that contradicts the status: returns fallback', async () => {
    const contradictingAdapter: LLMAdapter = {
      label: 'MOCK',
      async explain(): Promise<ExplainOutput> {
        return { explanation: 'The room is available and ready to book.', source: 'mock' };
      },
    };
    const output = await explainAvailability(
      baseInput({ isAvailable: false, reasonCode: 'BLOCKED' }),
      contradictingAdapter
    );
    expect(output.source).toBe('fallback');
  });

  it('explaining never changes the evaluate result or DEFAULT_BOOKINGS', async () => {
    const adapter = new MockLLMAdapter();
    const snapshot = JSON.stringify(DEFAULT_BOOKINGS);
    const before = JSON.stringify(evaluate(660, 720, NOW, false, [...DEFAULT_BOOKINGS]));
    await explainAvailability(baseInput({ isAvailable: true, reasonCode: 'AVAILABLE' }), adapter);
    const after = JSON.stringify(evaluate(660, 720, NOW, false, [...DEFAULT_BOOKINGS]));
    expect(JSON.stringify(DEFAULT_BOOKINGS)).toBe(snapshot);
    expect(Object.isFrozen(DEFAULT_BOOKINGS)).toBe(true);
    expect(before).toBe(after);
  });

  it('explanationKey differs when blocked changes and when start or end changes, and is equal for equal inputs', () => {
    const base = explanationKey(660, 720, false);
    expect(explanationKey(660, 720, false)).toBe(base);
    expect(explanationKey(660, 720, true)).not.toBe(base);
    expect(explanationKey(600, 720, false)).not.toBe(base);
    expect(explanationKey(660, 780, false)).not.toBe(base);
    expect(explanationKey(null, 720, false)).not.toBe(base);
    expect(explanationKey(660, null, false)).not.toBe(base);
  });

  it('end "24:00" with isAvailable true returns source "mock"', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(
      baseInput({ start: '23:00', end: '24:00', isAvailable: true, reasonCode: 'AVAILABLE' }),
      adapter
    );
    expect(output.source).toBe('mock');
  });

  it('start "24:00" returns source "fallback"', async () => {
    const adapter = new MockLLMAdapter();
    const output = await explainAvailability(
      baseInput({ start: '24:00', end: '24:00', isAvailable: true, reasonCode: 'AVAILABLE' }),
      adapter
    );
    expect(output.source).toBe('fallback');
  });
});
