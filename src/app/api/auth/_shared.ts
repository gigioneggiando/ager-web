import { NextResponse } from "next/server";

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
