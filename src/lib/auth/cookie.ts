import { cookies } from "next/headers";

const COOKIE_NAME = "ager_refresh";
export const REFRESH_COOKIE_NAME = COOKIE_NAME;
export const ROLE_COOKIE_NAME = "ager_role";

// 30 days default if backend didn't return an expiry
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Sets the HTTP-only refresh token cookie.
 * Note: cookies() is async on your Next.js version.
 */
export async function setRefreshCookie(token: string, expiresAt?: string | null) {
  const jar = await cookies();

  // Compute maxAge
  let maxAge = DEFAULT_MAX_AGE;
  if (expiresAt) {
    const exp = new Date(expiresAt).getTime();
    const now = Date.now();
    if (exp > now) maxAge = Math.floor((exp - now) / 1000);
  }

  // In dev over http, a secure cookie will be dropped. Toggle accordingly:
  const secure = process.env.NODE_ENV !== "development";

  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge
  });
}

/** Clears the refresh token cookie. */
export async function clearRefreshCookie() {
  const jar = await cookies();
  const secure = process.env.NODE_ENV !== "development";
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0
  });
}

/** Reads the refresh token from the cookie. */
export async function readRefreshCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Non-HttpOnly role hint. Written by auth proxy routes on login/refresh/register/oauth so
 * server components (e.g. the admin layout) can read the current role without a backend
 * roundtrip. Cleared on logout. Readable by JavaScript — this is deliberate: the role value
 * ("user" / "admin") is not sensitive on its own; the backend still enforces every admin
 * endpoint via RequireRole("admin").
 */
export async function setRoleCookie(role: string, expiresAt?: string | null) {
  const jar = await cookies();
  let maxAge = DEFAULT_MAX_AGE;
  if (expiresAt) {
    const exp = new Date(expiresAt).getTime();
    const now = Date.now();
    if (exp > now) maxAge = Math.floor((exp - now) / 1000);
  }
  const secure = process.env.NODE_ENV !== "development";
  jar.set(ROLE_COOKIE_NAME, role, {
    httpOnly: false,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge
  });
}

export async function clearRoleCookie() {
  const jar = await cookies();
  const secure = process.env.NODE_ENV !== "development";
  jar.set(ROLE_COOKIE_NAME, "", {
    httpOnly: false,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0
  });
}

export async function readRoleCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ROLE_COOKIE_NAME)?.value ?? null;
}
