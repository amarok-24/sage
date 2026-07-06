import { useState } from 'react';
import type { BrainDumpResponse } from '@sage/shared';
import { UniversalInput } from '../components/UniversalInput';
import { ActivityFeed } from '../components/ActivityFeed';
import { SageLogo } from '../components/SageLogo';

export function Dashboard() {
  const [entries, setEntries] = useState<BrainDumpResponse[]>([]);

  const handleResponse = (data: BrainDumpResponse) => {
    setEntries(prev => [data, ...prev]);
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
        <UniversalInput onResponse={handleResponse} />

        <div className="mt-12">
          <ActivityFeed entries={entries} />
        </div>
      </main>

    </div>
  );
}
