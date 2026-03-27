"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import { configureAuthRetryHandlers } from "@/lib/api/request";
import {
  login as apiLogin,
  logout as apiLogout,
  oauthApple as apiOauthApple,
  oauthGoogle as apiOauthGoogle,
  refresh as apiRefresh,
  registerWithOtp as apiRegisterWithOtp,
  requestLoginOtp as apiRequestLoginOtp,
  requestRegisterOtp as apiRequestRegisterOtp,
} from "@/lib/api/auth";

type SessionStatus = "initializing" | "authenticated" | "anonymous" | "refreshing";

type SessionState = {
  ready: boolean;
  status: SessionStatus;
  userId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
};

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
  return {
    ready: false,
    status: "initializing",
    userId: null,
    accessToken: null,
    accessTokenExpiresAt: null,
  };
}

function hasUsableAccessToken(expiresAt: string | null) {
  if (!expiresAt) return false;

  const expiryTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) return false;

  return expiryTime > Date.now() + 15_000;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(() => readStoredSession());
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateSession = useCallback((next: SessionState) => {
    setState(next);
  }, []);

  const clearSession = useCallback(() => {
    updateSession({
      ready: true,
      status: "anonymous",
      userId: null,
      accessToken: null,
      accessTokenExpiresAt: null,
    });
  }, [updateSession]);

  const runRefresh = useCallback(async (options?: { clearOnUnauthorized?: boolean }): Promise<string | null> => {
    const clearOnUnauthorized = options?.clearOnUnauthorized ?? true;

    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const previousState = stateRef.current;
    setState((current) => ({
      ...current,
      status: current.ready ? "refreshing" : "initializing",
    }));

    const inFlight = (async () => {
      try {
        const data = await apiRefresh();
        updateSession({
          ready: true,
          status: "authenticated",
          userId: data.userId,
          accessToken: data.accessToken,
          accessTokenExpiresAt: data.accessTokenExpiresAt,
        });
        return data.accessToken ?? null;
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError?.status === 401 && clearOnUnauthorized) {
          clearSession();
        } else {
          setState((current) => ({
            ...current,
            ready: previousState.ready,
            status: previousState.status,
          }));
        }
        throw error;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = inFlight;
    return inFlight;
  }, [clearSession, updateSession]);

  const refresh = useCallback(async (): Promise<string | null> => runRefresh(), [runRefresh]);

  useEffect(() => {
    configureAuthRetryHandlers({
      getAccessToken: () => stateRef.current.accessToken,
      refreshAccessToken: () => runRefresh(),
    });

    return () => {
      configureAuthRetryHandlers(null);
    };
  }, [runRefresh]);

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

  useEffect(() => {
    if (!isBrowser() || !state.ready || !state.accessToken || !state.accessTokenExpiresAt) return;

    const expiresAtMs = new Date(state.accessTokenExpiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) return;

    const delayMs = expiresAtMs - 60_000 - Date.now();
    if (delayMs <= 0) {
      runRefresh({ clearOnUnauthorized: false }).catch(() => {});
      return;
    }

    const id = window.setTimeout(() => {
      runRefresh({ clearOnUnauthorized: false }).catch(() => {});
    }, delayMs);

    return () => window.clearTimeout(id);
  }, [state.ready, state.accessToken, state.accessTokenExpiresAt, runRefresh]);

  useEffect(() => {
    if (!isBrowser()) return;

    const tryRecoverSession = () => {
      const current = stateRef.current;
      if (current.status === "anonymous") return;
      if (refreshInFlightRef.current) return;

      if (!current.accessToken || !hasUsableAccessToken(current.accessTokenExpiresAt)) {
        runRefresh().catch(() => {});
      }
    };

    const onFocus = () => {
      tryRecoverSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tryRecoverSession();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [runRefresh]);

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
    updateSession({
      ready: true,
      status: "authenticated",
      userId: data.userId,
      accessToken: data.accessToken,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
    });
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
    updateSession({
      ready: true,
      status: "authenticated",
      userId: data.userId,
      accessToken: data.accessToken,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
    });
  }, [updateSession]);

  const oauthGoogle = useCallback(async (idToken: string) => {
    const data = await apiOauthGoogle(idToken);
    updateSession({
      ready: true,
      status: "authenticated",
      userId: data.userId,
      accessToken: data.accessToken,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
    });
  }, [updateSession]);

  const oauthApple = useCallback(async (idToken: string) => {
    const data = await apiOauthApple(idToken);
    updateSession({
      ready: true,
      status: "authenticated",
      userId: data.userId,
      accessToken: data.accessToken,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
    });
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
