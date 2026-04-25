import { ApiError } from "@/lib/api/errors";
import { requestJson, requestVoid } from "@/lib/api/request";
import { clearCsrfTokenCache, getCsrfRequestToken } from "@/lib/api/csrf";
import type {
  AuthResultDto,
  LoginRequest,
  OAuthIdTokenRequest,
  PasswordStrengthRequest,
  PasswordStrengthResponse,
  RegisterRequest,
  RequestForgotPasswordOtpCodeRequest,
  RequestLoginOtpCodeRequest,
  RequestRegisterOtpCodeRequest,
  RequestRestoreOtpCodeRequest,
  RestoreAccountRequest,
  ResetForgotPasswordRequest,
} from "@/lib/auth/types";

export type { LoginRequest, RegisterRequest, AuthResultDto };

// SECURITY: refresh tokens are held exclusively in the HttpOnly `ager_refresh` cookie owned
// by the Next.js edge. We never read/write them in JavaScript to avoid XSS exfiltration.
// These storage keys from earlier versions are cleaned up once per session.
const LEGACY_REFRESH_TOKEN_STORAGE_KEY = "ager.refreshToken";
const LEGACY_REFRESH_TOKEN_EXPIRES_STORAGE_KEY = "ager.refreshTokenExpiresAt";

let refreshSingleFlightPromise: Promise<AuthResultDto> | null = null;
let legacyCleanedUp = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function purgeLegacyRefreshStorage() {
  if (legacyCleanedUp || !isBrowser()) return;
  try {
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_EXPIRES_STORAGE_KEY);
  } catch {
    // storage may be disabled; safe to ignore.
  }
  legacyCleanedUp = true;
}

/** @deprecated Always returns null. Kept only for backwards compatibility. */
export function getStoredRefreshToken(): string | null {
  purgeLegacyRefreshStorage();
  return null;
}

/** @deprecated The refresh cookie is server-managed; client calls are a no-op. */
export function storeRefreshToken(_refreshToken: string | null, _refreshTokenExpiresAt?: string | null) {
  purgeLegacyRefreshStorage();
}

/** @deprecated The refresh cookie is server-managed; client calls are a no-op. */
export function clearStoredRefreshToken() {
  purgeLegacyRefreshStorage();
}

function normalizeAuthResult(data: AuthResultDto): AuthResultDto {
  // Proxy now strips refreshToken from the response. This remains as a belt-and-braces
  // guard: if a legacy backend somehow returns it, we discard it in-flight.
  purgeLegacyRefreshStorage();
  const { refreshToken: _rt, refreshTokenExpiresAt: _rtExp, ...safe } = data;
  void _rt; void _rtExp;
  return safe as AuthResultDto;
}

// Public surface preserved for callers (me.ts, OAuth flows). Implementation is delegated to
// the shared csrf module so request.ts and auth.ts use the exact same cached token.
//
// `accessToken` is forwarded so the antiforgery token-pair gets bound to the authenticated
// user's claims when one is available. ASP.NET will otherwise mint anonymous tokens that
// the backend rejects on the next authenticated state-changing call.
export async function bootstrapCsrf(accessToken: string | null = null, force = false): Promise<string | null> {
  if (force) clearCsrfTokenCache();
  return getCsrfRequestToken(accessToken, force);
}

export async function getCsrfHeaderValue(accessToken: string | null = null): Promise<string | null> {
  return getCsrfRequestToken(accessToken);
}

export async function requestLoginOtp(email: string): Promise<void> {
  await requestVoid("/api/auth/login/request-code", {
    method: "POST",
    body: { email } satisfies RequestLoginOtpCodeRequest,
  });
}

export async function loginWithOtp(email: string, otpCode: string): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await requestJson<AuthResultDto>("/api/auth/login", {
      method: "POST",
      body: { email, otpCode } satisfies LoginRequest,
    })
  );
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await requestJson<AuthResultDto>("/api/auth/login", {
      method: "POST",
      body: { email, password } satisfies LoginRequest,
    })
  );
}

export async function requestRegisterOtp(
  username: string,
  email: string,
  options?: { honeypot?: string; captchaToken?: string | null }
): Promise<void> {
  await requestVoid("/api/auth/register/request-code", {
    method: "POST",
    body: {
      username,
      email,
      honeypot: options?.honeypot ?? "",
      captchaToken: options?.captchaToken ?? null,
    } satisfies RequestRegisterOtpCodeRequest,
  });
}

export async function requestPasswordResetOtp(email: string): Promise<void> {
  await requestVoid("/api/auth/forgot-password/request-code", {
    method: "POST",
    body: { email } satisfies RequestForgotPasswordOtpCodeRequest,
  });
}

export async function resetPassword(email: string, otpCode: string, newPassword: string): Promise<void> {
  await requestVoid("/api/auth/forgot-password/reset", {
    method: "POST",
    body: { email, otpCode, newPassword } satisfies ResetForgotPasswordRequest,
  });
}

