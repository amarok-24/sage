export interface SageUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  user: SageUser;
  accessToken: string;
}

let accessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(callback: (() => void) | null) {
  onAuthFailure = callback;
}

function buildHeaders(options: RequestInit): Headers {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`/api${path}`, {
    ...options,
    headers: buildHeaders(options),
    credentials: 'include',
  });
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? fallback;
}

async function refreshAccessToken(): Promise<boolean> {
  const res = await rawFetch('/auth/refresh', { method: 'POST' });
  if (!res.ok) return false;
  const data: { accessToken: string } = await res.json();
  accessToken = data.accessToken;
  return true;
}

/** Authenticated fetch wrapper: attaches the bearer token and retries once via /auth/refresh on a 401. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await rawFetch(path, options);
    } else {
      onAuthFailure?.();
    }
  }

  return res;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await rawFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Login failed'));
  }
  const data: AuthResponse = await res.json();
  accessToken = data.accessToken;
  return data;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await rawFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Registration failed'));
  }
  const data: AuthResponse = await res.json();
  accessToken = data.accessToken;
  return data;
}

export async function demoLogin(): Promise<AuthResponse> {
  const res = await rawFetch('/auth/demo-login', { method: 'POST' });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Demo login failed'));
  }
  const data: AuthResponse = await res.json();
  accessToken = data.accessToken;
  return data;
}

export async function logout(): Promise<void> {
  await rawFetch('/auth/logout', { method: 'POST' });
  accessToken = null;
}

/** Attempts to restore a session from the httpOnly refresh cookie. Returns the user, or null if none exists. */
export async function restoreSession(): Promise<SageUser | null> {
  const refreshed = await refreshAccessToken();
  if (!refreshed) return null;

  const res = await apiFetch('/user/profile');
  if (!res.ok) return null;

  const data: { user: { _id: string; email: string; name: string } } = await res.json();
  return { id: data.user._id, email: data.user.email, name: data.user.name };
}
