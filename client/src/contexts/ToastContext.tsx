import { createContext, useCallback, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export type ToastKind = 'error' | 'success' | 'info';

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, kind }]);
    setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg bg-zinc-900 text-white text-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {toast.kind === 'error' ? (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            ) : toast.kind === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />
            ) : null}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
              className="shrink-0 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
