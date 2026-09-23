import { createSign } from "node:crypto";

/**
 * Minimal Google Sheets writer. Server only: it reads the service account key
 * from the environment and must never be imported from a client component.
 *
 * Deliberately hand-rolled instead of pulling in `googleapis`: we only ever need
 * one call (values.append), and the service account is granted nothing but write
 * access to a single spreadsheet. There is no read path on purpose - the site can
 * add a row, never list them.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type ServiceAccount = {
  clientEmail: string;
  privateKey: string;
};

function readServiceAccount(): ServiceAccount | null {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim();
  // Vercel stores the key on a single line, so \n arrives escaped.
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Signed JWT assertion, exchanged below for a short-lived access token. */
function createAssertion({ clientEmail, privateKey }: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const signature = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(privateKey);

  return `${header}.${claims}.${base64url(signature)}`;
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createAssertion(account),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed with ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google token exchange returned no token");
  return data.access_token;
}

export type SheetsAppendResult = "appended" | "not-configured";

/** Appends one row to the configured spreadsheet. */
export async function appendRow(values: (string | boolean)[]): Promise<SheetsAppendResult> {
  const account = readServiceAccount();
  const spreadsheetId = process.env.BETA_SIGNUP_SHEET_ID?.trim();

  if (!account || !spreadsheetId) return "not-configured";

  const range = process.env.BETA_SIGNUP_SHEET_RANGE?.trim() || "Iscritti!A:F";
  const accessToken = await getAccessToken(account);

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    `/values/${encodeURIComponent(range)}:append` +
    `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
    cache: "no-store",
  });

  if (!res.ok) {
    // The body can echo the submitted row, so it is not logged.
    throw new Error(`Google Sheets append failed with ${res.status}`);
  }

  return "appended";
}
