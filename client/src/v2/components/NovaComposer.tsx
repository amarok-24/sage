import { useState, useRef, useEffect } from 'react';
import type { BrainDumpResponse } from '@sage/shared';
import { motion } from 'framer-motion';
import { SendHorizonal, Mic } from 'lucide-react';
import { submitBrainDump } from '../../lib/braindump';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';

interface NovaComposerProps {
  onSubmitStart: (id: string, rawText: string) => void;
  onSubmitSuccess: (id: string, data: BrainDumpResponse) => void;
  onSubmitError: (id: string, message: string) => void;
}

export function NovaComposer({ onSubmitStart, onSubmitSuccess, onSubmitError }: NovaComposerProps) {
  const [text, setText] = useState('');
  const [inFlightCount, setInFlightCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  const { isSupported: isVoiceSupported, isListening, toggle: toggleListening } = useSpeechRecognition({
    onTranscriptChange: setText,
  });

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
    <div className="relative w-full">
      <div
        className={cn(
          'absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-[var(--nova-violet)] to-[var(--nova-cyan)] opacity-20 blur-xl transition-opacity duration-700',
          isProcessing && 'opacity-40 animate-nova-pulse'
        )}
      />
      <motion.div
        animate={isProcessing ? { scale: [1, 1.01, 1] } : { scale: 1 }}
        transition={{ duration: 2, repeat: isProcessing ? Infinity : 0, ease: 'easeInOut' }}
        className={cn(
          'relative w-full p-4 sm:p-5 md:p-6 rounded-[2rem] backdrop-blur-xl transition-all duration-500',
          'bg-[var(--nova-surface)]/60 border border-[var(--nova-border)]',
          isProcessing && 'border-[var(--nova-violet)]/50'
        )}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? (e.g. Spent $15 on lunch, meditated for 10 mins...)"
          className={cn(
            'w-full bg-transparent border-none focus:ring-0 resize-none font-nova text-base sm:text-lg md:text-xl outline-none',
            'text-[var(--nova-text-primary)] placeholder:text-[var(--nova-text-muted)]',
            'min-h-[60px] overflow-hidden'
          )}
          rows={1}
        />

        <div className="flex items-center justify-end gap-2 mt-3">
          {isVoiceSupported && (
            <button
              onClick={() => toggleListening(text)}
              className={cn(
                'min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all duration-300',
                isListening
                  ? 'bg-red-500/10 text-red-400 ring-2 ring-red-400/40 animate-pulse'
                  : 'bg-[var(--nova-surface)] text-[var(--nova-text-muted)] hover:text-[var(--nova-text-primary)] border border-[var(--nova-border)]'
              )}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className={cn(
              'min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all duration-300',
              text.trim()
                ? 'bg-gradient-to-r from-[var(--nova-violet)] to-[var(--nova-cyan)] text-white shadow-nova-glow'
                : 'bg-[var(--nova-surface)] text-[var(--nova-text-muted)] cursor-not-allowed border border-[var(--nova-border)]'
            )}
            aria-label="Submit"
          >
            <SendHorizonal className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
