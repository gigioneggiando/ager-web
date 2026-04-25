import { getApiBase, toProxyResponse } from "@/app/api/auth/_shared";

const API_BASE = getApiBase();
const BACKEND_AUTH = `${API_BASE}/api/auth`;

export async function GET(req: Request) {
  // Forward the Authorization header so the backend mints an antiforgery token-pair
  // bound to the authenticated user. Without this the proxy strips the bearer and the
  // backend always sees an anonymous bootstrap, producing tokens that fail validation
  // on the next state-changing call (which DOES carry the bearer).
  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers.authorization = auth;

  const res = await fetch(`${BACKEND_AUTH}/csrf`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  return toProxyResponse(res);
}
