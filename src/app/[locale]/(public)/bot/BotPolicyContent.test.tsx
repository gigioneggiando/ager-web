import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import itMessages from "@/messages/it.json";
import enMessages from "@/messages/en.json";
import BotPolicyContent, { AGER_BOT_USER_AGENT } from "./BotPolicyContent";

// Stub next-intl's useTranslations to read from the actual message bundles so the test
// doubles as an i18n-completeness check: a missing key surfaces as a rendering failure.
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

describe("BotPolicyContent", () => {
  it("renders the Italian bot policy with all required sections and links", () => {
    localeHolder.current = "it";
    render(<BotPolicyContent locale="it" />);

    // Headings match the translation bundle.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AgerBot — come funziona");
    expect(screen.getByRole("heading", { name: "Chi siamo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cosa fa AgerBot" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "User-Agent" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Frequenza di fetch" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "File di policy rispettati" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Indirizzi IP" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Come chiederci di fermarci" })).toBeInTheDocument();

    // The exact User-Agent string must be present verbatim so publishers can copy it.
    expect(screen.getByText(AGER_BOT_USER_AGENT)).toBeInTheDocument();
    expect(AGER_BOT_USER_AGENT).toBe("AgerBot/1.0 (+https://agerculture.com/bot)");

    // Internal links resolve to existing (public) routes.
    const takedownLink = screen.getByRole("link", { name: /modulo di rimozione/i });
    expect(takedownLink).toHaveAttribute("href", "/it/takedown");
    const philosophyLink = screen.getByRole("link", { name: "Filosofia" });
    expect(philosophyLink).toHaveAttribute("href", "/it/philosophy");

    // Opt-out email endpoints are reachable via mailto:.
    expect(screen.getByRole("link", { name: "takedown@agerculture.com" })).toHaveAttribute(
      "href",
      "mailto:takedown@agerculture.com",
    );
    expect(screen.getByRole("link", { name: "partnerships@agerculture.com" })).toHaveAttribute(
      "href",
      "mailto:partnerships@agerculture.com",
    );

    // External spec links use the correct authoritative URLs.
    const externalLinks = screen.getAllByRole("link");
    const hrefs = externalLinks.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("https://www.rfc-editor.org/rfc/rfc9309.html");
    expect(hrefs).toContain("https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240202/");
    expect(hrefs).toContain("https://datatracker.ietf.org/doc/draft-canel-robots-txt-ai/");
  });

  it("renders the English bot policy with locale-scoped internal links", () => {
    localeHolder.current = "en";
    render(<BotPolicyContent locale="en" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("AgerBot — how it works");
    expect(screen.getByRole("heading", { name: "Who we are" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to ask us to stop" })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /takedown form/i })).toHaveAttribute(
      "href",
      "/en/takedown",
    );
    expect(screen.getByRole("link", { name: "Philosophy" })).toHaveAttribute(
      "href",
      "/en/philosophy",
    );
  });
});
