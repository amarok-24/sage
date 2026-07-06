import { useState, useRef, useEffect } from 'react';
import type { BrainDumpResponse } from '@sage/shared';
import { SendHorizonal, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { apiFetch } from '../lib/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UniversalInputProps {
  onResponse: (data: BrainDumpResponse) => void;
}

export function UniversalInput({ onResponse }: UniversalInputProps) {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
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
      // In a real app we would show a toast here
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
          disabled={isProcessing}
          rows={1}
        />
        
        <div className="absolute bottom-0 right-0 transform translate-y-1/2 md:translate-y-0 md:bottom-2">
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isProcessing}
            className={cn(
              "p-3 rounded-full flex items-center justify-center transition-all duration-300",
              text.trim() && !isProcessing
                ? "bg-sage-green-600 text-white hover:bg-sage-green-700 shadow-sm"
                : "bg-sage-brown-100 text-sage-brown-300 cursor-not-allowed"
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
      </div>
    </div>
  );
}
