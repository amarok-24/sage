import { Entry } from '../../models/Entry';
import { runSpecialist } from '../../services/agent.service';

export async function journalEnrich(data: { entryId: string }): Promise<void> {
  const entry = await Entry.findById(data.entryId);
  if (!entry || entry.type !== 'journal') return;

  const result = await runSpecialist('journal_enricher', String(entry.userId), {
    raw_text: entry.raw_text,
  });

  entry.enrichment = { ...entry.enrichment, journal_enrichment: result };
  await entry.save();
}
