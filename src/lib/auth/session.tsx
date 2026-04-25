"use client";

import { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ApiError } from "@/lib/api/errors";
import {
  login as apiLogin,
  refresh as apiRefresh,
  logout as apiLogout,
  registerWithOtp as apiRegisterWithOtp,
  requestLoginOtp as apiRequestLoginOtp,
  requestRegisterOtp as apiRequestRegisterOtp,
  oauthGoogle as apiOauthGoogle,
  oauthApple as apiOauthApple,
} from "@/lib/api/auth";
import { clearCsrfTokenCache } from "@/lib/api/csrf";
import type { UserRole } from "@/lib/auth/types";

type SessionState = {
  ready: boolean;
  userId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  /** Lowercase role returned by the backend. Null until the first auth response arrives. */
  role: UserRole | null;
};

function normaliseRole(role: string | undefined | null): UserRole | null {
  return role === "admin" || role === "user" ? role : null;
}

type AuthActions = {
  requestLoginOtp: (email: string) => Promise<void>;
  login: (payload: { email: string; password?: string | null; otpCode?: string | null }) => Promise<void>;
  requestRegisterOtp: (payload: {
    username: string;
    email: string;
    honeypot?: string;
    captchaToken?: string | null;
  }) => Promise<void>;
  register: (payload: { username: string; email: string; otpCode: string; password?: string | null }) => Promise<void>;
  oauthGoogle: (idToken: string) => Promise<void>;
  oauthApple: (idToken: string) => Promise<void>;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
};

const SessionCtx = createContext<SessionState | null>(null);
const ActionsCtx = createContext<AuthActions | null>(null);

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredSession(): SessionState {
  // Keep access tokens in memory only. On reload, re-hydrate via refresh-cookie flow.
  return { ready: false, userId: null, accessToken: null, accessTokenExpiresAt: null, role: null };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(() => readStoredSession());
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  const updateSession = useCallback((next: SessionState) => {
    setState(next);
  }, []);

  const clearSession = useCallback(() => {
    updateSession({ ready: true, userId: null, accessToken: null, accessTokenExpiresAt: null, role: null });
  }, [updateSession]);

  const runRefresh = useCallback(async (options?: { clearOnUnauthorized?: boolean }): Promise<string | null> => {
    const clearOnUnauthorized = options?.clearOnUnauthorized ?? true;

    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const inFlight = (async () => {
      try {
        const data = await apiRefresh();
        updateSession({
          ready: true,
          userId: data.userId,
          accessToken: data.accessToken,
          accessTokenExpiresAt: data.accessTokenExpiresAt,
          role: normaliseRole(data.role)
        });
        return data.accessToken ?? null;
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError?.status === 401 && clearOnUnauthorized) {
          clearSession();
        }
        throw error;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = inFlight;
    return inFlight;
  }, [clearSession, updateSession]);

  const refresh = useCallback(async (): Promise<string | null> => {
    return runRefresh();
  }, [runRefresh]);

  // On full page reload, SessionProvider state resets. Re-hydrate only when the access token is missing/expired.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextToken = await runRefresh();
        if (cancelled) return;
        if (!nextToken) clearSession();
      } catch {
        if (cancelled) return;
        clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runRefresh, clearSession]);

    // Proactive refresh: schedule a silent token renewal 60 seconds before the access token expires.
    // This keeps the session alive for users who remain on the page.
    useEffect(() => {
      if (!isBrowser() || !state.ready || !state.accessToken || !state.accessTokenExpiresAt) return;

      const expiresAtMs = new Date(state.accessTokenExpiresAt).getTime();
      if (Number.isNaN(expiresAtMs)) return;

      const delayMs = expiresAtMs - 60_000 - Date.now(); // fire 60 s before expiry
      if (delayMs <= 0) {
        // Already within 60 s of expiry — refresh immediately (no-op if in-flight)
        runRefresh({ clearOnUnauthorized: false }).catch(() => {});
        return;
      }

      const id = window.setTimeout(() => {
        runRefresh({ clearOnUnauthorized: false }).catch(() => {});
      }, delayMs);

      return () => window.clearTimeout(id);
    }, [state.ready, state.accessToken, state.accessTokenExpiresAt, runRefresh]);

  const requestLoginOtp = useCallback(async (email: string) => {
    await apiRequestLoginOtp(email);
  }, []);

  const login = useCallback(async (payload: { email: string; password?: string | null; otpCode?: string | null }) => {
    const hasPassword = !!payload.password;
    const hasOtp = !!payload.otpCode;
    if (!hasPassword && !hasOtp) {
      throw new ApiError("Missing credentials", 400, "missing_credentials");
    }

    const data = await apiLogin(payload);
    // Identity changed: invalidate any cached antiforgery token. ASP.NET binds the
    // (cookieToken, requestToken) pair to the user's claims; an anonymous-session token
    // won't validate once the JWT carries a real `sub`.
    clearCsrfTokenCache();
    updateSession({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt, role: normaliseRole(data.role) });
  }, [updateSession]);

  const requestRegisterOtp = useCallback(async (payload: {
    username: string;
    email: string;
    honeypot?: string;
    captchaToken?: string | null;
  }) => {
    await apiRequestRegisterOtp(payload.username, payload.email, {
      honeypot: payload.honeypot,
      captchaToken: payload.captchaToken ?? null,
    });
  }, []);

  const register = useCallback(async (payload: { username: string; email: string; otpCode: string; password?: string | null }) => {
    const data = await apiRegisterWithOtp(payload.username, payload.email, payload.otpCode, payload.password);
    clearCsrfTokenCache();
    updateSession({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt, role: normaliseRole(data.role) });
  }, [updateSession]);

  const oauthGoogle = useCallback(async (idToken: string) => {
    const data = await apiOauthGoogle(idToken);
    clearCsrfTokenCache();
    updateSession({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt, role: normaliseRole(data.role) });
  }, [updateSession]);

  const oauthApple = useCallback(async (idToken: string) => {
    const data = await apiOauthApple(idToken);
    clearCsrfTokenCache();
    updateSession({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt, role: normaliseRole(data.role) });
  }, [updateSession]);

  const logout = useCallback(async () => {
    try {
      await apiLogout(state.accessToken);
    } finally {
      clearCsrfTokenCache();
      clearSession();
    }
  }, [state.accessToken, clearSession]);

  const actions = useMemo<AuthActions>(
    () => ({ requestLoginOtp, login, requestRegisterOtp, register, oauthGoogle, oauthApple, refresh, logout }),
    [requestLoginOtp, login, requestRegisterOtp, register, oauthGoogle, oauthApple, refresh, logout]
  );

  return (
    <SessionCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </SessionCtx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function useAuthActions() {
  const ctx = useContext(ActionsCtx);
  if (!ctx) throw new Error("useAuthActions must be used within SessionProvider");
  return ctx;
}
