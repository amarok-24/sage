import type { BrainDumpResponse } from '@sage/shared';
import { apiFetch } from './api';

export async function submitBrainDump(text: string): Promise<BrainDumpResponse> {
  const res = await apiFetch('/braindump', {
    method: 'POST',
    body: JSON.stringify({ text, timestamp: new Date().toISOString() }),
  });

  if (!res.ok) {
    throw new Error('Failed to process braindump');
  }

  const { parsed_data } = await res.json();
  return parsed_data;
}
