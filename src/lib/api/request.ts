import { parseApiError } from "@/lib/api/errors";

type AuthRetryHandlers = {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: unknown;
  accessToken?: string;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  retryOnAuthError?: boolean;
  _retryAttempted?: boolean;
};

let authRetryHandlers: AuthRetryHandlers | null = null;

export function configureAuthRetryHandlers(handlers: AuthRetryHandlers | null) {
  authRetryHandlers = handlers;
}

function buildHeaders(options: ApiRequestOptions, expectsJson: boolean): Headers {
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

  return headers;
}

async function sendRequest(
  input: string,
  options: ApiRequestOptions = {},
  expectsJson: boolean
): Promise<Response> {
  const response = await fetch(input, {
    method: options.method ?? "GET",
    headers: buildHeaders(options, expectsJson),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    credentials: options.credentials,
    cache: options.cache,
  });

  const canRetryAuth =
    response.status === 401 &&
    options.retryOnAuthError !== false &&
    !options._retryAttempted &&
    !!options.accessToken &&
    !!authRetryHandlers;

  if (canRetryAuth) {
    const handlers = authRetryHandlers;
    if (!handlers) {
      throw await parseApiError(response);
    }

    const activeToken = handlers.getAccessToken();
    const tokenToRefresh = activeToken ?? options.accessToken ?? null;

    if (tokenToRefresh) {
      const refreshedToken = await handlers.refreshAccessToken();
      if (refreshedToken) {
        return sendRequest(
          input,
          {
            ...options,
            accessToken: refreshedToken,
            _retryAttempted: true,
          },
          expectsJson
        );
      }
    }
  }

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
