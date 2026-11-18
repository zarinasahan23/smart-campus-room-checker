import type { ReasonCode } from '../booking';

export interface ExplainInput {
  roomLabel: string;
  start: string;
  end: string;
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

export interface ExplainOutput {
  explanation: string;
  source?: 'mock' | 'fallback';
}

export interface LLMAdapter {
  readonly label: string;
  explain(input: ExplainInput): Promise<ExplainOutput>;
}

const HHMM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
const END_HHMM_RE = /^([01]?\d|2[0-3]):[0-5]\d$|^24:00$/;

export function validateInput(input: ExplainInput): string[] {
  const errors: string[] = [];
  if (!input.roomLabel || input.roomLabel.trim().length === 0) {
    errors.push('roomLabel is empty');
  } else if (input.roomLabel.length > 40) {
    errors.push('roomLabel exceeds 40 characters');
  }
  if (!input.start || !HHMM_RE.test(input.start)) {
    errors.push('start is not valid HH:MM');
  }
  if (!input.end || !END_HHMM_RE.test(input.end)) {
    errors.push('end is not valid HH:MM');
  }
  return errors;
}

export function validateOutput(output: ExplainOutput, isAvailable: boolean): string[] {
  const errors: string[] = [];
  const text = output?.explanation;
  if (!text || text.trim().length === 0) {
    errors.push('explanation is empty');
    return errors;
  }
  if (text.length > 300) {
    errors.push('explanation exceeds 300 characters');
  }
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 2) {
    errors.push('explanation has more than 2 sentences');
  }
  const lower = text.toLowerCase();
  const saysUnavailable = lower.includes('unavailable') || lower.includes('not available');
  const saysAvailable = lower.includes('available') && !saysUnavailable;
  if (isAvailable && saysUnavailable) {
    errors.push('explanation contradicts available status');
  }
  if (!isAvailable && saysAvailable) {
    errors.push('explanation contradicts unavailable status');
  }
  return errors;
}
