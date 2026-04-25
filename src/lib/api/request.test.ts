import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { requestJson, requestMaybeJson, requestVoid } from "@/lib/api/request";
import { clearCsrfTokenCache } from "@/lib/api/csrf";

// Mock builder that:
// - returns a fresh Response for the GET /api/auth/csrf bootstrap (no token = no header)
// - returns the supplied response for any other URL
//
// `request.ts` now calls /api/auth/csrf once per cold cache to fetch the antiforgery
// requestToken before any state-changing request. The actual endpoints under test must
// receive a fresh Response so reading the body in the test path doesn't trip on a body
// already consumed by the bootstrap.
function mockFetch(response: () => Response) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/auth/csrf")) {
      return new Response(JSON.stringify({ token: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return response();
  });
}

// Picks the call that actually targeted the endpoint under test, ignoring the CSRF bootstrap.
function endpointCall(fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit] {
  const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
  const hit = calls.find(([url]) => !url.includes("/api/auth/csrf"));
  if (!hit) throw new Error("no non-CSRF call captured");
  return hit;
}

describe("api request helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearCsrfTokenCache();
  });

  it("adds auth and json headers when sending a body", async () => {
    const fetchMock = mockFetch(() =>
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

    const [url, init] = endpointCall(fetchMock);
    expect(url).toBe("/api/example");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ value: 1 }));

    const headers = init.headers as Headers;
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("does not force a content type for bodyless requests", async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(requestVoid("/api/example", { method: "DELETE" })).resolves.toBeUndefined();

    const [, init] = endpointCall(fetchMock);
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Accept")).toBeNull();
  });

  it("returns null for successful empty responses", async () => {
    vi.stubGlobal("fetch", mockFetch(() => new Response(null, { status: 204 })));

    await expect(requestMaybeJson("/api/example", { method: "POST" })).resolves.toBeNull();
  });

  it("parses problem details errors into ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(() =>
        new Response(JSON.stringify({ title: "Forbidden", errorCode: "denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await expect(requestJson("/api/forbidden")).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: "Forbidden",
        status: 403,
        code: "denied",
      })
    );
  });

  it("attaches X-CSRF-TOKEN from the bootstrap response on state-changing requests", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/auth/csrf")) {
        return new Response(JSON.stringify({ token: "request-token-abc" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    await requestJson("/api/example", { method: "POST", body: { x: 1 } });

    const [, init] = endpointCall(fetchMock);
    const headers = init.headers as Headers;
    expect(headers.get("X-CSRF-TOKEN")).toBe("request-token-abc");
  });
});