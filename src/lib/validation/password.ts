import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

// At least 8 chars, one digit, one special char
export const PASSWORD_REGEX = /^(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export type PasswordRuleIssue = "minLength" | "number" | "special";

export function getPasswordRuleIssues(password: string): PasswordRuleIssue[] {
  const issues: PasswordRuleIssue[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) issues.push("minLength");
  if (!/\d/.test(password)) issues.push("number");
  if (!/[^\w\s]/.test(password)) issues.push("special");
  return issues;
}

export function isPasswordStrong(password: string): boolean {
  return getPasswordRuleIssues(password).length === 0;
}

export const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "Password must be at least 8 characters")
  .max(PASSWORD_MAX_LENGTH, "Password must be at most 200 characters")
  .regex(/.*\d.*/, "Password must include at least one number")
  .regex(/.*[^\w\s].*/, "Password must include at least one special character");
