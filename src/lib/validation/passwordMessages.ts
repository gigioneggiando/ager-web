import { getPasswordRuleIssues, type PasswordRuleIssue } from "@/lib/validation/password";

type PasswordRuleMessages = Record<PasswordRuleIssue | "invalid", string>;

export function getFirstPasswordRuleMessage(
  password: string,
  messages: PasswordRuleMessages
): string | null {
  const firstIssue = getPasswordRuleIssues(password)[0];

  if (!firstIssue) {
    return null;
  }

  return messages[firstIssue] ?? messages.invalid;
}