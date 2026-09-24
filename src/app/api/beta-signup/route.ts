import { NextResponse } from "next/server";
import { verifyCaptcha } from "@/lib/beta/captcha";
import { appendRow } from "@/lib/beta/signupStore";
import { MIN_ELAPSED_MS, betaSignupSchema } from "@/lib/beta/signupSchema";
import { logProxyEvent } from "@/app/api/auth/_shared";

/**
 * Beta signup: append-only.
 *
 * This endpoint can add a row to the signup spreadsheet and nothing else - there
 * is no route that reads the collected addresses back, so the site cannot leak
 * them even if this handler is abused. The email never reaches the logs.
 */

// The Google JWT is signed with node:crypto, so this cannot run on the edge.
export const runtime = "nodejs";

const GENERIC_ERROR = { error: "invalid_request" } as const;

/** Same-origin only: the form is served from this site and nowhere else. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  // The request URL is the authority here; the Host header is only a fallback.
  let host: string;
  try {
    host = new URL(request.url).host;
  } catch {
    host = request.headers.get("host") ?? "";
  }
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  if (!isSameOrigin(request)) {
    return NextResponse.json(GENERIC_ERROR, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(GENERIC_ERROR, { status: 400 });
  }

  const parsed = betaSignupSchema.safeParse(payload);
  if (!parsed.success) {
    // A filled honeypot and a malformed email are answered identically on
    // purpose: a bot learns nothing about which check it tripped.
    return NextResponse.json(GENERIC_ERROR, { status: 400 });
  }

  const signup = parsed.data;

  if (signup.elapsedMs < MIN_ELAPSED_MS) {
    return NextResponse.json(GENERIC_ERROR, { status: 400 });
  }

  const captcha = await verifyCaptcha(signup.captchaToken);
  if (captcha === "failed") {
    return NextResponse.json(GENERIC_ERROR, { status: 400 });
  }

  try {
    const result = await appendRow([
      new Date().toISOString(),
      signup.email,
      signup.contactConsent ? "si" : "no",
      signup.updatesConsent ? "si" : "no",
      signup.locale,
      "onboarding-beta",
    ]);

    // Locally an unconfigured spreadsheet is fine; in production it would mean
    // silently dropping every address, so it has to fail loudly instead.
    if (result === "not-configured" && process.env.NODE_ENV === "production") {
      throw new Error("Beta signup storage is not configured");
    }

    logProxyEvent("Information", "beta_signup_completed", "Beta signup stored.", {
      upstream_path: "/api/beta-signup",
      status_code: 200,
      duration_ms: Date.now() - startedAt,
      storage: result,
      captcha,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // The error carries no address, but it can carry spreadsheet details:
    // log the event, not the exception body.
    logProxyEvent("Error", "beta_signup_failed", "Beta signup could not be stored.", {
      upstream_path: "/api/beta-signup",
      status_code: 502,
      duration_ms: Date.now() - startedAt,
    });

    return NextResponse.json({ error: "storage_unavailable" }, { status: 502 });
  }
}
