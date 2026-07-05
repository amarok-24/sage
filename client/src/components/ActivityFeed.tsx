import type { BrainDumpResponse } from '@bodhi/shared';
import { 
  Utensils, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  Moon, 
  HeartPulse, 
  BookOpen 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ActivityFeedProps {
  entries: BrainDumpResponse[];
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-bodhi-brown-400 font-serif italic">
        Your garden is quiet. Plant a seed above.
      </div>
    );
  }

  // Flatten the entries so we can display individual cards for each parsed item
  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
      {entries.map((entry, idx) => (
        <div key={entry.parsed_at || idx} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
          {/* Group header (original text) */}
          <div className="px-4 text-sm text-bodhi-brown-500 italic border-l-2 border-bodhi-green-200">
            "{entry.raw_text}"
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Habits */}
            {entry.habits_completed?.map((h, i) => (
              <Card key={`habit-${i}`} icon={<CheckCircle2 className="w-5 h-5 text-bodhi-green-600" />} title="Habit Logged">
                <p className="text-sm font-medium">{h.habit_name}</p>
                <p className="text-xs text-bodhi-brown-500">"{h.matched_phrase}"</p>
              </Card>
            ))}

            {/* Expenses */}
            {entry.expenses?.map((e, i) => (
              <Card key={`exp-${i}`} icon={<Wallet className="w-5 h-5 text-amber-600" />} title="Expense">
                <p className="text-sm font-medium">{e.currency} {e.amount}</p>
                <p className="text-xs text-bodhi-brown-500">{e.category} • {e.merchant_inferred}</p>
              </Card>
            ))}

            {/* Nutrition */}
            {entry.nutrition?.map((n, i) => (
              <Card key={`nut-${i}`} icon={<Utensils className="w-5 h-5 text-orange-600" />} title="Nutrition">
                <p className="text-sm font-medium">{n.total_calories} kcal</p>
                <p className="text-xs text-bodhi-brown-500">
                  {n.total_protein_g}g P • {n.total_carbs_g}g C • {n.total_fat_g}g F
                </p>
                <p className="text-xs text-bodhi-brown-400 mt-1">{n.food_items.map(f => f.name).join(', ')}</p>
              </Card>
            ))}

            {/* Time Logs */}
            {entry.time_logs?.map((t, i) => (
              <Card key={`time-${i}`} icon={<Clock className="w-5 h-5 text-blue-600" />} title="Time Log">
                <p className="text-sm font-medium">{t.duration_minutes} mins</p>
                <p className="text-xs text-bodhi-brown-500">{t.activity_category}</p>
              </Card>
            ))}

            {/* Sleep */}
            {entry.sleep && (
              <Card icon={<Moon className="w-5 h-5 text-indigo-600" />} title="Sleep">
                <p className="text-sm font-medium">{entry.sleep.duration_hours} hrs</p>
                <p className="text-xs text-bodhi-brown-500">Quality: {entry.sleep.quality}</p>
              </Card>
            )}

            {/* Somatic */}
            {(entry.somatic_logs || []).map((s, i) => (
              <Card key={`som-${i}`} icon={<HeartPulse className="w-5 h-5 text-red-600" />} title="Somatic Log">
                <p className="text-sm font-medium">{s.symptom}</p>
                <p className="text-xs text-bodhi-brown-500">Severity: {s.severity}/10</p>
              </Card>
            ))}

            {/* Journal */}
            {entry.journal && (
              <Card icon={<BookOpen className="w-5 h-5 text-bodhi-brown-600" />} title="Journal" className="md:col-span-2">
                <p className="text-sm font-serif italic text-bodhi-brown-800">"{entry.journal.summary_snippet}"</p>
                <div className="flex gap-2 mt-2">
                  {entry.journal.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-bodhi-brown-100 text-bodhi-brown-700 rounded-full text-xs">
                      #{t}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 bg-bodhi-green-100 text-bodhi-green-700 rounded-full text-xs">
                    Mood: {entry.journal.mood_score}/10
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ icon, title, children, className }: { icon: React.ReactNode, title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("bg-white p-4 rounded-2xl shadow-sm border border-bodhi-brown-50 flex gap-3 items-start", className)}>
      <div className="p-2 bg-bodhi-brown-50 rounded-xl">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-semibold text-bodhi-brown-400 uppercase tracking-wider mb-1">{title}</h4>
        {children}
      </div>
    </div>
  );
}
