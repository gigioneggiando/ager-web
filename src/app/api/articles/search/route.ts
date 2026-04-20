import { NextResponse } from "next/server";
import { toSafeErrorResponse } from "@/app/api/auth/_shared";

const API_BASE = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  ""
);
const BACKEND = `${API_BASE}/api/articles/search`;

// Edge-clamp query parameters before hitting the backend — defense in depth on top of the
// backend's own validation, and prevents obviously-abusive inputs from being logged.
const MAX_QUERY_LENGTH = 500;
const MAX_PAGE = 100_000;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawQ = (url.searchParams.get("q") ?? "").trim();
  if (!rawQ) {
    return NextResponse.json({ message: "Query parameter 'q' is required." }, { status: 400 });
  }
  if (rawQ.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ message: "Query too long." }, { status: 400 });
  }

  const page = clampInt(url.searchParams.get("page"), DEFAULT_PAGE, 1, MAX_PAGE);
  const pageSize = clampInt(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);

  const backendUrl = new URL(BACKEND);
  backendUrl.searchParams.set("q", rawQ);
  backendUrl.searchParams.set("page", String(page));
  backendUrl.searchParams.set("pageSize", String(pageSize));

  const lang = url.searchParams.get("lang");
  if (lang && /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,8})?$/.test(lang)) {
    backendUrl.searchParams.set("lang", lang);
  }

  const authHeader = req.headers.get("authorization");

  let res: Response;
  try {
    res = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Backend unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    // Normalised error — never echo raw backend body.
    return toSafeErrorResponse(res, "Search failed");
  }

  const data = await res.json();
  return NextResponse.json(data);
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw == null ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
