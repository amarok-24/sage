import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import * as api from '../lib/api';
import type { SageUser } from '../lib/api';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/demoUser';

interface AuthContextValue {
  user: SageUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SageUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.setOnAuthFailure(() => setUser(null));
    return () => api.setOnAuthFailure(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (import.meta.env.DEV) {
          // Local dev: skip the login screen entirely by signing in as the seeded demo user.
          const { user: demoUser } = await api.login(DEMO_EMAIL, DEMO_PASSWORD);
          setUser(demoUser);
        } else {
          const restoredUser = await api.restoreSession();
          setUser(restoredUser);
        }
      } catch (error) {
        console.warn('Failed to establish a session on load:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedInUser } = await api.login(email, password);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { user: registeredUser } = await api.register(email, password, name);
    setUser(registeredUser);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
