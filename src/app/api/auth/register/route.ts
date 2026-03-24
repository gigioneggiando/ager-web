import { NextResponse } from "next/server";
import { setRefreshCookie } from "@/lib/auth/cookie";
import type { AuthResultDto, RegisterRequest } from "@/lib/auth/types";
import {
  appendForwardedHeaders,
  appendObservabilityHeaders,
  createProxyRequestContext,
  getApiBase,
  logProxyEvent,
  toProxyResponse,
} from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  const startedAt = Date.now();
  const requestContext = createProxyRequestContext(req);
  const body = (await req.json()) as RegisterRequest;

  const res = await fetch(`${BACKEND_AUTH}/register`, {
    method: "POST",
    headers: appendForwardedHeaders(
      appendObservabilityHeaders({ "Content-Type": "application/json" }, requestContext),
      req
    ),
    body: JSON.stringify(body),
  });

  logProxyEvent(
    res.ok ? "Information" : "Warning",
    "proxy_request_completed",
    "Auth register proxy request completed.",
    {
      request_id: requestContext.requestId,
      correlation_id: requestContext.correlationId,
      upstream_path: "/api/auth/register",
      status_code: res.status,
      duration_ms: Date.now() - startedAt,
    }
  );

  if (!res.ok) {
    return toProxyResponse(res);
  }

  const data = (await res.json()) as AuthResultDto;

  if (data.refreshToken) {
    await setRefreshCookie(data.refreshToken, data.refreshTokenExpiresAt ?? null);
  }

  return NextResponse.json(data);
}
