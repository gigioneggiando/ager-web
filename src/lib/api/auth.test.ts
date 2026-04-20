import { beforeEach, describe, expect, it, vi } from "vitest";

import { refresh, getStoredRefreshToken } from "@/lib/api/auth";

const { requestJsonMock } = vi.hoisted(() => ({
  requestJsonMock: vi.fn(),
}));
const { requestVoidMock } = vi.hoisted(() => ({
  requestVoidMock: vi.fn(),
}));

vi.mock("@/lib/api/request", () => ({
  requestJson: requestJsonMock,
  requestVoid: requestVoidMock,
}));

describe("auth api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requestJsonMock.mockReset();
    requestVoidMock.mockReset();
    window.localStorage.clear();
  });

  // Refresh tokens must never be stored client-side. The HttpOnly cookie is the only carrier;
  // reading the getter must always return null, even if a stale value from an older build
  // lives in localStorage.
  it("never returns a refresh token from client storage, even if legacy value exists", () => {
    window.localStorage.setItem("ager.refreshToken", "legacy-leaked-token");
    window.localStorage.setItem("ager.refreshTokenExpiresAt", "2026-03-26T12:00:00.000Z");

    expect(getStoredRefreshToken()).toBeNull();
    // Legacy keys are cleaned up on first access.
    expect(window.localStorage.getItem("ager.refreshToken")).toBeNull();
    expect(window.localStorage.getItem("ager.refreshTokenExpiresAt")).toBeNull();
  });

  it("calls the proxy without a body — refresh cookie is attached by the browser", async () => {
    requestJsonMock.mockResolvedValue({
      userId: "user-1",
      accessToken: "access-2",
      accessTokenExpiresAt: "2026-03-12T12:30:00.000Z",
    });

    await refresh();

    expect(requestJsonMock).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      })
    );
    const [, opts] = requestJsonMock.mock.calls[0] as [string, { body?: unknown }];
    expect(opts.body).toBeUndefined();
  });

  it("strips any refresh token the backend might return", async () => {
    requestJsonMock.mockResolvedValue({
      userId: "user-1",
      accessToken: "access-2",
      accessTokenExpiresAt: "2026-03-12T12:30:00.000Z",
      refreshToken: "should-be-discarded",
      refreshTokenExpiresAt: "2026-03-26T12:00:00.000Z",
    });

    const result = await refresh();

    expect((result as { refreshToken?: string }).refreshToken).toBeUndefined();
    expect(window.localStorage.getItem("ager.refreshToken")).toBeNull();
  });

  it("sends honeypot and captcha token with register OTP requests", async () => {
    requestVoidMock.mockResolvedValue(undefined);

    const { requestRegisterOtp } = await import("@/lib/api/auth");

    await requestRegisterOtp("new_user", "new@example.com", {
      honeypot: "",
      captchaToken: "captcha-ok",
    });

    expect(requestVoidMock).toHaveBeenCalledWith(
      "/api/auth/register/request-code",
      expect.objectContaining({
        method: "POST",
        body: {
          username: "new_user",
          email: "new@example.com",
          honeypot: "",
          captchaToken: "captcha-ok",
        },
      })
    );
  });
});
