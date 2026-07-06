import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('does not render a mic button when SpeechRecognition is unsupported', () => {
    render(<UniversalInput onResponse={() => {}} />);

    expect(screen.queryByRole('button', { name: /voice input/i })).not.toBeInTheDocument();
  });
});

class MockSpeechRecognition extends EventTarget {
  static instances: MockSpeechRecognition[] = [];

  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });

  constructor() {
    super();
    MockSpeechRecognition.instances.push(this);
  }
}

function makeResult(transcript: string, isFinal: boolean) {
  return { 0: { transcript }, isFinal, length: 1 };
}

describe('UniversalInput voice input', () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = [];
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it('renders an enabled mic button when supported', () => {
    render(<UniversalInput onResponse={() => {}} />);

    const micButton = screen.getByRole('button', { name: /start voice input/i });
    expect(micButton).toBeInTheDocument();
    expect(micButton).not.toBeDisabled();
  });

  it('clicking the mic starts recognition and flips to the listening state', () => {
    render(<UniversalInput onResponse={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));

    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(MockSpeechRecognition.instances[0].start).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /stop voice input/i })).toBeInTheDocument();
  });

  it('appends a final transcript to any existing typed text', () => {
    render(<UniversalInput onResponse={() => {}} />);

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch.' } });
    fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));

    const recognition = MockSpeechRecognition.instances[0];
    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [makeResult('Went for a walk after.', true)],
      });
    });

    expect(textarea).toHaveValue('Had a great lunch. Went for a walk after.');
  });

  it('disables the mic button while a submission is processing', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    render(<UniversalInput onResponse={() => {}} />);

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start voice input/i })).toBeDisabled();
    });

    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ parsed_data: {} }) } as Response);
    });
  });

  it('reverts to idle without throwing when recognition errors', () => {
    render(<UniversalInput onResponse={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));
    const recognition = MockSpeechRecognition.instances[0];

    expect(() => {
      act(() => {
        recognition.onerror?.({ error: 'not-allowed' });
      });
    }).not.toThrow();
    expect(screen.getByRole('button', { name: /start voice input/i })).toBeInTheDocument();
  });
});
