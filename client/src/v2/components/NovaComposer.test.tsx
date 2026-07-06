import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NovaComposer } from './NovaComposer';
import { ToastProvider } from '../../contexts/ToastContext';
import '@testing-library/jest-dom';

global.fetch = vi.fn();

function renderComposer(props: Partial<React.ComponentProps<typeof NovaComposer>> = {}) {
  return render(
    <ToastProvider>
      <NovaComposer
        onSubmitStart={() => {}}
        onSubmitSuccess={() => {}}
        onSubmitError={() => {}}
        {...props}
      />
    </ToastProvider>
  );
}

describe('NovaComposer', () => {
  it('renders the textarea and submit button', () => {
    renderComposer();

    expect(screen.getByPlaceholderText(/What's on your mind\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('button is disabled when text is empty', () => {
    renderComposer();

    expect(screen.getByRole('button', { name: /Submit/i })).toBeDisabled();
  });

  it('button becomes enabled when text is entered', () => {
    renderComposer();

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });

    expect(screen.getByRole('button', { name: /Submit/i })).not.toBeDisabled();
  });

  it('does not render a mic button when SpeechRecognition is unsupported', () => {
    renderComposer();

    expect(screen.queryByRole('button', { name: /voice input/i })).not.toBeInTheDocument();
  });

  it('clears the composer immediately on submit and reports success once the request resolves', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ parsed_data: { raw_text: 'Had a great lunch' } }),
    } as Response);

    const onSubmitStart = vi.fn();
    const onSubmitSuccess = vi.fn();
    renderComposer({ onSubmitStart, onSubmitSuccess });

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(textarea).toHaveValue('');
    expect(onSubmitStart).toHaveBeenCalledWith(expect.any(String), 'Had a great lunch');
    const id = onSubmitStart.mock.calls[0][0];

    await waitFor(() => {
      expect(onSubmitSuccess).toHaveBeenCalledWith(id, { raw_text: 'Had a great lunch' });
    });
  });

  it('reports an error and does not throw when the request fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false } as Response);

    const onSubmitError = vi.fn();
    renderComposer({ onSubmitError });

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

describe('NovaComposer voice input', () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = [];
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it('renders an enabled mic button when supported', () => {
    renderComposer();

    const micButton = screen.getByRole('button', { name: /start voice input/i });
    expect(micButton).toBeInTheDocument();
    expect(micButton).not.toBeDisabled();
  });

  it('clicking the mic starts recognition and flips to the listening state', () => {
    renderComposer();

    fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));

    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(MockSpeechRecognition.instances[0].start).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /stop voice input/i })).toBeInTheDocument();
  });

  it('keeps the mic and textarea usable while a previous submission is still processing', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    renderComposer();

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(screen.getByRole('button', { name: /start voice input/i })).not.toBeDisabled();
    expect(textarea).not.toBeDisabled();
    expect(textarea).toHaveValue('');

    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ parsed_data: {} }) } as Response);
    });
  });
});
