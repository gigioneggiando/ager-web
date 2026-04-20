// Image URL hardening: only return absolute https URLs; reject javascript:, data:, file:,
// blob:, vbscript:, mailto:, and anything else that isn't plain http(s). Upgrade http->https.
export function normalizeImageUrl(imageUrl: string | null | undefined, pageUrl: string): string | null {
  if (!imageUrl || imageUrl.trim() === "") return null;
  try {
    const absolute = new URL(imageUrl, pageUrl);
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
      return null;
    }
    if (absolute.username || absolute.password) {
      return null; // never allow credentials in image URLs
    }
    if (absolute.protocol === "http:") absolute.protocol = "https:";
    return absolute.toString();
  } catch {
    return null;
  }
}
