import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { configureAuthRetryHandlers, requestJson, requestMaybeJson, requestVoid } from "@/lib/api/request";

describe("api request helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    configureAuthRetryHandlers(null);
  });

  it("adds auth and json headers when sending a body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestJson<{ ok: boolean }>("/api/example", {
        method: "POST",
        body: { value: 1 },
        accessToken: "token-123",
      })
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/example",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ value: 1 }),
        headers: expect.any(Headers),
      })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("does not force a content type for bodyless requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(requestVoid("/api/example", { method: "DELETE" })).resolves.toBeUndefined();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Accept")).toBeNull();
  });

  it("returns null for successful empty responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(requestMaybeJson("/api/example", { method: "POST" })).resolves.toBeNull();
  });

  it("parses problem details errors into ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ title: "Forbidden", errorCode: "denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await expect(requestJson("/api/forbidden")).rejects.toEqual(
      expect.objectContaining({
        message: "Forbidden",
        status: 403,
        code: "denied",
      })
    );
  });

  it("retries once after a successful token refresh", async () => {
    const refreshAccessToken = vi.fn().mockResolvedValue("fresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ title: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));

    configureAuthRetryHandlers({
      getAccessToken: () => "stale-token",
      refreshAccessToken,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestJson<{ ok: boolean }>("/api/protected", {
        method: "GET",
        accessToken: "stale-token",
      })
    ).resolves.toEqual({ ok: true });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, retryInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const retryHeaders = retryInit.headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer fresh-token");
  });

  it("does not retry more than once when the retried request still returns 401", async () => {
    const refreshAccessToken = vi.fn().mockResolvedValue("fresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ title: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ title: "Unauthorized again" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }));

    configureAuthRetryHandlers({
      getAccessToken: () => "stale-token",
      refreshAccessToken,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestJson("/api/protected", {
        method: "GET",
        accessToken: "stale-token",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized again",
      })
    );

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not attempt refresh when auth retry is explicitly disabled", async () => {
    const refreshAccessToken = vi.fn().mockResolvedValue("fresh-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    configureAuthRetryHandlers({
      getAccessToken: () => "stale-token",
      refreshAccessToken,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestVoid("/api/logout", {
        method: "POST",
        accessToken: "stale-token",
        retryOnAuthError: false,
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
