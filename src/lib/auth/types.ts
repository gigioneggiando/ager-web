export type AuthResultDto = {
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: string;     // ISO
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
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

export type PasswordStrengthResponse = {
  score: number;
  strength: string;
  warnings: string[];
  suggestions: string[];
};
