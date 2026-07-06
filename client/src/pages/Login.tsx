import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LoginSchema } from '@sage/shared';
import { useAuth } from '../hooks/useAuth';
import { AppShell } from '../components/AppShell';
import { Logo } from '../components/Logo';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(result.data.email, result.data.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <Logo size={48} className="mb-4" />
            <h1 className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--nova-violet)] to-[var(--nova-cyan)]">
              Sage
            </h1>
            <p className="text-[var(--nova-text-muted)] font-sans mt-1">Grow your awareness.</p>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onSubmit={handleSubmit}
            className="bg-[var(--nova-surface)]/60 backdrop-blur-xl rounded-3xl border border-[var(--nova-border)] p-6 space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--nova-text-muted)] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--nova-bg)]/40 border border-[var(--nova-border)] px-3 py-2 font-sans text-[var(--nova-text-primary)] outline-none focus:border-[var(--nova-violet)] focus:ring-2 focus:ring-[var(--nova-violet)]/30"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--nova-text-muted)] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--nova-bg)]/40 border border-[var(--nova-border)] px-3 py-2 font-sans text-[var(--nova-text-primary)] outline-none focus:border-[var(--nova-violet)] focus:ring-2 focus:ring-[var(--nova-violet)]/30"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[var(--nova-violet)] to-[var(--nova-cyan)] text-white py-2.5 font-medium shadow-glow transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </motion.form>

          <p className="text-center text-sm text-[var(--nova-text-muted)] mt-6">
            New to Sage?{' '}
            <Link to="/register" className="text-[var(--nova-text-primary)] font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
