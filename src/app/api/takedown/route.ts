import { NextResponse } from "next/server";

const API_BASE = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

export async function POST(request: Request) {
  const body = await request.text();
  const forwardedFor = request.headers.get("x-forwarded-for") ?? undefined;

  const res = await fetch(`${API_BASE}/api/takedown`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    },
    body,
    cache: "no-store",
  });

  const respBody = await res.text();
  return new NextResponse(respBody || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
