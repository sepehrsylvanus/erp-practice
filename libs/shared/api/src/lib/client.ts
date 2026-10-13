const BASE = "/api/v1";

let accessToken: string | null = null;
export const setToken = (t: string | null) => {
  accessToken = t;
};
export const getToken = () => accessToken;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: {
      code?: string;
      message?: string;
      details?: string[] | null;
      requestId?: string | null;
    } | null,
  ) {
    super(
      body?.message ??
        (Array.isArray(body?.details) ? body.details.join("، ") : null) ??
        `خطای ${status}`,
    );
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include", // refresh cookie همراه هر درخواست
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401 && retry) {
    // single-flight: همه‌ی 401های همزمان فقط از یک refresh مشترک استفاده می‌کنند
    // (بدون این قفل، توکن چرخشی بک‌اند باعث ابطال همه‌ی سشن‌ها می‌شود)
    const refreshed = await refreshOnce();
    if (refreshed) return request<T>(path, init, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function tryRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { accessToken: string };
    accessToken = body.accessToken;
    return true;
  } catch {
    return false;
  }
}

/* ---------- single-flight: قفل refresh همزمان (فاز دوم) ---------- */
let refreshPromise: Promise<boolean> | null = null;
export async function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown, headers?: Record<string, string>) =>
    request<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      headers,
    }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
};
