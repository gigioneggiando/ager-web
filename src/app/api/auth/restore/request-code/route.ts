import { NextResponse } from "next/server";
import type { RequestRestoreOtpCodeRequest } from "@/lib/auth/types";
import { getApiBase, toProxyResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  const body = (await req.json()) as RequestRestoreOtpCodeRequest;

  const res = await fetch(`${BACKEND_AUTH}/restore/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return toProxyResponse(res);
  }

  const data = await safeJson(res);
  return NextResponse.json(data ?? { ok: true });
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
