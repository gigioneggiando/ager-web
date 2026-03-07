import { NextResponse } from "next/server";
import { readRefreshCookie, clearRefreshCookie } from "@/lib/auth/cookie";
import type { LogoutRequest } from "@/lib/auth/types";
import { getApiBase, pickRequestHeaders, toProxyResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  const refreshCookie = await readRefreshCookie();

  let refreshToken: string | null = refreshCookie;
  if (!refreshToken) {
    try {
      const body = (await req.json()) as Partial<LogoutRequest>;
      if (typeof body?.refreshToken === "string") refreshToken = body.refreshToken;
    } catch {
      // ignore
    }
  }

  if (refreshToken) {
    try {
      const upstream = await fetch(`${BACKEND_AUTH}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...pickRequestHeaders(req, ["authorization", "x-csrf-token", "cookie"]),
        },
        body: JSON.stringify({ refreshToken: refreshToken } satisfies LogoutRequest),
      });

      await clearRefreshCookie();
      return toProxyResponse(upstream);
    } catch {
      // ignore network errors on logout
    }
  }

  await clearRefreshCookie();
  return NextResponse.json({ ok: true });
}
