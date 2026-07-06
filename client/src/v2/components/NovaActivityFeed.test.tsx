import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BrainDumpResponse } from '@sage/shared';
import { NovaActivityFeed } from './NovaActivityFeed';
import '@testing-library/jest-dom';

function makeEntry(overrides: Partial<BrainDumpResponse> = {}): BrainDumpResponse {
  return {
    nutrition: [],
    expenses: [],
    time_logs: [],
    habits_completed: [],
    sleep: null,
    somatic_logs: [],
    journal: null,
    raw_text: 'Ran for 30 minutes and spent $45 on groceries.',
    parsed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('NovaActivityFeed', () => {
  it('renders the welcome empty state with example cards when there are no entries', () => {
    render(<NovaActivityFeed entries={[]} />);

    expect(screen.getByText(/What's on your mind\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Habits & Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Nutrition/i)).toBeInTheDocument();
    expect(screen.getByText(/Expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/Mood & Sleep/i)).toBeInTheDocument();
  });

  it('renders a card per category for a populated entry', () => {
    const entry = makeEntry({
      habits_completed: [{ habit_name: 'Running', matched_phrase: 'Ran for 30 minutes', completed: true }],
      expenses: [{ amount: 45, currency: 'USD', category: 'groceries', merchant_inferred: "Trader Joe's", description: 'groceries' }],
    });

    render(<NovaActivityFeed entries={[entry]} />);

    expect(screen.getByText(/"Ran for 30 minutes and spent \$45 on groceries\."/)).toBeInTheDocument();
    expect(screen.getByText('Habit Logged')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('USD 45')).toBeInTheDocument();
  });

  it('renders one entry group per item in entries', () => {
    const entryA = makeEntry({ raw_text: 'First entry', parsed_at: '2024-01-01T00:00:00.000Z' });
    const entryB = makeEntry({ raw_text: 'Second entry', parsed_at: '2024-01-02T00:00:00.000Z' });

    render(<NovaActivityFeed entries={[entryA, entryB]} />);

    expect(screen.getByText('"First entry"')).toBeInTheDocument();
    expect(screen.getByText('"Second entry"')).toBeInTheDocument();
  });
});
