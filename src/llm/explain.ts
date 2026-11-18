import type { ReasonCode } from '../booking';
import type { ExplainInput, ExplainOutput, LLMAdapter } from './contract';
import { validateInput, validateOutput } from './contract';

const FALLBACK_TEXTS: Record<ReasonCode, string> = {
  AVAILABLE: 'The slot is available and meets all booking rules.',
  BLOCKED: 'The room is blocked, so no booking is possible right now.',
  NEGATIVE_START: 'The start time is before 00:00, which is not allowed.',
  INVALID_RANGE: 'The end time must be later than the start time.',
  PAST_TIME: 'The start time must be after the current time.',
  OUT_OF_DAY: 'The end time cannot go past 24:00.',
  TOO_LONG: 'The requested slot exceeds the 120-minute maximum.',
  OVERLAP: 'The slot overlaps an existing booking.',
};

function fallback(reasonCode: ReasonCode): ExplainOutput {
  return { explanation: FALLBACK_TEXTS[reasonCode], source: 'fallback' };
}

export function explanationKey(
  start: number | null,
  end: number | null,
  blocked: boolean
): string {
  return `${start ?? 'null'}|${end ?? 'null'}|${blocked}`;
}

export async function explainAvailability(
  input: ExplainInput,
  adapter: LLMAdapter,
  timeoutMs = 3000
): Promise<ExplainOutput> {
  const inputErrors = validateInput(input);
  if (inputErrors.length > 0) {
    return fallback(input.reasonCode);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Explanation timed out')), timeoutMs);
    });
    const output = await Promise.race([adapter.explain(input), timeoutPromise]);
    const outputErrors = validateOutput(output, input.isAvailable);
    if (outputErrors.length > 0) {
      return fallback(input.reasonCode);
    }
    return output;
  } catch {
    return fallback(input.reasonCode);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
