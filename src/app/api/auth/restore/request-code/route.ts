import { NextResponse } from "next/server";
import type { RequestRestoreOtpCodeRequest } from "@/lib/auth/types";
import { enforceCsrfIfCookiePresent, getApiBase, toSafeErrorResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  const csrfFailure = enforceCsrfIfCookiePresent(req);
  if (csrfFailure) return csrfFailure;

  const body = (await req.json()) as RequestRestoreOtpCodeRequest;

  const res = await fetch(`${BACKEND_AUTH}/restore/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return toSafeErrorResponse(res, "Unable to send the code");
  }

  return NextResponse.json({ ok: true });
}
