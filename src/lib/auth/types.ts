/**
 * User role as returned by the backend. String-union mirror of Ager.Domain.Users.UserRole.
 * The backend normalises to lowercase.
 */
export type UserRole = "user" | "admin";

export type AuthResultDto = {
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;     // ISO
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
  /** Lowercase role string. UX hint only — authorisation is enforced server-side. */
  role?: UserRole;
};

export type LoginRequest = {
  email: string;
  password?: string | null;
  otpCode?: string | null;
};

export type RequestLoginOtpCodeRequest = {
  email: string;
};

export type RequestForgotPasswordOtpCodeRequest = {
  email: string;
};

export type OAuthIdTokenRequest = {
  idToken: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  otpCode: string;
  password?: string | null;
};

export type RequestRegisterOtpCodeRequest = {
  username: string;
  email: string;
  honeypot?: string;
  captchaToken?: string | null;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type ResetForgotPasswordRequest = {
  email: string;
  otpCode: string;
  newPassword: string;
};

export type LogoutRequest = {
  refreshToken: string;
};

export type CsrfBootstrapResponse = {
  token: string;
};

export type RequestRestoreOtpCodeRequest = {
  email: string;
};

export type RestoreAccountRequest = {
  email: string;
  otpCode: string;
};

export type PasswordStrengthRequest = {
  password: string;
};

// Mirrors Ager.Application.DTOs.Users.PasswordStrengthResponse: only `score` and
// `suggestions` are sent by the backend. `strength` and `warnings` are optional
// future-proofing fields and must be treated as possibly-undefined at the call site.
export type PasswordStrengthResponse = {
  score: number;
  suggestions: string[];
  strength?: string;
  warnings?: string[];
};
