import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UniversalInput } from './UniversalInput';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn();

describe('UniversalInput', () => {
  it('renders the textarea and submit button', () => {
    render(<UniversalInput onResponse={() => {}} />);
    
    expect(screen.getByPlaceholderText(/What's on your mind\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('button is disabled when text is empty', () => {
    render(<UniversalInput onResponse={() => {}} />);
    
    const button = screen.getByRole('button', { name: /Submit/i });
    expect(button).toBeDisabled();
  });

  it('button becomes enabled when text is entered', () => {
    render(<UniversalInput onResponse={() => {}} />);
    
    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    const button = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    expect(button).not.toBeDisabled();
  });
});
