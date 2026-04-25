// Shared CSRF bootstrap. Imported by both `request.ts` and `auth.ts` so neither needs the
// other for token resolution.
//
// Why this exists:
//   ASP.NET Core's antiforgery is NOT a plain double-submit cookie scheme. It generates a
//   pair (cookieToken, requestToken) that are cryptographically related but distinct. The
//   `XSRF-TOKEN` cookie carries the cookieToken; the `X-CSRF-TOKEN` header MUST carry the
//   requestToken returned by GET /api/auth/csrf. Mirroring the cookie value into the header
//   makes the cookieToken === header check fail at `Antiforgery.ValidateRequestAsync` →
//   AntiforgeryValidationException → 403.
//
//   Earlier code in request.ts read the cookie value and put it in the header; it worked
//   for the Next.js edge proxy (`enforceCsrfIfCookiePresent` in api/auth/_shared.ts, which
//   IS plain double-submit) but always failed on the .NET backend for non-proxy routes.

let cachedToken: string | null = null;
let inFlight: Promise<string | null> | null = null;

type CsrfResponse = { token?: string | null };

async function fetchToken(accessToken: string | null): Promise<string | null> {
  // Use raw fetch (not requestJson from request.ts) to avoid an import cycle.
  // credentials: "include" so the response Set-Cookie for XSRF-TOKEN actually lands.
  //
  // Critical: when an access token is available we MUST forward it on the bootstrap call.
  // ASP.NET antiforgery binds the (cookieToken, requestToken) pair to the authenticated
  // user's claims. A bootstrap done anonymously yields a pair that the backend will
  // reject when the actual state-changing request arrives with a Bearer header — the
  // identity at validation time differs from the identity at minting time.
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch("/api/auth/csrf", {
      method: "GET",
      credentials: "include",
      headers,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CsrfResponse;
    return data?.token ?? null;
  } catch {
    return null;
  }
}

export async function getCsrfRequestToken(
  accessToken: string | null = null,
  force = false
): Promise<string | null> {
  if (!force && cachedToken) return cachedToken;
  if (!force && inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const token = await fetchToken(accessToken);
      cachedToken = token;
      return token;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function clearCsrfTokenCache(): void {
  cachedToken = null;
}

// Synchronous read of the currently-cached token. Returns null until the first
// async bootstrap has completed. Useful for fast-paths where we don't want to
// await network on every request — request.ts uses this when the cache is warm.
export function peekCachedCsrfToken(): string | null {
  return cachedToken;
}