export async function registerWithOtp(
  username: string,
  email: string,
  otpCode: string,
  password?: string | null
): Promise<AuthResultDto> {
  const body: RegisterRequest = {
    username,
    email,
    otpCode,
    ...(password ? { password } : {}),
  };

  return normalizeAuthResult(
    await requestJson<AuthResultDto>("/api/auth/register", {
      method: "POST",
      body,
    })
  );
}

export async function oauthGoogle(idToken: string): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await requestJson<AuthResultDto>("/api/auth/oauth/google", {
      method: "POST",
      body: { idToken } satisfies OAuthIdTokenRequest,
    })
  );
}

export async function oauthApple(idToken: string): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await requestJson<AuthResultDto>("/api/auth/oauth/apple", {
      method: "POST",
      body: { idToken } satisfies OAuthIdTokenRequest,
    })
  );
}

// Refresh goes through the Next.js proxy which reads the HttpOnly cookie. The client never
// touches the refresh token directly. The `refreshToken` parameter is retained only as a
// no-op for legacy call sites during rollout.
export async function refresh(_ignored?: string): Promise<AuthResultDto> {
  if (refreshSingleFlightPromise) {
    return refreshSingleFlightPromise;
  }

  purgeLegacyRefreshStorage();

  refreshSingleFlightPromise = (async () => {
    try {
      const data = await requestJson<AuthResultDto>("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      return normalizeAuthResult(data);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        // Nothing to wipe locally — the cookie is cleared server-side on 401.
      }
      throw error;
    }
  })();

  try {
    return await refreshSingleFlightPromise;
  } finally {
    refreshSingleFlightPromise = null;
  }
}

// Logout: access token goes as a Bearer header; refresh token is sent via the HttpOnly cookie
// already attached by the browser. No client-held refresh token is forwarded.
export async function logout(accessToken: string | null): Promise<void> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const csrf = await getCsrfHeaderValue(accessToken).catch(() => null);
  if (csrf) headers["X-CSRF-TOKEN"] = csrf;

  try {
    await requestVoid("/api/auth/logout", {
      method: "POST",
      headers,
    });
  } finally {
    purgeLegacyRefreshStorage();
  }
}

// Back-compat helper for callers that still use a single login(payload).
export async function login(body: LoginRequest): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await requestJson<AuthResultDto>("/api/auth/login", {
      method: "POST",
      body,
    })
  );
}

export async function requestRestoreOtp(email: string): Promise<void> {
  await requestVoid("/api/auth/restore/request-code", {
    method: "POST",
    body: { email } satisfies RequestRestoreOtpCodeRequest,
  });
}

export async function restoreAccount(email: string, otpCode: string): Promise<void> {
  await requestVoid("/api/auth/restore", {
    method: "POST",
    body: { email, otpCode } satisfies RestoreAccountRequest,
  });
}

// Common-weakness heuristics. Kept terse on purpose — the backend does the authoritative
// scoring and adds suggestions. We only need to flag obviously-weak inputs so the score
// gets the correct -1 penalty.
const COMMON_WEAK_TOKENS = [
  "password", "passw0rd", "qwerty", "azerty", "letmein", "admin", "welcome",
  "iloveyou", "monkey", "dragon", "abc123", "111111", "123123", "654321",
];

function detectCommonPattern(value: string): boolean {
  const lower = value.toLowerCase();
  if (COMMON_WEAK_TOKENS.some((t) => lower.includes(t))) return true;
  // Sequential runs of 4+ digits or letters (e.g. "1234", "abcd")
  if (/(?:0123|1234|2345|3456|4567|5678|6789)/.test(lower)) return true;
  if (/(?:abcd|bcde|cdef|defg|qwer|wert|erty|rtyu|asdf|sdfg)/.test(lower)) return true;
  // 4+ identical characters in a row (e.g. "aaaa", "1111")
  if (/(.)\1{3,}/.test(lower)) return true;
  return false;
}

function detectPersonalInfo(value: string, identifiers: ReadonlyArray<string | undefined | null>): boolean {
  const lower = value.toLowerCase();
  for (const raw of identifiers) {
    if (!raw) continue;
    const trimmed = raw.trim().toLowerCase();
    if (trimmed.length < 3) continue;
    if (lower.includes(trimmed)) return true;
    // Email local-part: "alice@example.com" → "alice"
    const at = trimmed.indexOf("@");
    if (at > 2 && lower.includes(trimmed.slice(0, at))) return true;
  }
  return false;
}

export type PasswordStrengthContext = {
  email?: string | null;
  username?: string | null;
};

export async function getPasswordStrength(
  password: string,
  context: PasswordStrengthContext = {}
): Promise<PasswordStrengthResponse> {
  const features: PasswordStrengthRequest = {
    length: password.length,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
    hasCommonPattern: detectCommonPattern(password),
    containsPersonalInfo: detectPersonalInfo(password, [context.email, context.username]),
  };
  return requestJson<PasswordStrengthResponse>("/api/auth/password-strength", {
    method: "POST",
    body: features,
  });
}
