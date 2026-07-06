import { BrainDumpResponseSchema } from '@sage/shared';
import logger from '../utils/logger';

const ADK_AGENT_URL = process.env.ADK_AGENT_URL ?? 'http://localhost:8001';

export async function processBrainDump(userId: string, text: string) {
  try {
    const response = await fetch(`${ADK_AGENT_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, text }),
      signal: AbortSignal.timeout(30_000),   // 30s hard timeout
    });

    if (!response.ok) {
      throw new Error(`Agent service error: ${response.status}`);
    }

    // Validate agent output before trusting it
    const data = await response.json();
    return BrainDumpResponseSchema.parse(data);
  } catch (error) {
    logger.error("Error calling agent service:", error);
    throw error;
  }
}
