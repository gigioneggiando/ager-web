import { getApiBase, toProxyResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function GET() {
  const res = await fetch(`${BACKEND_AUTH}/csrf`, {
    method: "GET",
    cache: "no-store",
  });

  return toProxyResponse(res);
}
