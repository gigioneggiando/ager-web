import { describe, it, expect } from "vitest";
import {
  getPasswordRuleIssues,
  isPasswordStrong,
  PasswordSchema,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "./password";

describe("Password Validation", () => {
  describe("getPasswordRuleIssues", () => {
    it("returns empty array for valid password", () => {
      const issues = getPasswordRuleIssues("ValidPass123!");
      expect(issues).toEqual([]);
    });

    it("detects minLength violation", () => {
      const issues = getPasswordRuleIssues("Short1!");
      expect(issues).toContain("minLength");
    });

    it("detects number violation", () => {
      const issues = getPasswordRuleIssues("NoNumbers!");
      expect(issues).toContain("number");
    });

    it("detects special character violation", () => {
      const issues = getPasswordRuleIssues("NoSpecial123");
      expect(issues).toContain("special");
    });

    it("detects multiple violations", () => {
      const issues = getPasswordRuleIssues("weak");
      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues).toContain("minLength");
    });

    it("accepts numbers as special position", () => {
      const issues = getPasswordRuleIssues("ValidPass123");
      expect(issues).not.toContain("number");
    });

    it("accepts special characters at various positions", () => {
      const specialPasswords = [
        "!Password1",
        "Pass@word1",
        "Password1#",
        "P@ss1word",
      ];
      specialPasswords.forEach((pwd) => {
        expect(getPasswordRuleIssues(pwd)).not.toContain("special");
      });
    });

    it("handles empty string", () => {
      const issues = getPasswordRuleIssues("");
      expect(issues).toContain("minLength");
      expect(issues).toContain("number");
      expect(issues).toContain("special");
    });

    it("handles null-like strings", () => {
      expect(getPasswordRuleIssues("null")).toContain("minLength");
      expect(getPasswordRuleIssues("undefined")).toContain("number");
    });
  });

  describe("isPasswordStrong", () => {
    it("returns true for strong passwords", () => {
      const strongPasswords = [
        "ValidPass123!",
        "SecureP@ssw0rd",
        "MyPassword2024#",
        "Pass@1word",
      ];
      strongPasswords.forEach((pwd) => {
        expect(isPasswordStrong(pwd)).toBe(true);
      });
    });

    it("returns false for weak passwords", () => {
      const weakPasswords = [
        "weak",
        "NoSpecial123",
        "NoNumbers!",
        "Short1!",
        "",
      ];
      weakPasswords.forEach((pwd) => {
        expect(isPasswordStrong(pwd)).toBe(false);
      });
    });

    it("edge case: exactly 8 characters (min length)", () => {
      expect(isPasswordStrong("Pass@123")).toBe(true);
    });

    it("edge case: exactly 200 characters with valid rules", () => {
      const longPassword = "P".repeat(195) + "@ssw0rd";
      const result = isPasswordStrong(longPassword);
      // Should pass validation rules but might fail on schema limits
      expect(result).toBe(true);
    });
  });

  describe("PasswordSchema (Zod validation)", () => {
    it("accepts valid passwords", () => {
      const result = PasswordSchema.safeParse("ValidPass123!");
      expect(result.success).toBe(true);
    });

    it("rejects password below min length", () => {
      const result = PasswordSchema.safeParse("Short1!");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 8");
      }
    });

    it("rejects password above max length", () => {
      const tooLong = "P".repeat(201) + "@1";
      const result = PasswordSchema.safeParse(tooLong);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at most 200");
      }
    });

    it("rejects password without digit", () => {
      const result = PasswordSchema.safeParse("NoDigits@");
      expect(result.success).toBe(false);
    });

    it("rejects password without special character", () => {
      const result = PasswordSchema.safeParse("NoSpecial123");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = PasswordSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("validates UCS/unicode characters correctly", () => {
      // Special chars from different unicode blocks
      const result1 = PasswordSchema.safeParse("Pass@123");
      const result2 = PasswordSchema.safeParse("Pass€123");
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe("Constants", () => {
    it("PASSWORD_MIN_LENGTH is 8", () => {
      expect(PASSWORD_MIN_LENGTH).toBe(8);
    });

    it("PASSWORD_MAX_LENGTH is 200", () => {
      expect(PASSWORD_MAX_LENGTH).toBe(200);
    });
  });
});
