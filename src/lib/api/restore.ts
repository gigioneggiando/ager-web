import { requestRestoreOtp, restoreAccount } from "@/lib/api/auth";

export async function requestRestoreCode(email: string): Promise<void> {
  await requestRestoreOtp(email);
}

export async function restoreAccountByOtp(email: string, otpCode: string): Promise<void> {
  await restoreAccount(email, otpCode);
}
