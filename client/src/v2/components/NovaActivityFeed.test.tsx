import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BrainDumpResponse } from '@sage/shared';
import type { FeedItem } from '../../lib/feed';
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

function makeDoneItem(id: string, overrides: Partial<BrainDumpResponse> = {}): FeedItem {
  return { status: 'done', id, data: makeEntry(overrides) };
}

describe('NovaActivityFeed', () => {
  it('renders the welcome empty state with example cards when there are no entries', () => {
    render(<NovaActivityFeed items={[]} onRetry={vi.fn()} />);

    expect(screen.getByText(/What's on your mind\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Habits & Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Nutrition/i)).toBeInTheDocument();
    expect(screen.getByText(/Expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/Mood & Sleep/i)).toBeInTheDocument();
  });

  it('renders a card per category for a populated entry', () => {
    const item = makeDoneItem('1', {
      habits_completed: [{ habit_name: 'Running', matched_phrase: 'Ran for 30 minutes', completed: true }],
      expenses: [{ amount: 45, currency: 'USD', category: 'groceries', merchant_inferred: "Trader Joe's", description: 'groceries' }],
    });

    render(<NovaActivityFeed items={[item]} onRetry={vi.fn()} />);

    expect(screen.getByText(/"Ran for 30 minutes and spent \$45 on groceries\."/)).toBeInTheDocument();
    expect(screen.getByText('Habit Logged')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('USD 45')).toBeInTheDocument();
  });

  it('renders one entry group per item', () => {
    const itemA = makeDoneItem('a', { raw_text: 'First entry' });
    const itemB = makeDoneItem('b', { raw_text: 'Second entry' });

    render(<NovaActivityFeed items={[itemA, itemB]} onRetry={vi.fn()} />);

    expect(screen.getByText('"First entry"')).toBeInTheDocument();
    expect(screen.getByText('"Second entry"')).toBeInTheDocument();
  });

  it('renders a pending placeholder for an in-flight submission', () => {
    const item: FeedItem = { status: 'pending', id: 'p1', raw_text: 'Still processing this' };

    render(<NovaActivityFeed items={[item]} onRetry={vi.fn()} />);

    expect(screen.getByText('"Still processing this"')).toBeInTheDocument();
    expect(screen.getByText(/Sage is reading this one/i)).toBeInTheDocument();
  });

  it('renders a retry affordance for a failed submission and invokes onRetry on click', () => {
    const item: FeedItem = { status: 'error', id: 'e1', raw_text: 'This one failed', errorMessage: "Couldn't process that entry." };
    const onRetry = vi.fn();

    render(<NovaActivityFeed items={[item]} onRetry={onRetry} />);

    const retryButton = screen.getByText(/Couldn't process that entry\./i).closest('button')!;
    retryButton.click();

    expect(onRetry).toHaveBeenCalledWith('e1');
  });
});
