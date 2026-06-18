import { getToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// ── Types ────────────────────────────────────────────────────────────────────

export type Winner = 'TEAM_A' | 'TEAM_B' | 'DRAW';
export type MatchStatus = 'UPCOMING' | 'LOCKED' | 'COMPLETED';

export interface PredictionResponse {
  id: number;
  matchId: number;
  predictedWinner: Winner;
  predictedGoalDiff: number;
  pointsEarned: number | null;
  isProcessed: boolean;
}

export interface MatchResponse {
  id: number;
  teamA: string;
  teamB: string;
  startTime: string;           // ISO-8601 from Jackson
  teamAScore: number | null;
  teamBScore: number | null;
  actualWinner: Winner | null;
  actualGoalDiff: number | null;
  status: MatchStatus;
  userPrediction: PredictionResponse | null;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalPoints: number;
  exactMatches: number;
  correctOutcomes: number;
  totalPredictions: number;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  totalPoints: number;
  isEmailVerified: boolean;
  isApprovedByAdmin: boolean;
  role: string;
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const body = await res.json();
        msg = body?.message || body?.error || msg;
      } else {
        const text = await res.text();
        if (text && !text.startsWith('<html')) {
          msg = text;
        } else if (res.status === 403) {
          if (path.includes('/login')) {
            msg = "Invalid username or password.";
          } else {
            msg = "Access Denied: You don't have permission to perform this action.";
          }
        } else if (res.status === 401) {
          if (path.includes('/login')) {
            msg = "Invalid username or password.";
          } else {
            msg = "Session Expired: Please log in again.";
          }
        }
      }
    } catch { /* keep default message */ }
    throw new Error(msg);
  }

  // Handle empty responses (204, etc.)
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<AuthResponse> {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(username: string, email: string, password: string): Promise<{ message: string }> {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function verifyOtp(username: string, otpCode: string): Promise<{ message: string }> {
  return apiFetch('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ username, otpCode }),
  });
}

export async function adminLogin(
  username: string,
  password: string,
  adminSecret: string
): Promise<AuthResponse> {
  return apiFetch('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, adminSecret }),
  });
}

// ── Matches ──────────────────────────────────────────────────────────────────

export async function getTodayMatches(): Promise<MatchResponse[]> {
  return apiFetch('/api/matches/today');
}

export async function getHistory(): Promise<MatchResponse[]> {
  return apiFetch('/api/matches/history');
}

export async function getLatestMatch(): Promise<MatchResponse | null> {
  try {
    const data = await apiFetch<MatchResponse>('/api/matches/latest');
    // If the backend returns 204 No Content, data will be empty object
    if (Object.keys(data).length === 0) return null;
    return data;
  } catch (err) {
    return null;
  }
}

// ── Predictions ──────────────────────────────────────────────────────────────

export async function submitPrediction(
  matchId: number,
  predictedWinner: Winner,
  predictedGoalDiff: number
): Promise<PredictionResponse> {
  return apiFetch('/api/predictions', {
    method: 'POST',
    body: JSON.stringify({ matchId, predictedWinner, predictedGoalDiff }),
  });
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return apiFetch('/api/leaderboard');
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function adminGetAllMatches(): Promise<MatchResponse[]> {
  return apiFetch('/api/admin/matches');
}

export async function adminCreateMatch(
  teamA: string,
  teamB: string,
  startTime: string
): Promise<MatchResponse> {
  return apiFetch('/api/admin/matches', {
    method: 'POST',
    body: JSON.stringify({ teamA, teamB, startTime }),
  });
}

export async function adminSubmitResult(
  matchId: number,
  teamAScore: number,
  teamBScore: number
): Promise<MatchResponse> {
  return apiFetch(`/api/admin/matches/${matchId}/result`, {
    method: 'POST',
    body: JSON.stringify({ teamAScore, teamBScore }),
  });
}

export async function adminGetAllUsers(): Promise<UserResponse[]> {
  return apiFetch('/api/admin/users');
}

export async function adminApproveUser(userId: number): Promise<void> {
  return apiFetch(`/api/admin/users/${userId}/approve`, {
    method: 'POST',
  });
}

export async function adminRemoveUser(userId: number): Promise<void> {
  return apiFetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function adminResetScore(userId: number): Promise<void> {
  return apiFetch(`/api/admin/users/${userId}/reset-score`, {
    method: 'POST',
  });
}
