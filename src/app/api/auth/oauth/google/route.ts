import { NextResponse } from "next/server";
import { setRefreshCookie } from "@/lib/auth/cookie";
import type { AuthResultDto } from "@/lib/auth/types";
import { enforceCsrfIfCookiePresent, getApiBase, toSafeErrorResponse } from "@/app/api/auth/_shared";

type OAuthIdTokenRequest = { idToken: string };

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;
const NONCE_COOKIE = "ager_oauth_nonce";

export async function POST(req: Request) {
  const csrfFailure = enforceCsrfIfCookiePresent(req);
  if (csrfFailure) return csrfFailure;

  const body = (await req.json()) as OAuthIdTokenRequest;

  // Forward the nonce cookie to the backend so it can validate the id_token `nonce` claim.
  // The nonce is set by POST /api/auth/oauth/google/begin and is single-use.
  const cookieHeader = req.headers.get("cookie") ?? "";

  const res = await fetch(`${BACKEND_AUTH}/oauth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return toSafeErrorResponse(res, "Google sign-in failed");
  }

  const data = (await res.json()) as AuthResultDto;

  if (data.refreshToken) {
    await setRefreshCookie(data.refreshToken, data.refreshTokenExpiresAt ?? null);
  }

  // Refresh token stays in the HttpOnly cookie.
  const { refreshToken: _rt, refreshTokenExpiresAt: _rtExp, ...safe } = data;
  void _rt; void _rtExp;
  // Best-effort clear the nonce cookie client-side (it's single-use on the backend anyway).
  const response = NextResponse.json(safe);
  response.cookies.set(NONCE_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true });
  return response;
}
