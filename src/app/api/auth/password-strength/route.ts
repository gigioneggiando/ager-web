import { getApiBase, toProxyResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function POST(req: Request) {
  const body = await req.text();

  const res = await fetch(`${BACKEND_AUTH}/password-strength`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  return toProxyResponse(res);
}
