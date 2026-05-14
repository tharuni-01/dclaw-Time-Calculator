const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(`API error ${response.status}: ${error}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function getHealth() {
  return fetchJson<{ status: string }>("/health/");
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface SessionTotal {
  total_seconds: number;
  is_negative: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export interface TimeEntryResponse {
  id: string;
  session_id: string;
  label: string;
  hours: number;
  minutes: number;
  seconds: number;
  operation: "add" | "subtract";
  created_at: string;
}

export interface SessionResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  entry_count: number;
  total: SessionTotal;
}

export interface SessionDetailResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  entries: TimeEntryResponse[];
  total: SessionTotal;
}

export interface TimeEntryCreate {
  label?: string;
  hours: number;
  minutes: number;
  seconds: number;
  operation: "add" | "subtract";
}

// ── Sessions ───────────────────────────────────────────────────────────────

export async function listSessions(): Promise<SessionResponse[]> {
  return fetchJson("/api/v1/sessions");
}

export async function createSession(name: string): Promise<SessionDetailResponse> {
  return fetchJson("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getSession(id: string): Promise<SessionDetailResponse> {
  return fetchJson(`/api/v1/sessions/${id}`);
}

export async function deleteSession(id: string): Promise<void> {
  return fetchJson(`/api/v1/sessions/${id}`, { method: "DELETE" });
}

export async function renameSession(id: string, name: string): Promise<SessionDetailResponse> {
  return fetchJson(`/api/v1/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

// ── Entries ────────────────────────────────────────────────────────────────

export async function addEntry(sessionId: string, entry: TimeEntryCreate): Promise<TimeEntryResponse> {
  return fetchJson(`/api/v1/sessions/${sessionId}/entries`, {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export async function deleteEntry(sessionId: string, entryId: string): Promise<void> {
  return fetchJson(`/api/v1/sessions/${sessionId}/entries/${entryId}`, { method: "DELETE" });
}

// ── Stateless calculation ─────────────────────────────────────────────────

export async function calculateStateless(entries: TimeEntryCreate[]): Promise<{ total: SessionTotal }> {
  return fetchJson("/api/v1/sessions/calculate", {
    method: "POST",
    body: JSON.stringify({ entries }),
  });
}

export { ApiError };
