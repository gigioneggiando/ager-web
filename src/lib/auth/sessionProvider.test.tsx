import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refreshMock, configureAuthRetryHandlersMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  configureAuthRetryHandlersMock: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  oauthApple: vi.fn(),
  oauthGoogle: vi.fn(),
  refresh: refreshMock,
  registerWithOtp: vi.fn(),
  requestLoginOtp: vi.fn(),
  requestRegisterOtp: vi.fn(),
}));

vi.mock("@/lib/api/request", () => ({
  configureAuthRetryHandlers: configureAuthRetryHandlersMock,
}));

import { SessionProvider, useSession } from "@/lib/auth/session";

function Probe() {
  const session = useSession();
  return (
    <div>
      <div data-testid="ready">{String(session.ready)}</div>
      <div data-testid="userId">{session.userId ?? ""}</div>
      <div data-testid="accessToken">{session.accessToken ?? ""}</div>
    </div>
  );
}

describe("SessionProvider auth recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockReset();
    configureAuthRetryHandlersMock.mockReset();
  });

  it("hydrates the session on bootstrap refresh", async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("true");
      expect(screen.getByTestId("userId")).toHaveTextContent("user-1");
      expect(screen.getByTestId("accessToken")).toHaveTextContent("access-1");
    });
  });

  it("tries to recover the session when the tab becomes visible with an expired token", async () => {
    refreshMock
      .mockResolvedValueOnce({
        userId: "user-1",
        accessToken: "access-initial",
        accessTokenExpiresAt: new Date(Date.now() + 10_000).toISOString(),
      })
      .mockResolvedValueOnce({
        userId: "user-1",
        accessToken: "access-refreshed",
        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("accessToken")).toHaveTextContent("access-initial");
    });

    const callsBeforeVisibilityChange = refreshMock.mock.calls.length;

    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(refreshMock.mock.calls.length).toBeGreaterThanOrEqual(callsBeforeVisibilityChange + 1);
      expect(screen.getByTestId("accessToken")).toHaveTextContent("access-refreshed");
    });
  });
});
