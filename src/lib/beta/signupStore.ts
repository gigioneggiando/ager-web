/**
 * Where beta signups are stored. Server only.
 *
 * The row is handed to an Apps Script bound to the spreadsheet itself, published
 * as a web app (see docs/beta-signup.gs). That script is the only thing with
 * write access to the sheet: this app holds no Google credentials at all, just a
 * shared secret that never reaches the browser.
 *
 * There is no read path on purpose - the site can append a row, never list them.
 */

export type SignupStoreResult = "appended" | "not-configured";

export async function appendRow(values: (string | boolean)[]): Promise<SignupStoreResult> {
  const url = process.env.BETA_SIGNUP_WEBHOOK_URL?.trim();
  const secret = process.env.BETA_SIGNUP_WEBHOOK_SECRET?.trim();

  if (!url || !secret) return "not-configured";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, values }),
    // Apps Script answers /exec with a redirect to its content host.
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Signup webhook failed with ${res.status}`);
  }

  // Apps Script replies 200 even when it refuses, so the body is the real answer.
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!data?.ok) {
    throw new Error(`Signup webhook refused the row: ${data?.error ?? "unknown"}`);
  }

  return "appended";
}
