import { NextResponse } from "next/server";
import { getApiBase, toProxyResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

// Kick off the Google OIDC flow. The backend issues a single-use, HttpOnly nonce cookie
// and returns the raw value. The client MUST include that value as the `nonce` parameter
// in the Google Identity Services request; the backend validates it against the cookie
// when the id_token is redeemed.
export async function POST(req: Request) {
  const res = await fetch(`${BACKEND_AUTH}/oauth/google/begin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
  });

  if (!res.ok) return toProxyResponse(res);

  // Propagate Set-Cookie from backend (the nonce cookie) by returning the response as-is.
  const setCookie = res.headers.get("set-cookie");
  const body = await res.text();
  const response = new NextResponse(body, { status: 200, headers: { "content-type": "application/json" } });
  if (setCookie) response.headers.set("set-cookie", setCookie);
  return response;
}
