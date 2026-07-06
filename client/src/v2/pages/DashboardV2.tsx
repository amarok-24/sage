import { useEffect, useState } from 'react';
import type { BrainDumpResponse } from '@sage/shared';
import type { FeedItem } from '../../lib/feed';
import { submitBrainDump } from '../../lib/braindump';
import { hydrateFeed } from '../../lib/hydrateFeed';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { NovaShell } from '../components/NovaShell';
import { NovaLogo } from '../components/NovaLogo';
import { NovaComposer } from '../components/NovaComposer';
import { NovaActivityFeed } from '../components/NovaActivityFeed';
import { NovaInsightsPanel } from '../components/NovaInsightsPanel';

export function DashboardV2() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const { showToast } = useToast();

  // Entries are only ever added to `items` from a live POST /braindump response,
  // so without this a page refresh silently loses the whole activity feed even
  // though it's all still sitting in Mongo.
  useEffect(() => {
    let cancelled = false;
    apiFetch('/dashboard/today')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        const hydrated = hydrateFeed(data);
        setItems(prev => [...prev, ...hydrated]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsHydrating(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSubmitStart = (id: string, rawText: string) => {
    setItems(prev => [{ status: 'pending', id, raw_text: rawText }, ...prev]);
  };

  const handleSubmitSuccess = (id: string, data: BrainDumpResponse) => {
    setItems(prev => prev.map(item => item.id === id ? { status: 'done', id, data } : item));
  };

  const handleSubmitError = (id: string, message: string) => {
    setItems(prev => prev.map(item =>
      item.status !== 'done' && item.id === id
        ? { status: 'error', id, raw_text: item.raw_text, errorMessage: message }
        : item
    ));
  };

  const handleRetry = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.status !== 'error') return;

    setItems(prev => prev.map(i => i.id === id ? { status: 'pending', id, raw_text: item.raw_text } : i));

    try {
      const data = await submitBrainDump(item.raw_text);
      handleSubmitSuccess(id, data);
    } catch (error) {
      console.error(error);
      handleSubmitError(id, "Couldn't process that entry.");
      showToast('Retry failed — please try again.', 'error');
    }
  };

  return (
    <NovaShell fallbackPath="/">
      <header className="w-full max-w-2xl mx-auto mt-4 sm:mt-8 mb-10 text-center">
        <div className="inline-flex items-center justify-center mb-4">
          <NovaLogo size={56} />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-nova font-semibold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[var(--nova-violet)] to-[var(--nova-cyan)]">
          Sage
        </h1>
        <p className="text-[var(--nova-text-muted)] font-nova">Grow your awareness.</p>
      </header>

      <main className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <NovaComposer
          onSubmitStart={handleSubmitStart}
          onSubmitSuccess={handleSubmitSuccess}
          onSubmitError={handleSubmitError}
        />
        <NovaInsightsPanel />
        <NovaActivityFeed items={items} onRetry={handleRetry} isLoading={isHydrating} />
      </main>
    </NovaShell>
  );
}
