import type { ExplainInput, ExplainOutput, LLMAdapter } from './contract';

export interface MockAdapterOptions {
  simulateFailure?: boolean;
  simulateDelayMs?: number;
}

const UNAVAILABLE_REASONS: Record<string, string> = {
  BLOCKED: 'the room is currently blocked.',
  NEGATIVE_START: 'the start time is before 00:00.',
  INVALID_RANGE: 'the end time is not later than the start time.',
  PAST_TIME: 'the start time is not after the current time.',
  OUT_OF_DAY: 'the end time goes past 24:00.',
  TOO_LONG: 'the requested slot exceeds the 120-minute maximum.',
  OVERLAP: 'the slot overlaps an existing booking.',
  AVAILABLE: 'the slot is available.',
};

function buildExplanation(input: ExplainInput): string {
  const { roomLabel, start, end, isAvailable, reasonCode } = input;
  if (isAvailable) {
    return `${roomLabel} is available from ${start} to ${end}. The slot meets all booking rules.`;
  }
  const detail = UNAVAILABLE_REASONS[reasonCode] ?? 'the request does not meet the booking rules.';
  return `${roomLabel} is unavailable from ${start} to ${end} because ${detail}`;
}

export class MockLLMAdapter implements LLMAdapter {
  readonly label = 'MOCK';
  private readonly simulateFailure: boolean;
  private readonly simulateDelayMs: number;

  constructor(options: MockAdapterOptions = {}) {
    this.simulateFailure = options.simulateFailure ?? false;
    this.simulateDelayMs = options.simulateDelayMs ?? 0;
  }

  async explain(input: ExplainInput): Promise<ExplainOutput> {
    if (this.simulateDelayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.simulateDelayMs));
    }
    if (this.simulateFailure) {
      throw new Error('Mock LLM adapter simulated failure');
    }
    return { explanation: buildExplanation(input), source: 'mock' };
  }
}
