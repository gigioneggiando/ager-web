import { NextResponse } from "next/server";

const API_BASE = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

async function proxy(request: Request, id: string, method: "GET" | "PATCH") {
  const authorization = request.headers.get("authorization") ?? undefined;
  const cookie = request.headers.get("cookie") ?? undefined;
  const csrf = request.headers.get("x-csrf-token") ?? undefined;

  const init: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
    },
    cache: "no-store",
  };

  if (method === "PATCH") {
    const body = await request.text();
    init.body = body;
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}/api/admin/sources/${encodeURIComponent(id)}`, init);
  const body = await res.text();
  return new NextResponse(body || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxy(request, id, "GET");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxy(request, id, "PATCH");
}
