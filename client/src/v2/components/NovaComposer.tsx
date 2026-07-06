import { useState, useRef, useEffect } from 'react';
import type { BrainDumpResponse } from '@sage/shared';
import { motion } from 'framer-motion';
import { SendHorizonal, Loader2, Mic } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { cn } from '../../lib/utils';

interface NovaComposerProps {
  onResponse: (data: BrainDumpResponse) => void;
}

export function NovaComposer({ onResponse }: NovaComposerProps) {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    const payload = { text, timestamp: new Date().toISOString() };

    try {
      const res = await apiFetch('/braindump', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to process braindump');
      }

      const { parsed_data } = await res.json();
      onResponse(parsed_data);
      setText('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
          disabled={isProcessing}
          rows={1}
        />

        <div className="flex items-center justify-end gap-2 mt-3">
          {isVoiceSupported && (
            <button
              onClick={() => toggleListening(text)}
              disabled={isProcessing}
              className={cn(
                'min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all duration-300',
                isProcessing
                  ? 'bg-[var(--nova-surface)] text-[var(--nova-text-muted)] cursor-not-allowed opacity-50'
                  : isListening
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
            disabled={!text.trim() || isProcessing}
            className={cn(
              'min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all duration-300',
              text.trim() && !isProcessing
                ? 'bg-gradient-to-r from-[var(--nova-violet)] to-[var(--nova-cyan)] text-white shadow-nova-glow'
                : 'bg-[var(--nova-surface)] text-[var(--nova-text-muted)] cursor-not-allowed border border-[var(--nova-border)]'
            )}
            aria-label="Submit"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <SendHorizonal className="w-5 h-5" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
