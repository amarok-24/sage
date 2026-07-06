import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import '@testing-library/jest-dom';

const STORAGE_KEY = 'sage:v2-theme-mode';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a moon icon (offering dark mode) by default since dark is active', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
  });

  it('renders a sun icon (offering light mode) when light is already stored', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
  });

  it('clicking flips the mode and persists it to localStorage', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /switch to light theme/i });
    fireEvent.click(button);

    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
  });
});
