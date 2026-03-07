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

type SessionState = {
  ready: boolean;
  userId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
};

type AuthActions = {
  requestLoginOtp: (email: string) => Promise<void>;
  login: (payload: { email: string; password?: string | null; otpCode?: string | null }) => Promise<void>;
  requestRegisterOtp: (payload: { username: string; email: string }) => Promise<void>;
  register: (payload: { username: string; email: string; otpCode: string; password?: string | null }) => Promise<void>;
  oauthGoogle: (idToken: string) => Promise<void>;
  oauthApple: (idToken: string) => Promise<void>;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
};

const SessionCtx = createContext<SessionState | null>(null);
const ActionsCtx = createContext<AuthActions | null>(null);

const SESSION_USER_ID_STORAGE_KEY = "ager.session.userId";
const SESSION_ACCESS_TOKEN_STORAGE_KEY = "ager.session.accessToken";
const SESSION_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY = "ager.session.accessTokenExpiresAt";

function isBrowser() {
  return typeof window !== "undefined";
}

function hasUsableAccessToken(expiresAt: string | null) {
  if (!expiresAt) return false;
  const expiryTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) return false;
  return expiryTime > Date.now() + 15_000;
}

function readStoredSession(): SessionState {
  if (!isBrowser()) {
    return { ready: false, userId: null, accessToken: null, accessTokenExpiresAt: null };
  }

  const userId = window.localStorage.getItem(SESSION_USER_ID_STORAGE_KEY);
  const accessToken = window.localStorage.getItem(SESSION_ACCESS_TOKEN_STORAGE_KEY);
  const accessTokenExpiresAt = window.localStorage.getItem(SESSION_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);

  if (accessToken && hasUsableAccessToken(accessTokenExpiresAt)) {
    return {
      ready: true,
      userId,
      accessToken,
      accessTokenExpiresAt,
    };
  }

  if (isBrowser()) {
    window.localStorage.removeItem(SESSION_USER_ID_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
  }

  return { ready: false, userId: null, accessToken: null, accessTokenExpiresAt: null };
}

function persistSession(next: Omit<SessionState, "ready">) {
  if (!isBrowser()) return;

  if (next.userId && next.accessToken && next.accessTokenExpiresAt) {
    window.localStorage.setItem(SESSION_USER_ID_STORAGE_KEY, next.userId);
    window.localStorage.setItem(SESSION_ACCESS_TOKEN_STORAGE_KEY, next.accessToken);
    window.localStorage.setItem(SESSION_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY, next.accessTokenExpiresAt);
    return;
  }

  window.localStorage.removeItem(SESSION_USER_ID_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(() => readStoredSession());
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
  const bootStateRef = useRef(state);

  const updateSession = useCallback((next: SessionState) => {
    setState(next);
    persistSession({
      userId: next.userId,
      accessToken: next.accessToken,
      accessTokenExpiresAt: next.accessTokenExpiresAt,
    });
  }, []);

  const clearSession = useCallback(() => {
    updateSession({ ready: true, userId: null, accessToken: null, accessTokenExpiresAt: null });
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
          accessTokenExpiresAt: data.accessTokenExpiresAt
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

  // On full page reload, SessionProvider state resets. Re-hydrate via refresh token flow.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (bootStateRef.current.accessToken && hasUsableAccessToken(bootStateRef.current.accessTokenExpiresAt)) {
        try {
          await runRefresh({ clearOnUnauthorized: false });
        } catch {
          // Keep the stored access token until it actually expires or a protected request fails.
        }
        return;
      }

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
    updateSession({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt });
  }, [updateSession]);

  const requestRegisterOtp = useCallback(async (payload: { username: string; email: string }) => {
    await apiRequestRegisterOtp(payload.username, payload.email);
  }, []);

  const register = useCallback(async (payload: { username: string; email: string; otpCode: string; password?: string | null }) => {
    const data = await apiRegisterWithOtp(payload.username, payload.email, payload.otpCode, payload.password);
    updateSession({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt });
  }, [updateSession]);

  const oauthGoogle = useCallback(async (idToken: string) => {
    const data = await apiOauthGoogle(idToken);
    updateSession({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt });
  }, [updateSession]);

  const oauthApple = useCallback(async (idToken: string) => {
    const data = await apiOauthApple(idToken);
    updateSession({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt });
  }, [updateSession]);

  const logout = useCallback(async () => {
    try {
      await apiLogout(state.accessToken);
    } finally {
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
