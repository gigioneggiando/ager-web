import { z } from "zod";

/**
 * Payload of the beta signup form.
 * Shared by the client (to shape the request) and the route handler (to trust it).
 */
export const betaSignupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3)
    .max(254)
    .email()
    // Store one canonical form so duplicates are easy to spot in the sheet.
    .transform((value) => value.toLowerCase()),
  contactConsent: z.boolean(),
  updatesConsent: z.boolean(),
  locale: z.enum(["it", "en"]),
  /** Milliseconds between opening the form and submitting it. */
  elapsedMs: z.number().int().nonnegative().max(24 * 60 * 60 * 1000),
  /** Honeypot: a real person never sees this field, so it must stay empty. */
  company: z.string().max(0),
  /** hCaptcha response token; empty when the captcha is not configured. */
  captchaToken: z.string().max(4096).optional(),
});

export type BetaSignupInput = z.input<typeof betaSignupSchema>;
export type BetaSignup = z.output<typeof betaSignupSchema>;

/** A human needs at least this long to read the screen and type an address. */
export const MIN_ELAPSED_MS = 1500;
