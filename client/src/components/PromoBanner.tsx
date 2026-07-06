import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';

const DISMISSED_KEY = 'sage:v2-promo-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function PromoBanner() {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // localStorage unavailable - dismissal just won't persist across reloads
    }
    setDismissed(true);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 flex items-center justify-between gap-3 rounded-2xl bg-sage-green-50 border border-sage-green-100 px-4 py-3">
      <Link to="/v2" className="flex items-center gap-2 text-sm font-medium text-sage-green-800 hover:text-sage-green-900">
        <Sparkles className="w-4 h-4 text-sage-green-600 shrink-0" />
        Try the new Sage experience
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="p-1 rounded-full text-sage-green-600 hover:bg-sage-green-100 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
