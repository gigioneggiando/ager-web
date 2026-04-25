import { parseApiError } from "@/lib/api/errors";
import { getCsrfRequestToken, peekCachedCsrfToken } from "@/lib/api/csrf";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: unknown;
  accessToken?: string;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  cache?: RequestCache;
};

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_HEADER = "X-CSRF-TOKEN";

function buildHeaders(options: ApiRequestOptions, expectsJson: boolean, csrfToken: string | null): Headers {
  const headers = new Headers(options.headers ?? {});

  if (expectsJson && !headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  // ASP.NET antiforgery requires the requestToken (returned by GET /api/auth/csrf) in the
  // X-CSRF-TOKEN header — NOT the XSRF-TOKEN cookie value. The two are cryptographically
  // related but distinct, so cookie-mirror approaches always fail on the backend.
  const method = (options.method ?? "GET").toUpperCase();
  if (STATE_CHANGING_METHODS.has(method) && !headers.has(CSRF_HEADER) && csrfToken) {
    headers.set(CSRF_HEADER, csrfToken);
  }

  return headers;
}

async function sendRequest(
  input: string,
  options: ApiRequestOptions = {},
  expectsJson: boolean
): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  let csrfToken: string | null = null;
  if (STATE_CHANGING_METHODS.has(method)) {
    // Fast-path: use the cached token if we have one (no extra network hop).
    // First-time and post-cache-clear requests fall through to a single bootstrap call —
    // and we pass the bearer so the backend mints a token-pair bound to the SAME identity
    // that will be presented at validation time. Without this, an anonymous bootstrap
    // followed by an authenticated POST always fails ASP.NET antiforgery.
    csrfToken = peekCachedCsrfToken() ?? (await getCsrfRequestToken(options.accessToken ?? null));
  }

  const response = await fetch(input, {
    method: options.method ?? "GET",
    headers: buildHeaders(options, expectsJson, csrfToken),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    credentials: options.credentials,
    cache: options.cache,
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response;
}

export async function requestJson<T>(
  input: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const response = await sendRequest(input, options, true);
  return (await response.json()) as T;
}

export async function requestVoid(
  input: string,
  options: ApiRequestOptions = {}
): Promise<void> {
  await sendRequest(input, options, false);
}

export async function requestMaybeJson<T>(
  input: string,
  options: ApiRequestOptions = {}
): Promise<T | null> {
  const response = await sendRequest(input, options, false);
  const contentType = response.headers.get("content-type");

  if (response.status === 204 || !contentType || !contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}