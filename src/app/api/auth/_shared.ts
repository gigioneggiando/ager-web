import { NextResponse } from "next/server";

// Edge-level CSRF check is a no-op now. Kept exported so existing proxy route handlers
// don't need to be touched.
//
// Why: ASP.NET Core antiforgery generates a (cookieToken, requestToken) pair where the
// cookie value and the header value differ — the cookie holds the cookieToken (carried
// in XSRF-TOKEN), the header holds the requestToken (returned by GET /api/auth/csrf).
// The previous implementation here did plain double-submit (cookie === header). That
// only worked because the frontend mirrored the cookie value into the header — which
// in turn caused the backend's `Antiforgery.ValidateRequestAsync` to reject every
// real state-changing request (cookieToken ≠ requestToken). The frontend has been
// fixed to send the actual requestToken; the edge can no longer compare equality.
//
// The backend `RequireCsrfIfConfigured` (CsrfEndpointFilter.cs) is the authoritative
// validator and it understands the antiforgery scheme correctly. The edge layer would
// have to call /api/auth/csrf itself and crypto-validate the pair — out of scope for
// a stateless proxy. We delegate fully to the backend.
export function enforceCsrfIfCookiePresent(_req: Request): NextResponse | null {
  return null;
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
