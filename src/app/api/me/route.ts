import {
  appendObservabilityHeaders,
  createProxyRequestContext,
  enforceCsrfIfCookiePresent,
  logProxyEvent,
  toProxyResponse,
} from "@/app/api/auth/_shared";

function getApiBase() {
  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

async function proxyMe(req: Request, extraPath: string) {
  const csrfFailure = enforceCsrfIfCookiePresent(req);
  if (csrfFailure) return csrfFailure;

  const startedAt = Date.now();
  const requestContext = createProxyRequestContext(req);
  const apiBase = getApiBase();
  const url = new URL(req.url);
  const backendUrl = `${apiBase}/api/me${extraPath}${url.search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;

  const csrf = req.headers.get("x-csrf-token");
  if (csrf) headers["x-csrf-token"] = csrf;

  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;

  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const accept = req.headers.get("accept");
  if (accept) headers["accept"] = accept;

  const method = req.method.toUpperCase();

  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const res = await fetch(backendUrl, {
    method,
    headers: appendObservabilityHeaders(headers, requestContext),
    body,
    cache: "no-store",
  });

  logProxyEvent(
    res.ok ? "Information" : "Warning",
    "proxy_request_completed",
    "Me proxy request completed.",
    {
      request_id: requestContext.requestId,
      correlation_id: requestContext.correlationId,
      upstream_path: `/api/me${extraPath}`,
      method,
      status_code: res.status,
      duration_ms: Date.now() - startedAt,
    }
  );

  return toProxyResponse(res);
}

export async function GET(req: Request) {
  return proxyMe(req, "");
}

export async function PATCH(req: Request) {
  return proxyMe(req, "");
}

export async function DELETE(req: Request) {
  return proxyMe(req, "");
}
