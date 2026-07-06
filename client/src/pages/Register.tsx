import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterSchema } from '@sage/shared';
import { useAuth } from '../hooks/useAuth';
import { SageLogo } from '../components/SageLogo';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = RegisterSchema.safeParse({ email, password, name });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(result.data.email, result.data.password, result.data.name);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <SageLogo size={48} className="mb-4" />
          <h1 className="text-3xl font-serif text-sage-brown-900 tracking-tight">Sage</h1>
          <p className="text-sage-brown-500 font-serif italic mt-1">Grow your awareness.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-sm border border-sage-brown-100 p-6 space-y-4"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-sage-brown-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-sage-brown-200 px-3 py-2 font-sans text-sage-brown-900 outline-none focus:ring-2 focus:ring-sage-green-200"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-sage-brown-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-sage-brown-200 px-3 py-2 font-sans text-sage-brown-900 outline-none focus:ring-2 focus:ring-sage-green-200"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-sage-brown-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-sage-brown-200 px-3 py-2 font-sans text-sage-brown-900 outline-none focus:ring-2 focus:ring-sage-green-200"
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-sage-green-600 text-white py-2.5 font-medium hover:bg-sage-green-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-sage-brown-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-sage-green-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
