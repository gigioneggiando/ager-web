import { NextResponse } from "next/server";
import type { RestoreAccountRequest } from "@/lib/auth/types";
import { enforceCsrfIfCookiePresent, getApiBase, toSafeErrorResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();

export async function POST(request: Request) {
  const csrfFailure = enforceCsrfIfCookiePresent(request);
  if (csrfFailure) return csrfFailure;

  let body: RestoreAccountRequest;

  try {
    body = (await request.json()) as RestoreAccountRequest;
  } catch {
    return NextResponse.json({ title: "Invalid JSON", status: 400 }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const otpCode = (body.otpCode ?? "").trim();

  if (!email) {
    return NextResponse.json({ title: "Email required", status: 400 }, { status: 400 });
  }
  if (!otpCode) {
    return NextResponse.json({ title: "OTP code required", status: 400 }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/api/auth/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otpCode }),
  });

  if (!res.ok) {
    return toSafeErrorResponse(res, "Account restore failed");
  }

  return NextResponse.json({ ok: true });
}
