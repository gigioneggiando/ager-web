import { parseApiError } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/errors";
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

function readStoredRefreshToken(): { token: string | null; expiresAt: string | null } {
  if (inMemoryRefreshToken) {
    return { token: inMemoryRefreshToken, expiresAt: inMemoryRefreshTokenExpiresAt };
  }

  if (!isBrowser()) return { token: null, expiresAt: null };

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

async function postJson<T>(path: string, body?: unknown, headers?: HeadersInit): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) throw await parseApiError(res);
  return (await res.json()) as T;
}

async function postNoContent(path: string, body?: unknown, headers?: HeadersInit): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiError(res);
}

async function getJson<T>(path: string, headers?: HeadersInit): Promise<T> {
  const res = await fetch(path, {
    method: "GET",
    headers: { ...(headers ?? {}) },
  });

  if (!res.ok) throw await parseApiError(res);
  return (await res.json()) as T;
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
    const data = await getJson<CsrfBootstrapResponse>("/api/auth/csrf");
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
  await postNoContent("/api/auth/login/request-code", { email } satisfies RequestLoginOtpCodeRequest);
}

export async function loginWithOtp(email: string, otpCode: string): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await postJson<AuthResultDto>("/api/auth/login", { email, otpCode } satisfies LoginRequest)
  );
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await postJson<AuthResultDto>("/api/auth/login", { email, password } satisfies LoginRequest)
  );
}

export async function requestRegisterOtp(username: string, email: string): Promise<void> {
  await postNoContent("/api/auth/register/request-code", { username, email } satisfies RequestRegisterOtpCodeRequest);
}

export async function requestPasswordResetOtp(email: string): Promise<void> {
  await postNoContent(
    "/api/auth/forgot-password/request-code",
    { email } satisfies RequestForgotPasswordOtpCodeRequest
  );
}

export async function resetPassword(email: string, otpCode: string, newPassword: string): Promise<void> {
  await postNoContent(
    "/api/auth/forgot-password/reset",
    { email, otpCode, newPassword } satisfies ResetForgotPasswordRequest
  );
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

  return normalizeAuthResult(await postJson<AuthResultDto>("/api/auth/register", body));
}

export async function oauthGoogle(idToken: string): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await postJson<AuthResultDto>(
      "/api/auth/oauth/google",
      { idToken } satisfies OAuthIdTokenRequest
    )
  );
}

export async function oauthApple(idToken: string): Promise<AuthResultDto> {
  return normalizeAuthResult(
    await postJson<AuthResultDto>(
      "/api/auth/oauth/apple",
      { idToken } satisfies OAuthIdTokenRequest
    )
  );
}

// Refresh token is client-managed and rotated on every successful refresh.
export async function refresh(refreshToken?: string): Promise<AuthResultDto> {
  if (refreshSingleFlightPromise) {
    return refreshSingleFlightPromise;
  }

  const stored = readStoredRefreshToken().token;
  const tokenToUse = refreshToken ?? stored;

  if (!tokenToUse) {
    throw new ApiError("No refresh token", 401, "refresh_token_missing");
  }

  refreshSingleFlightPromise = (async () => {
    let data: AuthResultDto;
    try {
      data = await postJson<AuthResultDto>("/api/auth/refresh", { refreshToken: tokenToUse });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.status === 401) {
        clearStoredRefreshToken();
      }
      throw error;
    }

    if (!data.refreshToken) {
      clearStoredRefreshToken();
      throw new ApiError("Refresh token missing in refresh response", 401, "refresh_token_rotation_missing");
    }

    return normalizeAuthResult(data);
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
    await postNoContent(
      "/api/auth/logout",
      tokenToUse ? { refreshToken: tokenToUse } : undefined,
      headers
    );
  } finally {
    clearStoredRefreshToken();
  }
}

// Back-compat helper for callers that still use a single login(payload).
export async function login(body: LoginRequest): Promise<AuthResultDto> {
  return normalizeAuthResult(await postJson<AuthResultDto>("/api/auth/login", body));
}

export async function requestRestoreOtp(email: string): Promise<void> {
  await postNoContent("/api/auth/restore/request-code", { email } satisfies RequestRestoreOtpCodeRequest);
}

export async function restoreAccount(email: string, otpCode: string): Promise<void> {
  await postNoContent("/api/auth/restore", { email, otpCode } satisfies RestoreAccountRequest);
}

export async function getPasswordStrength(password: string): Promise<PasswordStrengthResponse> {
  return postJson<PasswordStrengthResponse>(
    "/api/auth/password-strength",
    { password } satisfies PasswordStrengthRequest
  );
}
