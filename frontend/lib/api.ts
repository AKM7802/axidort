import type {
  AuthResponse,
  ClientProfile,
  ContactPayload,
  EmailDigestDetail,
  MeStats,
  PaginatedDigests,
  PaginatedLeads,
  State,
  TerritoryOption,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json()).detail;
    } catch {
      detail = res.statusText;
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Human-readable message from an ApiError.detail, which FastAPI shapes
 * differently for validation errors (array) vs HTTPException (string). */
export function apiErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return "Something went wrong. Please try again.";
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail.map((e) => (typeof e === "object" && e && "msg" in e ? String(e.msg) : String(e))).join("; ");
  }
  return "Something went wrong. Please try again.";
}

export const api = {
  signin: (email: string, password: string) =>
    request<AuthResponse>("/auth/signin", { method: "POST", body: { email, password } }),

  forgotPassword: (email: string) =>
    request<void>("/auth/forgot-password", { method: "POST", body: { email } }),

  resetPassword: (token: string, newPassword: string) =>
    request<void>("/auth/reset-password", {
      method: "POST",
      body: { token, new_password: newPassword },
    }),

  territoryOptions: (cityId: string, kind?: string) =>
    request<TerritoryOption[]>(`/territories/options?city_id=${cityId}${kind ? `&kind=${kind}` : ""}`),

  geoStates: () => request<State[]>("/geo/states"),

  me: (token: string) => request<ClientProfile>("/me", { token }),

  contact: (payload: ContactPayload) => request<void>("/contact", { method: "POST", body: payload }),

  myLeads: (token: string, limit = 25, offset = 0) =>
    request<PaginatedLeads>(`/me/leads?limit=${limit}&offset=${offset}`, { token }),

  myStats: (token: string) => request<MeStats>("/me/stats", { token }),

  myDigests: (token: string, limit = 25, offset = 0) =>
    request<PaginatedDigests>(`/me/digests?limit=${limit}&offset=${offset}`, { token }),

  myDigestDetail: (token: string, id: string) => request<EmailDigestDetail>(`/me/digests/${id}`, { token }),
};
