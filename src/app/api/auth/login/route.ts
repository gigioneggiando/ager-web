import { NextResponse } from "next/server";
import { setRefreshCookie } from "@/lib/auth/cookie";
import type { AuthResultDto, LoginRequest } from "@/lib/auth/types";
import {
  appendObservabilityHeaders,
  createProxyRequestContext,
  enforceCsrfIfCookiePresent,
  getApiBase,
  logProxyEvent,
  toSafeErrorResponse,
} from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  const csrfFailure = enforceCsrfIfCookiePresent(req);
  if (csrfFailure) return csrfFailure;

  const startedAt = Date.now();
  const requestContext = createProxyRequestContext(req);
  const body = (await req.json()) as LoginRequest;

  const res = await fetch(`${BACKEND_AUTH}/login`, {
    method: "POST",
    headers: appendObservabilityHeaders({ "Content-Type": "application/json" }, requestContext),
    body: JSON.stringify(body),
  });

  logProxyEvent(
    res.ok ? "Information" : "Warning",
    "proxy_request_completed",
    "Auth login proxy request completed.",
    {
      request_id: requestContext.requestId,
      correlation_id: requestContext.correlationId,
      upstream_path: "/api/auth/login",
      status_code: res.status,
      duration_ms: Date.now() - startedAt,
    }
  );

  if (!res.ok) {
    return toSafeErrorResponse(res, "Login failed");
  }

  const data = (await res.json()) as AuthResultDto;

  if (data.refreshToken) {
    await setRefreshCookie(data.refreshToken, data.refreshTokenExpiresAt ?? null);
  }

  // Never return the refresh token to the browser. It's held in an HttpOnly cookie on the
  // Next.js edge; the client never needs to see or persist it.
  const { refreshToken: _rt, refreshTokenExpiresAt: _rtExp, ...safe } = data;
  void _rt; void _rtExp;
  return NextResponse.json(safe);
}
