import { useEffect, useState } from 'react';
import type { BrainDumpResponse } from '@sage/shared';
import type { FeedItem } from '../lib/feed';
import { submitBrainDump } from '../lib/braindump';
import { hydrateFeed } from '../lib/hydrateFeed';
import { apiFetch } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { UniversalInput } from '../components/UniversalInput';
import { ActivityFeed } from '../components/ActivityFeed';
import { SageLogo } from '../components/SageLogo';
import { PromoBanner } from '../components/PromoBanner';
import { InsightsPanel } from '../components/InsightsPanel';

export function Dashboard() {
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
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">

      {/* Header */}
      <header className="w-full max-w-2xl mx-auto mt-12 mb-10 text-center">
        <div className="inline-flex items-center justify-center mb-4">
          <SageLogo size={56} />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif text-sage-brown-900 mb-3 tracking-tight">Sage</h1>
        <p className="text-sage-brown-500 font-serif italic">Grow your awareness.</p>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <PromoBanner />
        <UniversalInput
          onSubmitStart={handleSubmitStart}
          onSubmitSuccess={handleSubmitSuccess}
          onSubmitError={handleSubmitError}
        />

        <div className="mt-12">
          <InsightsPanel />
          <ActivityFeed items={items} onRetry={handleRetry} isLoading={isHydrating} />
        </div>
      </main>

    </div>
  );
}
