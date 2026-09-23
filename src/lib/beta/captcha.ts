/**
 * hCaptcha verification. Server only.
 *
 * When HCAPTCHA_SECRET is not set the check is skipped, so local development and
 * preview builds keep working; production is expected to set it.
 */
const VERIFY_URL = "https://api.hcaptcha.com/siteverify";

export type CaptchaResult = "ok" | "failed" | "not-configured";

export async function verifyCaptcha(token: string | undefined): Promise<CaptchaResult> {
  const secret = process.env.HCAPTCHA_SECRET?.trim();
  if (!secret) return "not-configured";
  if (!token) return "failed";

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
    cache: "no-store",
  });

  if (!res.ok) return "failed";

  const data = (await res.json()) as { success?: boolean };
  return data.success ? "ok" : "failed";
}
