import { useEffect, useState } from 'react';
import type {
  WeeklyInsight,
  SleepAnalysis,
  SomaticCorrelation,
  ExpenseAnalysis,
  TimeAnalysis,
} from '@sage/shared';
import { Sparkles, Moon, HeartPulse, Wallet, Clock } from 'lucide-react';
import { apiFetch } from '../lib/api';

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
export function InsightsPanel() {
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

  // Most recent enrichment of each kind, so e.g. a day with five expenses doesn't spam the panel.
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
    <div className="w-full max-w-2xl mx-auto space-y-4 mb-8">
      {weeklyInsight && (
        <div className="bg-gradient-to-br from-sage-green-50 to-white p-5 rounded-2xl border border-sage-green-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-sage-green-600" />
            <h3 className="text-xs font-semibold text-sage-green-700 uppercase tracking-wider">This Week's Insight</h3>
          </div>
          <p className="font-serif text-lg text-sage-brown-900 mb-3">{weeklyInsight.data.top_insight}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-sage-brown-400 uppercase tracking-wider mb-1">Celebrate</p>
              <p className="text-sage-brown-700">{weeklyInsight.data.celebration}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-sage-brown-400 uppercase tracking-wider mb-1">Growth Area</p>
              <p className="text-sage-brown-700">{weeklyInsight.data.growth_area}</p>
            </div>
          </div>
          {weeklyInsight.data.supporting_data.length > 0 && (
            <ul className="mt-3 space-y-1">
              {weeklyInsight.data.supporting_data.map((d, i) => (
                <li key={i} className="text-xs text-sage-brown-500 flex gap-2">
                  <span>•</span><span>{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(sleep || somatic || expense || time) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sleep && (
            <EnrichmentCard icon={<Moon className="w-4 h-4 text-indigo-600" />} title="Sleep Pattern">
              <p className="text-sm text-sage-brown-700">{sleep.recommendation}</p>
            </EnrichmentCard>
          )}
          {somatic && (
            <EnrichmentCard icon={<HeartPulse className="w-4 h-4 text-red-600" />} title="Symptom Pattern">
              <p className="text-sm text-sage-brown-700">{somatic.suggestion}</p>
            </EnrichmentCard>
          )}
          {expense && (
            <EnrichmentCard icon={<Wallet className="w-4 h-4 text-amber-600" />} title="Spending Pattern">
              <p className="text-sm text-sage-brown-700">{expense.insight}</p>
            </EnrichmentCard>
          )}
          {time && (
            <EnrichmentCard icon={<Clock className="w-4 h-4 text-blue-600" />} title="Time Pattern">
              <p className="text-sm text-sage-brown-700">{time.optimization_tip}</p>
            </EnrichmentCard>
          )}
        </div>
      )}
    </div>
  );
}

function EnrichmentCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-sage-brown-50 flex gap-3 items-start">
      <div className="p-2 bg-sage-brown-50 rounded-xl">{icon}</div>
      <div>
        <h4 className="text-xs font-semibold text-sage-brown-400 uppercase tracking-wider mb-1">{title}</h4>
        {children}
      </div>
    </div>
  );
}
