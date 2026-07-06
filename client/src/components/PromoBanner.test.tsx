import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PromoBanner } from './PromoBanner';
import '@testing-library/jest-dom';

const DISMISSED_KEY = 'sage:v2-promo-dismissed';

describe('PromoBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a link to /v2 when not dismissed', () => {
    render(
      <MemoryRouter>
        <PromoBanner />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /try the new sage experience/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/v2');
  });

  it('does not render when previously dismissed', () => {
    localStorage.setItem(DISMISSED_KEY, 'true');

    render(
      <MemoryRouter>
        <PromoBanner />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /try the new sage experience/i })).not.toBeInTheDocument();
  });

  it('dismissing hides the banner and persists the dismissal', () => {
    render(
      <MemoryRouter>
        <PromoBanner />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('link', { name: /try the new sage experience/i })).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISSED_KEY)).toBe('true');
  });
});
