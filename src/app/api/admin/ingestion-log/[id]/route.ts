import { NextResponse } from "next/server";

const API_BASE = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = request.headers.get("authorization") ?? undefined;
  const cookie = request.headers.get("cookie") ?? undefined;

  const res = await fetch(`${API_BASE}/api/admin/ingestion-log/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    cache: "no-store",
  });

  const body = await res.text();
  return new NextResponse(body || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
