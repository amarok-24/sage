import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NovaComposer } from './NovaComposer';
import '@testing-library/jest-dom';

global.fetch = vi.fn();

describe('NovaComposer', () => {
  it('renders the textarea and submit button', () => {
    render(<NovaComposer onResponse={() => {}} />);

    expect(screen.getByPlaceholderText(/What's on your mind\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('button is disabled when text is empty', () => {
    render(<NovaComposer onResponse={() => {}} />);

    expect(screen.getByRole('button', { name: /Submit/i })).toBeDisabled();
  });

  it('button becomes enabled when text is entered', () => {
    render(<NovaComposer onResponse={() => {}} />);

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });

    expect(screen.getByRole('button', { name: /Submit/i })).not.toBeDisabled();
  });

  it('does not render a mic button when SpeechRecognition is unsupported', () => {
    render(<NovaComposer onResponse={() => {}} />);

    expect(screen.queryByRole('button', { name: /voice input/i })).not.toBeInTheDocument();
  });

  it('submits the text and clears the composer on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ parsed_data: { raw_text: 'Had a great lunch' } }),
    } as Response);

    const onResponse = vi.fn();
    render(<NovaComposer onResponse={onResponse} />);

    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    fireEvent.change(textarea, { target: { value: 'Had a great lunch' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith({ raw_text: 'Had a great lunch' });
    });
    expect(textarea).toHaveValue('');
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
    render(<NovaComposer onResponse={() => {}} />);

    const micButton = screen.getByRole('button', { name: /start voice input/i });
    expect(micButton).toBeInTheDocument();
    expect(micButton).not.toBeDisabled();
  });

  it('clicking the mic starts recognition and flips to the listening state', () => {
    render(<NovaComposer onResponse={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));

    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(MockSpeechRecognition.instances[0].start).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /stop voice input/i })).toBeInTheDocument();
  });

  it('disables the mic button while a submission is processing', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    render(<NovaComposer onResponse={() => {}} />);

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
});
