import { describe, expect, it } from "vitest";

import { enforceCsrfIfCookiePresent, toSafeErrorResponse } from "@/app/api/auth/_shared";

function makeRequest(
  method: string,
  {
    cookie,
    csrfHeader,
  }: { cookie?: string; csrfHeader?: string } = {}
): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (csrfHeader) headers.set("x-csrf-token", csrfHeader);
  return new Request("http://ager.local/api/anything", { method, headers });
}

// `enforceCsrfIfCookiePresent` is now a no-op — see the comment in `_shared.ts`. The
// edge layer used to do plain double-submit (cookie===header), but that scheme is
// incompatible with the backend's ASP.NET antiforgery (cookieToken ≠ requestToken).
// All CSRF validation is now centralised in the backend `CsrfEndpointFilter`.
describe("enforceCsrfIfCookiePresent", () => {
  it("returns null for any request shape (delegated to backend)", () => {
    const cases = [
      makeRequest("GET", { cookie: "XSRF-TOKEN=abc" }),
      makeRequest("POST"),
      makeRequest("POST", { cookie: "XSRF-TOKEN=expected" }),
      makeRequest("POST", { cookie: "XSRF-TOKEN=a", csrfHeader: "b" }),
      makeRequest("POST", { cookie: "XSRF-TOKEN=t", csrfHeader: "t" }),
      makeRequest("DELETE", { cookie: "XSRF-TOKEN=t", csrfHeader: "other" }),
    ];
    for (const req of cases) {
      expect(enforceCsrfIfCookiePresent(req)).toBeNull();
    }
  });
});

// Proxy error normalisation: only allow-listed fields leak through; backend stack traces /
// verbose ProblemDetails extensions must not be echoed.
describe("toSafeErrorResponse", () => {
  it("returns a normalised envelope regardless of backend body shape", async () => {
    const upstream = new Response(
      JSON.stringify({
        title: "Internal failure",
        detail: "Stack trace: at Foo()",
        errorCode: "secret_failure",
        extra: { leaked: true },
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );

    const response = await toSafeErrorResponse(upstream);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.errorCode).toBe("secret_failure"); // preserved as machine-readable signal
    expect(json.message).toBeDefined();
    expect(json.detail).toBeUndefined(); // verbose detail dropped
    expect(json.extra).toBeUndefined(); // arbitrary extras dropped
  });

  it("survives non-JSON upstream bodies without leaking them", async () => {
    const upstream = new Response("<html><body>error page</body></html>", {
      status: 502,
      headers: { "content-type": "text/html" },
    });
    const response = await toSafeErrorResponse(upstream, "Upstream failed");
    const json = await response.json();
    expect(response.status).toBe(502);
    expect(JSON.stringify(json)).not.toContain("html");
  });

  it("propagates Retry-After when present", async () => {
    const upstream = new Response("{}", {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "42" },
    });
    const response = await toSafeErrorResponse(upstream);
    expect(response.headers.get("retry-after")).toBe("42");
  });
});
