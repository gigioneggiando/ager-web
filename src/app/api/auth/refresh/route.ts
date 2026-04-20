import { NextResponse } from "next/server";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "@/lib/auth/cookie";
import type { AuthResultDto, RefreshTokenRequest } from "@/lib/auth/types";
import {
  appendObservabilityHeaders,
  createProxyRequestContext,
  enforceCsrfIfCookiePresent,
  getApiBase,
  logProxyEvent,
  toProxyResponse,
} from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  const csrfFailure = enforceCsrfIfCookiePresent(req);
  if (csrfFailure) return csrfFailure;

  const startedAt = Date.now();
  const requestContext = createProxyRequestContext(req);

  // The refresh token is the HttpOnly cookie only. We NO LONGER accept a refresh token
  // provided in the request body — it must come from the browser cookie.
  const refreshToken = await readRefreshCookie();
  if (!refreshToken) return NextResponse.json({ title: "Unauthorized", status: 401 }, { status: 401 });

  const res = await fetch(`${BACKEND_AUTH}/refresh`, {
    method: "POST",
    headers: appendObservabilityHeaders({ "Content-Type": "application/json" }, requestContext),
    body: JSON.stringify({ refreshToken } satisfies RefreshTokenRequest),
  });

  logProxyEvent(
    res.ok ? "Information" : "Warning",
    "proxy_request_completed",
    "Auth refresh proxy request completed.",
    {
      request_id: requestContext.requestId,
      correlation_id: requestContext.correlationId,
      upstream_path: "/api/auth/refresh",
      status_code: res.status,
      duration_ms: Date.now() - startedAt,
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      await clearRefreshCookie();
    }
    return toProxyResponse(res);
  }

  const data = (await res.json()) as AuthResultDto;

  if (data.refreshToken) {
    await setRefreshCookie(data.refreshToken, data.refreshTokenExpiresAt ?? null);
  }

  // Do not expose the rotated refresh token to the browser.
  const { refreshToken: _rt, refreshTokenExpiresAt: _rtExp, ...safe } = data;
  void _rt; void _rtExp;
  return NextResponse.json(safe);
}
