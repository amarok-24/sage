import { useEffect, useState } from 'react';
import type {
  WeeklyInsight,
  SleepAnalysis,
  SomaticCorrelation,
  ExpenseAnalysis,
  TimeAnalysis,
} from '@sage/shared';
import { motion } from 'framer-motion';
import { Sparkles, Moon, HeartPulse, Wallet, Clock } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface RecentEnrichment {
  entryId: string;
  type: string;
  date: string;
  enrichment: {
    sleep_analysis?: SleepAnalysis;
    somatic_correlation?: SomaticCorrelation;
    expense_analysis?: ExpenseAnalysis;
    time_analysis?: TimeAnalysis;
    [key: string]: unknown;
  };
}

interface InsightsResponse {
  weeklyInsight: { date: string; data: WeeklyInsight } | null;
  recentEnrichments: RecentEnrichment[];
}

/**
 * Surfaces the cross-pillar analysis BullMQ specialist workers already compute
 * (weekly synthesis, sleep/expense/time/somatic correlations) but that never
 * appears anywhere in the UI otherwise — it's only ever attached to entries
 * after the synchronous braindump response has already rendered.
 */
export function NovaInsightsPanel() {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/dashboard/insights')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled) setInsights(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!insights) return null;

  const { weeklyInsight, recentEnrichments } = insights;

  const latestByKind = new Map<string, RecentEnrichment>();
  for (const e of recentEnrichments) {
    for (const kind of Object.keys(e.enrichment || {})) {
      if (!latestByKind.has(kind)) latestByKind.set(kind, e);
    }
  }

  if (!weeklyInsight && latestByKind.size === 0) return null;

  const sleep = latestByKind.get('sleep_analysis')?.enrichment.sleep_analysis;
  const somatic = latestByKind.get('somatic_correlation')?.enrichment.somatic_correlation;
  const expense = latestByKind.get('expense_analysis')?.enrichment.expense_analysis;
  const time = latestByKind.get('time_analysis')?.enrichment.time_analysis;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full mt-8 space-y-4"
    >
      {weeklyInsight && (
        <div className="relative w-full">
          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-[var(--nova-violet)] to-[var(--nova-cyan)] opacity-10 blur-xl" />
          <div className="relative p-5 rounded-[2rem] backdrop-blur-xl bg-[var(--nova-surface)]/60 border border-[var(--nova-border)]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[var(--nova-violet)]" />
              <h3 className="text-xs font-semibold text-[var(--nova-text-muted)] uppercase tracking-wider">This Week&apos;s Insight</h3>
            </div>
            <p className="font-nova text-lg text-[var(--nova-text-primary)] mb-3">{weeklyInsight.data.top_insight}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-[var(--nova-text-muted)] uppercase tracking-wider mb-1">Celebrate</p>
                <p className="text-[var(--nova-text-primary)]">{weeklyInsight.data.celebration}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--nova-text-muted)] uppercase tracking-wider mb-1">Growth Area</p>
                <p className="text-[var(--nova-text-primary)]">{weeklyInsight.data.growth_area}</p>
              </div>
            </div>
            {weeklyInsight.data.supporting_data.length > 0 && (
              <ul className="mt-3 space-y-1">
                {weeklyInsight.data.supporting_data.map((d, i) => (
                  <li key={i} className="text-xs text-[var(--nova-text-muted)] flex gap-2">
                    <span>•</span><span>{d}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {(sleep || somatic || expense || time) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sleep && (
            <EnrichmentCard icon={<Moon className="w-4 h-4 text-[var(--nova-violet)]" />} title="Sleep Pattern">
              <p className="text-sm text-[var(--nova-text-primary)]">{sleep.recommendation}</p>
            </EnrichmentCard>
          )}
          {somatic && (
            <EnrichmentCard icon={<HeartPulse className="w-4 h-4 text-red-400" />} title="Symptom Pattern">
              <p className="text-sm text-[var(--nova-text-primary)]">{somatic.suggestion}</p>
            </EnrichmentCard>
          )}
          {expense && (
            <EnrichmentCard icon={<Wallet className="w-4 h-4 text-amber-400" />} title="Spending Pattern">
              <p className="text-sm text-[var(--nova-text-primary)]">{expense.insight}</p>
            </EnrichmentCard>
          )}
          {time && (
            <EnrichmentCard icon={<Clock className="w-4 h-4 text-[var(--nova-cyan)]" />} title="Time Pattern">
              <p className="text-sm text-[var(--nova-text-primary)]">{time.optimization_tip}</p>
            </EnrichmentCard>
          )}
        </div>
      )}
    </motion.div>
  );
}

function EnrichmentCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--nova-surface)]/60 backdrop-blur-xl p-4 rounded-2xl border border-[var(--nova-border)] flex gap-3 items-start">
      <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--nova-violet)]/20 to-[var(--nova-cyan)]/20">{icon}</div>
      <div>
        <h4 className="text-xs font-semibold text-[var(--nova-text-muted)] uppercase tracking-wider mb-1">{title}</h4>
        {children}
      </div>
    </div>
  );
}
