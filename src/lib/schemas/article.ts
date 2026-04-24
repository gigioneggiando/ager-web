import { z } from "zod";

export const LicenseTypeSchema = z.enum([
  "link_only",
  "cc_by",
  "cc_by_sa",
  "cc_by_nc",
  "public_domain",
  "agency_syndicated",
]);

export const DisplayModeSchema = z.enum(["redirect", "webview", "reader_optin"]);

export const TakedownStatusSchema = z.enum([
  "active",
  "takedown_requested",
  "takedown_done",
  "disputed",
]);

export const ArticleSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  title: z.string(),
  excerpt: z.string().max(220).nullable().optional(),
  author: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  topics: z.array(z.string()).nullable().optional(),
  lang: z.string().min(2).max(10),
  publishedAt: z.string(), // ISO
  createdAt: z.string(),   // ISO
  licenseType: LicenseTypeSchema,
  displayMode: DisplayModeSchema,
  paywallDetected: z.boolean(),
});

export type Article = z.infer<typeof ArticleSchema>;
