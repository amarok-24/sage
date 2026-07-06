import { BrainDumpResponseSchema, SPECIALIST_SCHEMAS, SpecialistName } from '@sage/shared';
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

type SpecialistResult<T extends SpecialistName> = ReturnType<(typeof SPECIALIST_SCHEMAS)[T]['parse']>;

export async function runSpecialist<T extends SpecialistName>(
  name: T,
  userId: string,
  context: object
): Promise<SpecialistResult<T>> {
  try {
    const response = await fetch(`${ADK_AGENT_URL}/specialists/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, context }),
      signal: AbortSignal.timeout(30_000),   // 30s hard timeout
    });

    if (!response.ok) {
      throw new Error(`Specialist agent error (${name}): ${response.status}`);
    }

    // Validate specialist output before trusting it
    const data = await response.json();
    return SPECIALIST_SCHEMAS[name].parse(data) as SpecialistResult<T>;
  } catch (error) {
    logger.error(`Error calling specialist agent (${name}):`, error);
    throw error;
  }
}
