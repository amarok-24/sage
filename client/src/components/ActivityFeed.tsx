import type { FeedItem } from '../lib/feed';
import {
  Utensils,
  Wallet,
  Clock,
  CheckCircle2,
  Moon,
  HeartPulse,
  BookOpen,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ActivityFeedProps {
  items: FeedItem[];
  onRetry: (id: string) => void;
  isLoading?: boolean;
}

export function ActivityFeed({ items, onRetry, isLoading }: ActivityFeedProps) {
  if (items.length === 0) {
    if (isLoading) return null; // avoid flashing the welcome state while today's history is still loading
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-serif text-sage-brown-900">Welcome to Sage. What's on your mind?</h2>
          <p className="text-sage-brown-500 max-w-md mx-auto leading-relaxed">
            Sage uses AI to automatically categorize your brain dumps. Try typing a freeform log below—here are some examples of what you can track:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card icon={<CheckCircle2 className="w-5 h-5 text-sage-green-600" />} title="Habits & Time">
            <p className="text-sm font-serif italic text-sage-brown-700">"I ran for 30 minutes and read 10 pages of my book."</p>
          </Card>

          <Card icon={<Utensils className="w-5 h-5 text-orange-600" />} title="Nutrition">
            <p className="text-sm font-serif italic text-sage-brown-700">"For lunch, I had a chicken salad with olive oil dressing."</p>
          </Card>

          <Card icon={<Wallet className="w-5 h-5 text-amber-600" />} title="Expenses">
            <p className="text-sm font-serif italic text-sage-brown-700">"Spent $45 on groceries at Trader Joe's."</p>
          </Card>

          <Card icon={<HeartPulse className="w-5 h-5 text-red-600" />} title="Mood & Sleep">
            <p className="text-sm font-serif italic text-sage-brown-700">"Slept 7 hours but feeling a bit anxious today. Mood is 6/10."</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
      {items.map((item) => (
        <div key={item.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
          <div className="px-4 text-sm text-sage-brown-500 italic border-l-2 border-sage-green-200">
            "{item.status === 'done' ? item.data.raw_text : item.raw_text}"
          </div>

          {item.status === 'pending' && (
            <div className="flex items-center gap-3 px-4 py-3 bg-sage-brown-50/60 rounded-2xl text-sage-brown-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sage is reading this one...</span>
            </div>
          )}

          {item.status === 'error' && (
            <button
              onClick={() => onRetry(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm hover:bg-red-100 transition-colors text-left"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.errorMessage}</span>
              <span className="flex items-center gap-1 font-medium shrink-0">
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </span>
            </button>
          )}

          {item.status === 'done' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {item.data.habits_completed?.map((h, i) => (
                <Card key={`habit-${i}`} icon={<CheckCircle2 className="w-5 h-5 text-sage-green-600" />} title="Habit Logged">
                  <p className="text-sm font-medium">{h.habit_name}</p>
                  {h.matched_phrase && <p className="text-xs text-sage-brown-500">"{h.matched_phrase}"</p>}
                </Card>
              ))}

              {item.data.expenses?.map((e, i) => (
                <Card key={`exp-${i}`} icon={<Wallet className="w-5 h-5 text-amber-600" />} title="Expense">
                  <p className="text-sm font-medium">{e.currency} {e.amount}</p>
                  <p className="text-xs text-sage-brown-500">{e.category} • {e.merchant_inferred}</p>
                </Card>
              ))}

              {item.data.nutrition?.map((n, i) => (
                <Card key={`nut-${i}`} icon={<Utensils className="w-5 h-5 text-orange-600" />} title="Nutrition">
                  <p className="text-sm font-medium">{n.total_calories} kcal</p>
                  <p className="text-xs text-sage-brown-500">
                    {n.total_protein_g}g P • {n.total_carbs_g}g C • {n.total_fat_g}g F
                  </p>
                  <p className="text-xs text-sage-brown-400 mt-1">{n.food_items.map(f => f.name).join(', ')}</p>
                </Card>
              ))}

              {item.data.time_logs?.map((t, i) => (
                <Card key={`time-${i}`} icon={<Clock className="w-5 h-5 text-blue-600" />} title="Time Log">
                  <p className="text-sm font-medium">{t.duration_minutes} mins</p>
                  <p className="text-xs text-sage-brown-500">{t.activity_category}</p>
                </Card>
              ))}

              {item.data.sleep && (
                <Card icon={<Moon className="w-5 h-5 text-indigo-600" />} title="Sleep">
                  <p className="text-sm font-medium">{item.data.sleep.duration_hours} hrs</p>
                  <p className="text-xs text-sage-brown-500">Quality: {item.data.sleep.quality}</p>
                </Card>
              )}

              {(item.data.somatic_logs || []).map((s, i) => (
                <Card key={`som-${i}`} icon={<HeartPulse className="w-5 h-5 text-red-600" />} title="Somatic Log">
                  <p className="text-sm font-medium">{s.symptom}</p>
                  <p className="text-xs text-sage-brown-500">Severity: {s.severity}/10</p>
                </Card>
              ))}

              {item.data.journal && (
                <Card icon={<BookOpen className="w-5 h-5 text-sage-brown-600" />} title="Journal" className="md:col-span-2">
                  <p className="text-sm font-serif italic text-sage-brown-800">"{item.data.journal.summary_snippet}"</p>
                  <div className="flex gap-2 mt-2">
                    {item.data.journal.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-sage-brown-100 text-sage-brown-700 rounded-full text-xs">
                        #{t}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 bg-sage-green-100 text-sage-green-700 rounded-full text-xs">
                      Mood: {item.data.journal.mood_score}/10
                    </span>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Card({ icon, title, children, className }: { icon: React.ReactNode, title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("bg-white p-4 rounded-2xl shadow-sm border border-sage-brown-50 flex gap-3 items-start", className)}>
      <div className="p-2 bg-sage-brown-50 rounded-xl">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-semibold text-sage-brown-400 uppercase tracking-wider mb-1">{title}</h4>
        {children}
      </div>
    </div>
  );
}
