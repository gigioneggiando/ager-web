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

// Edge-level CSRF enforcement. Regression tests for each bypass vector:
//   - state-changing method without cookie -> passes (non-browser caller, backend enforces anyway)
//   - state-changing method WITH cookie but missing header -> rejected
//   - state-changing method WITH cookie but mismatched header -> rejected
//   - state-changing method WITH cookie and matching header -> passes
//   - safe methods (GET/HEAD/OPTIONS) always pass regardless
describe("enforceCsrfIfCookiePresent", () => {
  it("passes through GET regardless of cookie state", () => {
    const res = enforceCsrfIfCookiePresent(
      makeRequest("GET", { cookie: "XSRF-TOKEN=abc" })
    );
    expect(res).toBeNull();
  });

  it("passes through POST when no XSRF-TOKEN cookie is present", () => {
    const res = enforceCsrfIfCookiePresent(
      makeRequest("POST", { csrfHeader: "whatever" })
    );
    expect(res).toBeNull();
  });

  it("rejects POST when cookie is present and header is missing", () => {
    const res = enforceCsrfIfCookiePresent(
      makeRequest("POST", { cookie: "XSRF-TOKEN=expected" })
    );
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it("rejects POST when cookie and header disagree", () => {
    const res = enforceCsrfIfCookiePresent(
      makeRequest("POST", {
        cookie: "XSRF-TOKEN=expected",
        csrfHeader: "different",
      })
    );
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it("accepts POST when cookie and header match", () => {
    const res = enforceCsrfIfCookiePresent(
      makeRequest("POST", {
        cookie: "XSRF-TOKEN=token123",
        csrfHeader: "token123",
      })
    );
    expect(res).toBeNull();
  });

  it.each([
    ["PUT"],
    ["PATCH"],
    ["DELETE"],
  ])("rejects %s with cookie but mismatched header", (method) => {
    const res = enforceCsrfIfCookiePresent(
      makeRequest(method, {
        cookie: "XSRF-TOKEN=t",
        csrfHeader: "other",
      })
    );
    expect(res?.status).toBe(403);
  });

  it("uses constant-time comparison — equal-length but different strings still reject", () => {
    const res = enforceCsrfIfCookiePresent(
      makeRequest("POST", {
        cookie: "XSRF-TOKEN=aaaaaaaa",
        csrfHeader: "bbbbbbbb",
      })
    );
    expect(res?.status).toBe(403);
  });

  it("handles multiple cookies — picks the right one", () => {
    const res = enforceCsrfIfCookiePresent(
      makeRequest("POST", {
        cookie: "session=s; XSRF-TOKEN=tok; ager_refresh=r",
        csrfHeader: "tok",
      })
    );
    expect(res).toBeNull();
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
