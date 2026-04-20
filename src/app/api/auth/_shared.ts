import { NextResponse } from "next/server";

const CSRF_COOKIE = "XSRF-TOKEN";
const CSRF_HEADER = "x-csrf-token";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Edge-level CSRF double-submit check. For every state-changing proxy route, require the
// X-CSRF-TOKEN header to match the XSRF-TOKEN cookie (constant-time). If the cookie is
// missing the request is allowed — preserving the opt-in model used by the backend
// (Security:Csrf:EnforceOnCookieRequests) — but when the cookie is present it MUST match
// the header. Returns a NextResponse on failure; returns null if the request may proceed.
export function enforceCsrfIfCookiePresent(req: Request): NextResponse | null {
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) return null;

  const cookies = parseCookies(req.headers.get("cookie"));
  const cookieToken = cookies.get(CSRF_COOKIE);
  if (!cookieToken) return null;

  const headerToken = req.headers.get(CSRF_HEADER);
  if (!headerToken || !constantTimeEqual(cookieToken, headerToken)) {
    return NextResponse.json(
      {
        title: "CSRF validation failed",
        detail: "The request is missing or has an invalid CSRF token.",
        status: 403,
        errorCode: "csrf_validation_failed",
      },
      { status: 403 }
    );
  }
  return null;
}

function parseCookies(header: string | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.split("=");
    if (!rawName) continue;
    const name = rawName.trim();
    if (!name) continue;
    const value = rest.join("=").trim();
    out.set(name, decodeURIComponent(value));
  }
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Normalise upstream error bodies so internal details (stack traces, DB messages, full
// ProblemDetails extensions the caller doesn't need) are not echoed to the browser.
export async function toSafeErrorResponse(upstream: Response, fallbackMessage = "Request failed"): Promise<NextResponse> {
  const safe: Record<string, unknown> = {
    message: GENERIC_MESSAGES[upstream.status] ?? fallbackMessage,
    status: upstream.status,
  };

  try {
    const text = await upstream.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (typeof parsed.errorCode === "string") safe.errorCode = parsed.errorCode;
      } catch {
        /* not JSON — discard */
      }
    }
  } catch {
    /* body read failure — irrelevant, we already have status */
  }

  const headers = new Headers({ "content-type": "application/json" });
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) headers.set("retry-after", retryAfter);
  return new NextResponse(JSON.stringify(safe), { status: upstream.status, headers });
}

const GENERIC_MESSAGES: Record<number, string> = {
  400: "Invalid request.",
  401: "Unauthorized.",
  403: "Forbidden.",
  404: "Not found.",
  409: "Conflict.",
  422: "Validation failed.",
  429: "Too many requests.",
  500: "Internal server error.",
  501: "Not implemented.",
  502: "Upstream error.",
  503: "Service unavailable.",
};

type ProxyRequestContext = {
  requestId: string;
  correlationId: string;
  traceparent?: string;
};

type ProxyLogFields = Record<string, unknown>;

export function getApiBase() {
  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

export function pickRequestHeaders(req: Request, names: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of names) {
    const value = req.headers.get(name);
    if (value) {
      headers[name] = sanitizeHeaderValue(value);
    }
  }
  return headers;
}

export function createProxyRequestContext(req: Request): ProxyRequestContext {
  const requestId =
    sanitizeHeaderValue(req.headers.get("x-request-id")) ||
    sanitizeHeaderValue(req.headers.get("x-vercel-id")) ||
    crypto.randomUUID();

  const correlationId =
    sanitizeHeaderValue(req.headers.get("x-correlation-id")) ||
    sanitizeHeaderValue(req.headers.get("x-request-id")) ||
    requestId;

  const traceparent = sanitizeHeaderValue(req.headers.get("traceparent"));

  return { requestId, correlationId, traceparent: traceparent || undefined };
}

export function appendObservabilityHeaders(
  headers: Record<string, string>,
  context: ProxyRequestContext
): Record<string, string> {
  headers["x-request-id"] = context.requestId;
  headers["x-correlation-id"] = context.correlationId;

  if (context.traceparent) {
    headers["traceparent"] = context.traceparent;
  }

  return headers;
}

export function appendForwardedHeaders(
  headers: Record<string, string>,
  req: Request
): Record<string, string> {
  const forwardedFor = sanitizeHeaderValue(req.headers.get("x-forwarded-for"));
  const forwardedProto = sanitizeHeaderValue(req.headers.get("x-forwarded-proto"));
  const forwardedHost = sanitizeHeaderValue(req.headers.get("x-forwarded-host"));

  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;
  if (forwardedProto) headers["x-forwarded-proto"] = forwardedProto;
  if (forwardedHost) headers["x-forwarded-host"] = forwardedHost;

  return headers;
}

export function logProxyEvent(
  severity: "Information" | "Warning" | "Error",
  eventName: string,
  message: string,
  fields: ProxyLogFields = {}
): void {
  if (!shouldEmitProxyLog(severity)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    severity,
    event_name: eventName,
    message,
    service_name: "ager-web",
    environment: process.env.NODE_ENV,
    ...fields,
  };

  const serialized = JSON.stringify(payload);
  if (severity === "Error") {
    console.error(serialized);
    return;
  }

  if (severity === "Warning") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

function shouldEmitProxyLog(severity: "Information" | "Warning" | "Error"): boolean {
  const configured =
    (process.env.PROXY_LOG_MIN_LEVEL ?? "").trim().toLowerCase() ||
    (process.env.NODE_ENV === "production" ? "warning" : "information");

  const rank: Record<string, number> = {
    none: 99,
    error: 3,
    warning: 2,
    information: 1,
  };

  const minRank = rank[configured] ?? 1;
  const severityRank = rank[severity.toLowerCase()] ?? 1;
  return severityRank >= minRank;
}

export async function toProxyResponse(upstream: Response): Promise<NextResponse> {
  const headers = new Headers();

  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) headers.set("retry-after", retryAfter);

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) headers.set("set-cookie", setCookie);

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204, headers });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers,
  });
}

function sanitizeHeaderValue(value: string | null, maxLen = 256): string {
  if (!value) return "";

  const clean = value.replace(/[\r\n]/g, "").trim();
  if (!clean) return "";

  return clean.length <= maxLen ? clean : clean.slice(0, maxLen);
}
