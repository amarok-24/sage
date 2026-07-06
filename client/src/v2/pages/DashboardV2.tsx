import { useState } from 'react';
import type { BrainDumpResponse } from '@sage/shared';
import { NovaShell } from '../components/NovaShell';
import { NovaLogo } from '../components/NovaLogo';
import { NovaComposer } from '../components/NovaComposer';
import { NovaActivityFeed } from '../components/NovaActivityFeed';

export function DashboardV2() {
  const [entries, setEntries] = useState<BrainDumpResponse[]>([]);

  const handleResponse = (data: BrainDumpResponse) => {
    setEntries(prev => [data, ...prev]);
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
        <NovaComposer onResponse={handleResponse} />
        <NovaActivityFeed entries={entries} />
      </main>
    </NovaShell>
  );
}
