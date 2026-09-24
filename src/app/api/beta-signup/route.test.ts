import { beforeEach, describe, expect, it, vi } from "vitest";

const appendRow = vi.fn();
const verifyCaptcha = vi.fn();

vi.mock("@/lib/beta/signupStore", () => ({
  appendRow: (...args: unknown[]) => appendRow(...args),
}));

vi.mock("@/lib/beta/captcha", () => ({
  verifyCaptcha: (...args: unknown[]) => verifyCaptcha(...args),
}));

import { POST } from "./route";

const VALID = {
  email: "Test.Person@Example.com",
  contactConsent: true,
  updatesConsent: false,
  locale: "it",
  elapsedMs: 9000,
  company: "",
};

function makeRequest(body: unknown, { origin = "https://agerculture.com" } = {}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request("https://agerculture.com/api/beta-signup", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/beta-signup", () => {
  beforeEach(() => {
    appendRow.mockReset().mockResolvedValue("appended");
    verifyCaptcha.mockReset().mockResolvedValue("not-configured");
  });

  it("stores a valid signup with the email lower-cased", async () => {
    const res = await POST(makeRequest(VALID));

    expect(res.status).toBe(200);
    expect(appendRow).toHaveBeenCalledTimes(1);

    const row = appendRow.mock.calls[0][0] as string[];
    expect(row[1]).toBe("test.person@example.com");
    expect(row[2]).toBe("si");
    expect(row[3]).toBe("no");
    expect(row[4]).toBe("it");
  });

  it("refuses a cross-origin submission", async () => {
    const res = await POST(makeRequest(VALID, { origin: "https://evil.example" }));

    expect(res.status).toBe(403);
    expect(appendRow).not.toHaveBeenCalled();
  });

  it("refuses a request with no origin header", async () => {
    const res = await POST(makeRequest(VALID, { origin: "" }));

    expect(res.status).toBe(403);
    expect(appendRow).not.toHaveBeenCalled();
  });

  it("refuses a malformed email", async () => {
    const res = await POST(makeRequest({ ...VALID, email: "not-an-email" }));

    expect(res.status).toBe(400);
    expect(appendRow).not.toHaveBeenCalled();
  });

  it("refuses a filled honeypot", async () => {
    const res = await POST(makeRequest({ ...VALID, company: "Acme Ltd" }));

    expect(res.status).toBe(400);
    expect(appendRow).not.toHaveBeenCalled();
  });

  it("refuses a submission that was too fast to be human", async () => {
    const res = await POST(makeRequest({ ...VALID, elapsedMs: 120 }));

    expect(res.status).toBe(400);
    expect(appendRow).not.toHaveBeenCalled();
  });

  it("refuses a failed captcha", async () => {
    verifyCaptcha.mockResolvedValue("failed");

    const res = await POST(makeRequest(VALID));

    expect(res.status).toBe(400);
    expect(appendRow).not.toHaveBeenCalled();
  });

  it("answers 502 without leaking the storage error", async () => {
    appendRow.mockRejectedValue(new Error("spreadsheet 1a2b3c not found"));

    const res = await POST(makeRequest(VALID));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("1a2b3c");
  });
});
