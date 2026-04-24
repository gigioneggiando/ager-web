import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import itMessages from "@/messages/it.json";
import enMessages from "@/messages/en.json";
import DsaContactContent, {
  AVG_MONTHLY_UE_USERS_PLACEHOLDER,
  DSA_AUTHORITIES_EMAIL,
  DSA_USERS_EMAIL,
  REGISTERED_ADDRESS_PLACEHOLDER,
} from "./DsaContactContent";

// Read translations directly from the bundles so a missing key surfaces as a
// rendering error — same pattern as BotPolicyContent.test.tsx.
const localeHolder = { current: "it" as "it" | "en" };

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    const bundle = (localeHolder.current === "it" ? itMessages : enMessages) as Record<string, unknown>;
    const path = namespace ? `${namespace}.${key}` : key;
    const value = path.split(".").reduce<unknown>(
      (acc, segment) => (acc as Record<string, unknown> | null)?.[segment],
      bundle,
    );
    if (typeof value !== "string") throw new Error(`missing translation key: ${path}`);
    return value;
  },
}));

describe("DsaContactContent", () => {
  it("renders the Italian DSA contact page with both points of contact", () => {
    localeHolder.current = "it";
    render(<DsaContactContent locale="it" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Punto di contatto DSA");
    expect(screen.getByRole("heading", { name: /Punto di contatto per le autorità/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Punto di contatto per gli utenti/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Trasparenza/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Altre autorità competenti/i })).toBeInTheDocument();

    // Both mailto links present and distinct — regulator channel must not be merged with user channel.
    expect(screen.getByRole("link", { name: DSA_AUTHORITIES_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${DSA_AUTHORITIES_EMAIL}`,
    );
    expect(screen.getByRole("link", { name: DSA_USERS_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${DSA_USERS_EMAIL}`,
    );

    // Placeholders rendered verbatim — reviewers must see they are unresolved.
    expect(screen.getByText(REGISTERED_ADDRESS_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByText(AVG_MONTHLY_UE_USERS_PLACEHOLDER)).toBeInTheDocument();

    // Takedown internal link is locale-scoped.
    expect(screen.getByRole("link", { name: /modulo pubblico di rimozione/i })).toHaveAttribute(
      "href",
      "/it/takedown",
    );

    // External authority links use authoritative domains (sanity check — a typo'd hostname would
    // be worse than a broken link here because it could impersonate a regulator).
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("https://www.agcom.it");
    expect(hrefs).toContain("https://sdfi.dk/");
    expect(hrefs).toContain("https://edpb.europa.eu/");
    expect(hrefs).toContain("https://www.datatilsynet.dk/");
    expect(hrefs).toContain("https://www.garanteprivacy.it/");
  });

  it("renders the English DSA contact page with locale-scoped internal links", () => {
    localeHolder.current = "en";
    render(<DsaContactContent locale="en" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("DSA point of contact");
    expect(
      screen.getByRole("heading", { name: /single point of contact for authorities/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /point of contact for recipients of the service/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /other competent authorities/i })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /public takedown form/i })).toHaveAttribute(
      "href",
      "/en/takedown",
    );

    // Email placeholders must stay identical across locales — they're technical identifiers, not copy.
    expect(screen.getByRole("link", { name: DSA_AUTHORITIES_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${DSA_AUTHORITIES_EMAIL}`,
    );
  });

  it("exposes email and placeholder constants as a single source of truth", () => {
    // Hard-coding them here is intentional: the test will fail if the constants drift, which is
    // the cheapest way to catch a typo in the regulator-facing mailbox name.
    expect(DSA_AUTHORITIES_EMAIL).toBe("dsa-authorities@agerculture.com");
    expect(DSA_USERS_EMAIL).toBe("dsa-users@agerculture.com");
    expect(REGISTERED_ADDRESS_PLACEHOLDER).toBe("{{REGISTERED_ADDRESS}}");
    expect(AVG_MONTHLY_UE_USERS_PLACEHOLDER).toBe("{{AVG_MONTHLY_UE_USERS}}");
  });
});
