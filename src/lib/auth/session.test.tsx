import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loginMock,
  logoutMock,
  oauthAppleMock,
  oauthGoogleMock,
  refreshMock,
  requestLoginOtpMock,
  requestRegisterOtpMock,
  configureAuthRetryHandlersMock,
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  logoutMock: vi.fn(),
  oauthAppleMock: vi.fn(),
  oauthGoogleMock: vi.fn(),
  refreshMock: vi.fn(),
  requestLoginOtpMock: vi.fn(),
  requestRegisterOtpMock: vi.fn(),
  configureAuthRetryHandlersMock: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  login: loginMock,
  logout: logoutMock,
  oauthApple: oauthAppleMock,
  oauthGoogle: oauthGoogleMock,
  refresh: refreshMock,
  registerWithOtp: vi.fn(),
  requestLoginOtp: requestLoginOtpMock,
  requestRegisterOtp: requestRegisterOtpMock,
}));

vi.mock("@/lib/api/request", () => ({
  configureAuthRetryHandlers: configureAuthRetryHandlersMock,
}));

import { SessionProvider, useAuthActions, useSession } from "@/lib/auth/session";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function Probe() {
  const session = useSession();
  const actions = useAuthActions();

  return (
    <div>
      <div data-testid="ready">{String(session.ready)}</div>
      <div data-testid="status">{session.status}</div>
      <div data-testid="userId">{session.userId ?? ""}</div>
      <div data-testid="accessToken">{session.accessToken ?? ""}</div>
      <button
        type="button"
        onClick={() =>
          actions.login({
            email: "user@example.com",
            password: "passw0rd!",
          })
        }
      >
        login
      </button>
      <button
        type="button"
        onClick={() => {
          void Promise.all([actions.refresh(), actions.refresh()]);
        }}
      >
        double-refresh
      </button>
      <button type="button" onClick={() => void actions.logout()}>
        logout
      </button>
    </div>
  );
}

describe("SessionProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    loginMock.mockReset();
    logoutMock.mockReset();
    oauthAppleMock.mockReset();
    oauthGoogleMock.mockReset();
    refreshMock.mockReset();
    requestLoginOtpMock.mockReset();
    requestRegisterOtpMock.mockReset();
    configureAuthRetryHandlersMock.mockReset();
  });

  it("hydrates the session on bootstrap without marking the user anonymous first", async () => {
    refreshMock.mockResolvedValue({
      userId: "user-1",
      accessToken: "access-1",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );

    expect(screen.getByTestId("ready")).toHaveTextContent("false");
    expect(screen.getByTestId("status")).toHaveTextContent("initializing");

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("true");
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("accessToken")).toHaveTextContent("access-1");
    });
  });

  it("populates the auth state correctly after login", async () => {
    refreshMock.mockRejectedValue(new Error("no session"));
    loginMock.mockResolvedValue({
      userId: "user-9",
      accessToken: "access-login",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("login"));
    });

    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("userId")).toHaveTextContent("user-9");
    expect(screen.getByTestId("accessToken")).toHaveTextContent("access-login");
  });

  it("reuses a single refresh promise for concurrent refresh calls", async () => {
    const initialSession = {
      userId: "user-1",
      accessToken: "access-1",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    const pendingRefresh = deferred<{
      userId: string;
      accessToken: string;
      accessTokenExpiresAt: string;
    }>();

    refreshMock.mockResolvedValueOnce(initialSession);
    refreshMock.mockImplementationOnce(() => pendingRefresh.promise);

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("accessToken")).toHaveTextContent("access-1");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("double-refresh"));
    });

    expect(refreshMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("status")).toHaveTextContent("refreshing");

    await act(async () => {
      pendingRefresh.resolve({
        userId: "user-1",
        accessToken: "access-2",
        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      await pendingRefresh.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("accessToken")).toHaveTextContent("access-2");
    });
  });

  it("clears the session when refresh really fails with 401", async () => {
    refreshMock.mockRejectedValue({ status: 401 });

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("true");
      expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
      expect(screen.getByTestId("accessToken")).toHaveTextContent("");
    });
  });
});
