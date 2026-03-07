import { NextResponse } from "next/server";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "@/lib/auth/cookie";
import type { AuthResultDto, RefreshTokenRequest } from "@/lib/auth/types";
import { getApiBase, toProxyResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  let refreshToken: string | null = null;
  try {
    const body = (await req.json()) as Partial<RefreshTokenRequest>;
    if (typeof body?.refreshToken === "string") refreshToken = body.refreshToken;
  } catch {
    // ignore
  }

  if (!refreshToken) {
    refreshToken = await readRefreshCookie();
  }

  if (!refreshToken) return NextResponse.json({ title: "Unauthorized", status: 401 }, { status: 401 });

  const res = await fetch(`${BACKEND_AUTH}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshToken } satisfies RefreshTokenRequest),
  });

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

  return NextResponse.json(data);
}
