import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function appendWithSpace(base: string, addition: string): string {
  if (!addition) return base;
  if (!base || base.endsWith(' ') || base.endsWith('\n')) return base + addition;
  return `${base} ${addition}`;
}

interface UseSpeechRecognitionOptions {
  /** Called with the full text (base + transcribed speech) as recognition progresses and when it ends. */
  onTranscriptChange: (fullText: string) => void;
  lang?: string;
}

interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  /** Starts/stops dictation. Pass the textarea's current value so speech is appended to it. */
  toggle: (currentText: string) => void;
}

export function useSpeechRecognition({
  onTranscriptChange,
  lang = 'en-US',
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSupported = !!getSpeechRecognitionConstructor();

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(
    (baseText: string) => {
      const Ctor = getSpeechRecognitionConstructor();
      if (!Ctor || recognitionRef.current) return;

      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      let finalTranscript = '';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        onTranscriptChange(appendWithSpace(baseText, finalTranscript + interimTranscript));
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
        onTranscriptChange(appendWithSpace(baseText, finalTranscript));
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    },
    [lang, onTranscriptChange]
  );

  const toggle = useCallback(
    (currentText: string) => {
      if (isListening) {
        stop();
      } else {
        start(currentText);
      }
    },
    [isListening, start, stop]
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { isSupported, isListening, toggle };
}
