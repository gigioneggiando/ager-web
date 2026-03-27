import { ApiError } from "@/lib/api/errors";
import { requestJson, requestVoid } from "@/lib/api/request";
import type {
  AuthResultDto,
  CsrfBootstrapResponse,
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

const REFRESH_TOKEN_STORAGE_KEY = "ager.refreshToken";
const REFRESH_TOKEN_EXPIRES_STORAGE_KEY = "ager.refreshTokenExpiresAt";

let inMemoryRefreshToken: string | null = null;
let inMemoryRefreshTokenExpiresAt: string | null = null;
let csrfToken: string | null = null;
let csrfBootstrapPromise: Promise<string | null> | null = null;
let refreshSingleFlightPromise: Promise<AuthResultDto> | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

  function isRefreshTokenUsable(expiresAt: string | null): boolean {
    if (!expiresAt) return true; // unknown expiry — optimistically try
    const exp = new Date(expiresAt).getTime();
    return !Number.isNaN(exp) && exp > Date.now() + 5_000;
  }

function readStoredRefreshToken(): { token: string | null; expiresAt: string | null } {
  if (!isBrowser()) {
    return { token: inMemoryRefreshToken, expiresAt: inMemoryRefreshTokenExpiresAt };
  }

  const token = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  const expiresAt = window.localStorage.getItem(REFRESH_TOKEN_EXPIRES_STORAGE_KEY);
  inMemoryRefreshToken = token;
  inMemoryRefreshTokenExpiresAt = expiresAt;
  return { token, expiresAt };
}

export function storeRefreshToken(refreshToken: string | null, refreshTokenExpiresAt?: string | null) {
  inMemoryRefreshToken = refreshToken;
  inMemoryRefreshTokenExpiresAt = refreshTokenExpiresAt ?? null;

  if (!isBrowser()) return;

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    if (refreshTokenExpiresAt) {
      window.localStorage.setItem(REFRESH_TOKEN_EXPIRES_STORAGE_KEY, refreshTokenExpiresAt);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_EXPIRES_STORAGE_KEY);
    }
    return;
  }

  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_EXPIRES_STORAGE_KEY);
}

export function clearStoredRefreshToken() {
  storeRefreshToken(null, null);
}

export function getStoredRefreshToken(): string | null {
  return readStoredRefreshToken().token;
}

function normalizeAuthResult(data: AuthResultDto): AuthResultDto {
  if (data.refreshToken) {
    storeRefreshToken(data.refreshToken, data.refreshTokenExpiresAt ?? null);
  }
  return data;
}

export async function bootstrapCsrf(force = false): Promise<string | null> {
  if (!force && csrfToken) return csrfToken;

  if (!force && csrfBootstrapPromise) return csrfBootstrapPromise;

  csrfBootstrapPromise = (async () => {
    const data = await requestJson<CsrfBootstrapResponse>("/api/auth/csrf");
    csrfToken = data.token ?? null;
    return csrfToken;
  })();

  try {
    return await csrfBootstrapPromise;
  } finally {
    csrfBootstrapPromise = null;
  }
}

export async function getCsrfHeaderValue(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  return bootstrapCsrf();
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

// Refresh token is client-managed and rotated on every successful refresh.
export async function refresh(refreshToken?: string): Promise<AuthResultDto> {
  if (refreshSingleFlightPromise) {
    return refreshSingleFlightPromise;
  }

  const stored = readStoredRefreshToken();
  const storedToken = stored.token && isRefreshTokenUsable(stored.expiresAt) ? stored.token : null;
  const tokenToUse = refreshToken ?? storedToken;

  refreshSingleFlightPromise = (async () => {
    let data: AuthResultDto;
    try {
      data = tokenToUse
        ? await requestJson<AuthResultDto>("/api/auth/refresh", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            body: { refreshToken: tokenToUse },
          })
        : await requestJson<AuthResultDto>("/api/auth/refresh", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
          });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        clearStoredRefreshToken();
      }
      throw error;
    }

    // Support both modes:
    // 1) token in body with rotation
    // 2) HttpOnly cookie-only refresh (no token in JSON response)
    if (data.refreshToken) {
      return normalizeAuthResult(data);
    }

    return data;
  })();

  try {
    return await refreshSingleFlightPromise;
  } finally {
    refreshSingleFlightPromise = null;
  }
}

// Logout forwards Authorization + refreshToken cookie to backend.
export async function logout(accessToken: string | null, refreshToken?: string): Promise<void> {
  const stored = readStoredRefreshToken().token;
  const tokenToUse = refreshToken ?? stored;

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const csrf = await getCsrfHeaderValue().catch(() => null);
  if (csrf) headers["X-CSRF-TOKEN"] = csrf;

  try {
    await requestVoid("/api/auth/logout", {
      method: "POST",
      body: tokenToUse ? { refreshToken: tokenToUse } : undefined,
      headers,
      retryOnAuthError: false,
    });
  } finally {
    clearStoredRefreshToken();
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

export async function getPasswordStrength(password: string): Promise<PasswordStrengthResponse> {
  return requestJson<PasswordStrengthResponse>("/api/auth/password-strength", {
    method: "POST",
    body: { password } satisfies PasswordStrengthRequest,
  });
}
