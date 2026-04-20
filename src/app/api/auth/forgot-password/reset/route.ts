import { NextResponse } from "next/server";
import type { ResetForgotPasswordRequest } from "@/lib/auth/types";
import { enforceCsrfIfCookiePresent, getApiBase, toSafeErrorResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  const csrfFailure = enforceCsrfIfCookiePresent(req);
  if (csrfFailure) return csrfFailure;

  const body = (await req.json()) as ResetForgotPasswordRequest;

  const res = await fetch(`${BACKEND_AUTH}/forgot-password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return toSafeErrorResponse(res, "Password reset failed");
  }

  return NextResponse.json({ ok: true });
}
