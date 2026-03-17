const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class CredentialsExpiredError extends Error {
  constructor(message = "AWS credentials expired") {
    super(message);
    this.name = "CredentialsExpiredError";
  }
}

// Global callback set by ProfileProvider to trigger credential modal
let onCredentialsExpired: (() => void) | null = null;
export function setOnCredentialsExpired(cb: (() => void) | null) {
  onCredentialsExpired = cb;
}

export async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, API_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString());
  if (res.status === 401) {
    onCredentialsExpired?.();
    throw new CredentialsExpiredError();
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function postApi<T>(path: string, body: Record<string, string>): Promise<T> {
  const url = new URL(path, API_URL);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `API error: ${res.status}`);
  }
  return res.json();
}
