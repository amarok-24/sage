import type { BrainDumpResponse } from '@sage/shared';

/**
 * A brain dump is processed synchronously against the LLM agent, so the client
 * shows an optimistic placeholder the instant it's submitted rather than
 * blocking the input until the round trip completes.
 */
export type FeedItem =
  | { status: 'pending'; id: string; raw_text: string }
  | { status: 'error'; id: string; raw_text: string; errorMessage: string }
  | { status: 'done'; id: string; data: BrainDumpResponse };
