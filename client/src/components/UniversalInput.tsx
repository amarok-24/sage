import { useState, useRef, useEffect } from 'react';
import type { BrainDumpResponse } from '@sage/shared';
import { SendHorizonal, Mic } from 'lucide-react';
import { submitBrainDump } from '../lib/braindump';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

interface UniversalInputProps {
  onSubmitStart: (id: string, rawText: string) => void;
  onSubmitSuccess: (id: string, data: BrainDumpResponse) => void;
  onSubmitError: (id: string, message: string) => void;
}

export function UniversalInput({ onSubmitStart, onSubmitSuccess, onSubmitError }: UniversalInputProps) {
  const [text, setText] = useState('');
  const [inFlightCount, setInFlightCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  const { isSupported: isVoiceSupported, isListening, toggle: toggleListening } = useSpeechRecognition({
    onTranscriptChange: setText,
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSubmit = async () => {
    const rawText = text.trim();
    if (!rawText) return;

    const id = crypto.randomUUID();
    setText(''); // Clear instantly — logging the next entry shouldn't wait on this one's LLM round trip.
    onSubmitStart(id, rawText);
    setInFlightCount((n) => n + 1);

    try {
      const data = await submitBrainDump(rawText);
      onSubmitSuccess(id, data);
    } catch (error) {
      console.error(error);
      onSubmitError(id, "Couldn't process that entry.");
      showToast("Couldn't process your last brain dump — tap it in the feed to retry.", 'error');
    } finally {
      setInFlightCount((n) => n - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isProcessing = inFlightCount > 0;

  return (
    <div className={cn(
      "w-full max-w-2xl mx-auto p-4 md:p-6 bg-white rounded-3xl shadow-sm border border-sage-brown-100 transition-all duration-700 ease-in-out relative",
      isProcessing && "animate-breathe shadow-md border-sage-green-200 ring-2 ring-sage-green-100 ring-opacity-50"
    )}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? (e.g. Spent $15 on lunch, meditated for 10 mins...)"
          className={cn(
            "w-full bg-transparent border-none focus:ring-0 resize-none font-serif text-lg md:text-xl text-sage-brown-900 placeholder:text-sage-brown-400 outline-none",
            "min-h-[60px] overflow-hidden"
          )}
          rows={1}
        />

        <div className="absolute bottom-0 right-0 transform translate-y-1/2 md:translate-y-0 md:bottom-2 flex items-center gap-2">
          {isVoiceSupported && (
            <button
              onClick={() => toggleListening(text)}
              className={cn(
                "p-3 rounded-full flex items-center justify-center transition-all duration-300",
                isListening
                  ? "bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse"
                  : "bg-sage-brown-100 text-sage-brown-600 hover:bg-sage-brown-200"
              )}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className={cn(
              "p-3 rounded-full flex items-center justify-center transition-all duration-300",
              text.trim()
                ? "bg-sage-green-600 text-white hover:bg-sage-green-700 shadow-sm"
                : "bg-sage-brown-100 text-sage-brown-300 cursor-not-allowed"
            )}
            aria-label="Submit"
          >
            <SendHorizonal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
