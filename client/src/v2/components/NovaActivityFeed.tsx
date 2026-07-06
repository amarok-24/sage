import type { FeedItem } from '../../lib/feed';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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
import { cn } from '../../lib/utils';

interface NovaActivityFeedProps {
  items: FeedItem[];
  onRetry: (id: string) => void;
  isLoading?: boolean;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' },
  }),
};

export function NovaActivityFeed({ items, onRetry, isLoading }: NovaActivityFeedProps) {
  if (items.length === 0) {
    if (isLoading) return null; // avoid flashing the welcome state while today's history is still loading
    return (
      <div className="w-full mt-8 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-xl sm:text-2xl font-nova font-medium text-[var(--nova-text-primary)]">
            Welcome to Sage. What&apos;s on your mind?
          </h2>
          <p className="text-[var(--nova-text-muted)] max-w-md mx-auto leading-relaxed">
            Sage uses AI to automatically categorize your brain dumps. Try typing a freeform log below&mdash;here are some examples of what you can track:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card icon={<CheckCircle2 className="w-5 h-5 text-[var(--nova-violet)]" />} title="Habits & Time">
            <p className="text-sm font-nova italic text-[var(--nova-text-primary)]">&quot;I ran for 30 minutes and read 10 pages of my book.&quot;</p>
          </Card>

          <Card icon={<Utensils className="w-5 h-5 text-orange-400" />} title="Nutrition">
            <p className="text-sm font-nova italic text-[var(--nova-text-primary)]">&quot;For lunch, I had a chicken salad with olive oil dressing.&quot;</p>
          </Card>

          <Card icon={<Wallet className="w-5 h-5 text-amber-400" />} title="Expenses">
            <p className="text-sm font-nova italic text-[var(--nova-text-primary)]">&quot;Spent $45 on groceries at Trader Joe&apos;s.&quot;</p>
          </Card>

          <Card icon={<HeartPulse className="w-5 h-5 text-red-400" />} title="Mood & Sleep">
            <p className="text-sm font-nova italic text-[var(--nova-text-primary)]">&quot;Slept 7 hours but feeling a bit anxious today. Mood is 6/10.&quot;</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-8 space-y-6">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial="hidden"
            animate="visible"
            custom={0}
            variants={cardVariants}
            className="space-y-4"
          >
            <div className="px-4 text-sm text-[var(--nova-text-muted)] italic border-l-2 border-[var(--nova-violet)]/40">
              &quot;{item.status === 'done' ? item.data.raw_text : item.raw_text}&quot;
            </div>

            {item.status === 'pending' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--nova-surface)]/60 border border-[var(--nova-border)] text-[var(--nova-text-muted)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sage is reading this one...</span>
              </div>
            )}

            {item.status === 'error' && (
              <button
                onClick={() => onRetry(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm hover:bg-red-500/20 transition-colors text-left"
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
                  <Card key={`habit-${i}`} index={i} icon={<CheckCircle2 className="w-5 h-5 text-[var(--nova-violet)]" />} title="Habit Logged">
                    <p className="text-sm font-medium text-[var(--nova-text-primary)]">{h.habit_name}</p>
                    {h.matched_phrase && <p className="text-xs text-[var(--nova-text-muted)]">&quot;{h.matched_phrase}&quot;</p>}
                  </Card>
                ))}

                {item.data.expenses?.map((e, i) => (
                  <Card key={`exp-${i}`} index={i} icon={<Wallet className="w-5 h-5 text-amber-400" />} title="Expense">
                    <p className="text-sm font-medium text-[var(--nova-text-primary)]">{e.currency} {e.amount}</p>
                    <p className="text-xs text-[var(--nova-text-muted)]">{e.category} • {e.merchant_inferred}</p>
                  </Card>
                ))}

                {item.data.nutrition?.map((n, i) => (
                  <Card key={`nut-${i}`} index={i} icon={<Utensils className="w-5 h-5 text-orange-400" />} title="Nutrition">
                    <p className="text-sm font-medium text-[var(--nova-text-primary)]">{n.total_calories} kcal</p>
                    <p className="text-xs text-[var(--nova-text-muted)]">
                      {n.total_protein_g}g P • {n.total_carbs_g}g C • {n.total_fat_g}g F
                    </p>
                    <p className="text-xs text-[var(--nova-text-muted)] mt-1">{n.food_items.map(f => f.name).join(', ')}</p>
                  </Card>
                ))}

                {item.data.time_logs?.map((t, i) => (
                  <Card key={`time-${i}`} index={i} icon={<Clock className="w-5 h-5 text-[var(--nova-cyan)]" />} title="Time Log">
                    <p className="text-sm font-medium text-[var(--nova-text-primary)]">{t.duration_minutes} mins</p>
                    <p className="text-xs text-[var(--nova-text-muted)]">{t.activity_category}</p>
                  </Card>
                ))}

                {item.data.sleep && (
                  <Card icon={<Moon className="w-5 h-5 text-[var(--nova-violet)]" />} title="Sleep">
                    <p className="text-sm font-medium text-[var(--nova-text-primary)]">{item.data.sleep.duration_hours} hrs</p>
                    <p className="text-xs text-[var(--nova-text-muted)]">Quality: {item.data.sleep.quality}</p>
                  </Card>
                )}

                {(item.data.somatic_logs || []).map((s, i) => (
                  <Card key={`som-${i}`} index={i} icon={<HeartPulse className="w-5 h-5 text-red-400" />} title="Somatic Log">
                    <p className="text-sm font-medium text-[var(--nova-text-primary)]">{s.symptom}</p>
                    <p className="text-xs text-[var(--nova-text-muted)]">Severity: {s.severity}/10</p>
                  </Card>
                ))}

                {item.data.journal && (
                  <Card icon={<BookOpen className="w-5 h-5 text-[var(--nova-cyan)]" />} title="Journal" className="md:col-span-2">
                    <p className="text-sm font-nova italic text-[var(--nova-text-primary)]">&quot;{item.data.journal.summary_snippet}&quot;</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.data.journal.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-[var(--nova-surface)] border border-[var(--nova-border)] text-[var(--nova-text-muted)] rounded-full text-xs">
                          #{t}
                        </span>
                      ))}
                      <span className="px-2 py-0.5 bg-gradient-to-r from-[var(--nova-violet)]/20 to-[var(--nova-cyan)]/20 text-[var(--nova-text-primary)] rounded-full text-xs">
                        Mood: {item.data.journal.mood_score}/10
                      </span>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
  className,
  index = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      custom={index}
      variants={cardVariants}
      className={cn(
        'bg-[var(--nova-surface)]/60 backdrop-blur-xl p-4 rounded-2xl border border-[var(--nova-border)] flex gap-3 items-start',
        className
      )}
    >
      <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--nova-violet)]/20 to-[var(--nova-cyan)]/20">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-semibold text-[var(--nova-text-muted)] uppercase tracking-wider mb-1">{title}</h4>
        {children}
      </div>
    </motion.div>
  );
}
