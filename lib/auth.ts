// Token storage and JWT decode utilities
export const TOKEN_KEY = 'fifa_jwt';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface AuthUser {
  username: string;
  role: 'USER' | 'ADMIN';
  exp: number;
}

/** Decode JWT payload without verification (client-side only for UI state) */
export function getUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiry
    if (payload.exp * 1000 < Date.now()) {
      removeToken();
      return null;
    }
    return {
      username: payload.sub,
      role: payload.role as 'USER' | 'ADMIN',
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getUser()?.role === 'ADMIN';
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}

export function logout(): void {
  removeToken();
  window.location.href = '/login';
}
