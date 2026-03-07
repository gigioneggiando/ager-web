import { toProxyResponse } from "@/app/api/auth/_shared";

function getApiBase() {
  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

async function proxyMe(req: Request, extraPath: string) {
  const apiBase = getApiBase();
  const url = new URL(req.url);
  const backendUrl = `${apiBase}/api/me${extraPath}${url.search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;

  const csrf = req.headers.get("x-csrf-token");
  if (csrf) headers["x-csrf-token"] = csrf;

  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;

  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const accept = req.headers.get("accept");
  if (accept) headers["accept"] = accept;

  const method = req.method.toUpperCase();

  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const res = await fetch(backendUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  return toProxyResponse(res);
}

export async function GET(req: Request) {
  return proxyMe(req, "");
}

export async function PATCH(req: Request) {
  return proxyMe(req, "");
}

export async function DELETE(req: Request) {
  return proxyMe(req, "");
}
