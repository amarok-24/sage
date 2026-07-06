import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UniversalInput } from './UniversalInput';
import { ToastProvider } from '../contexts/ToastContext';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn();

function renderInput(props: Partial<React.ComponentProps<typeof UniversalInput>> = {}) {
  return render(
    <ToastProvider>
      <UniversalInput
        onSubmitStart={() => {}}
        onSubmitSuccess={() => {}}
        onSubmitError={() => {}}
        {...props}
      />
    </ToastProvider>
  );
}

describe('UniversalInput', () => {
  it('renders the textarea and submit button', () => {
    renderInput();

    expect(screen.getByPlaceholderText(/What's on your mind\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('button is disabled when text is empty', () => {
    renderInput();

    const button = screen.getByRole('button', { name: /Submit/i });
    expect(button).toBeDisabled();
  });

  it('button becomes enabled when text is entered', () => {
    renderInput();

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    const button = screen.getByRole('button', { name: /Submit/i });

    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    expect(button).not.toBeDisabled();
  });

  it('does not render a mic button when SpeechRecognition is unsupported', () => {
    renderInput();

    expect(screen.queryByRole('button', { name: /voice input/i })).not.toBeInTheDocument();
  });

  it('clears the textarea immediately on submit instead of waiting for the response', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves — proves the clear isn't waiting on it
    );

    renderInput();

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(textarea).toHaveValue('');
  });

  it('reports a start id synchronously and a success once the request resolves', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ parsed_data: { raw_text: 'Had a great lunch' } }),
    });

    const onSubmitStart = vi.fn();
    const onSubmitSuccess = vi.fn();
    renderInput({ onSubmitStart, onSubmitSuccess });

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(onSubmitStart).toHaveBeenCalledWith(expect.any(String), 'Had a great lunch');
    const id = onSubmitStart.mock.calls[0][0];

    await waitFor(() => {
      expect(onSubmitSuccess).toHaveBeenCalledWith(id, { raw_text: 'Had a great lunch' });
    });
  });

  it('reports an error and does not throw when the request fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const onSubmitError = vi.fn();
    renderInput({ onSubmitError });

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(onSubmitError).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    });
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
    renderInput();

    const micButton = screen.getByRole('button', { name: /start voice input/i });
    expect(micButton).toBeInTheDocument();
    expect(micButton).not.toBeDisabled();
  });

  it('clicking the mic starts recognition and flips to the listening state', () => {
    renderInput();

    fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));

    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(MockSpeechRecognition.instances[0].start).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /stop voice input/i })).toBeInTheDocument();
  });

  it('appends a final transcript to any existing typed text', () => {
    renderInput();

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

  it('keeps the mic and textarea usable while a previous submission is still processing', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    renderInput();

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    // The first submission is still in flight, but the UI must stay unblocked
    // so the user can immediately log a second entry.
    expect(screen.getByRole('button', { name: /start voice input/i })).not.toBeDisabled();
    expect(textarea).not.toBeDisabled();
    expect(textarea).toHaveValue('');

    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ parsed_data: {} }) } as Response);
    });
  });

  it('reverts to idle without throwing when recognition errors', () => {
    renderInput();

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
