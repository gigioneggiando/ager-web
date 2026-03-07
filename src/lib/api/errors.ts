export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  // common non-ProblemDetails payload
  message?: string;
  // legacy / non-standard
  errorCode?: string;
  errors?: Record<string, string[] | string>;
  // ASP.NET ProblemDetails extensions
  extensions?: {
    errorCode?: string;
    errors?: Record<string, string[] | string>;
  };
  traceId?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  retryAfterSeconds?: number;
  traceId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
    retryAfterSeconds?: number,
    traceId?: string
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
    this.traceId = traceId;
  }
}

function parseRetryAfterSeconds(raw: string | null): number | undefined {
  if (!raw) return undefined;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.floor(seconds);

  const dateMs = Date.parse(raw);
  if (!Number.isFinite(dateMs)) return undefined;

  const diff = Math.ceil((dateMs - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

export async function parseApiError(res: Response): Promise<ApiError> {
  const status = res.status;
  const retryAfterSeconds = parseRetryAfterSeconds(res.headers.get("retry-after"));

  const raw = await res.text().catch(() => "");
  if (!raw) return new ApiError(`Request failed (${status})`, status, undefined, undefined, retryAfterSeconds);

  // Try ProblemDetails JSON first
  try {
    const json = JSON.parse(raw) as ProblemDetails & Record<string, unknown>;
    const code =
      (json.extensions?.errorCode as string | undefined) ??
      (json.errorCode as string | undefined) ??
      undefined;
    const message =
      json.detail ||
      json.title ||
      json.message ||
      code ||
      `Request failed (${status})`;

    const traceId = typeof json.traceId === "string" ? json.traceId : undefined;
    return new ApiError(message, status, code, json, retryAfterSeconds, traceId);
  } catch {
    // Fallback: plain text
    return new ApiError(raw, status, undefined, undefined, retryAfterSeconds);
  }
}

export function getProblemDetailsFieldErrors(details: unknown): Record<string, string[]> {
  const pd = details as ProblemDetails | undefined;
  const errors = pd?.errors ?? pd?.extensions?.errors;
  if (!errors || typeof errors !== "object") return {};

  const normalized: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value)) normalized[field] = value.filter((v) => typeof v === "string");
    else if (typeof value === "string") normalized[field] = [value];
  }
  return normalized;
}

export function getRetryAfterSeconds(error: unknown): number | undefined {
  const apiError = error as ApiError | undefined;
  if (!apiError || typeof apiError.retryAfterSeconds !== "number") return undefined;
  return apiError.retryAfterSeconds;
}
