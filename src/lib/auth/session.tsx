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

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ ready: false, userId: null, accessToken: null, accessTokenExpiresAt: null });
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  const clearSession = useCallback(() => {
    setState({ ready: true, userId: null, accessToken: null, accessTokenExpiresAt: null });
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const inFlight = (async () => {
      try {
        const data = await apiRefresh();
        setState({
          ready: true,
          userId: data.userId,
          accessToken: data.accessToken,
          accessTokenExpiresAt: data.accessTokenExpiresAt
        });
        return data.accessToken ?? null;
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError?.status === 401) {
          clearSession();
        }
        throw error;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = inFlight;
    return inFlight;
  }, [clearSession]);

  // On full page reload, SessionProvider state resets. Re-hydrate via refresh token flow.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const nextToken = await refresh();
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
  }, [refresh, clearSession]);

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
    setState({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt });
  }, []);

  const requestRegisterOtp = useCallback(async (payload: { username: string; email: string }) => {
    await apiRequestRegisterOtp(payload.username, payload.email);
  }, []);

  const register = useCallback(async (payload: { username: string; email: string; otpCode: string; password?: string | null }) => {
    const data = await apiRegisterWithOtp(payload.username, payload.email, payload.otpCode, payload.password);
    setState({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt });
  }, []);

  const oauthGoogle = useCallback(async (idToken: string) => {
    const data = await apiOauthGoogle(idToken);
    setState({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt });
  }, []);

  const oauthApple = useCallback(async (idToken: string) => {
    const data = await apiOauthApple(idToken);
    setState({ ready: true, userId: data.userId, accessToken: data.accessToken, accessTokenExpiresAt: data.accessTokenExpiresAt });
  }, []);

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
