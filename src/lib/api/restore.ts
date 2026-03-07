import { parseApiError } from "@/lib/api/errors";

export async function requestRestoreCode(email: string): Promise<void> {
  const res = await fetch("/api/auth/restore/request-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) throw await parseApiError(res);
}

export async function restoreAccountByOtp(email: string, otpCode: string): Promise<void> {
  const res = await fetch("/api/auth/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otpCode }),
  });

  if (!res.ok) throw await parseApiError(res);
}
