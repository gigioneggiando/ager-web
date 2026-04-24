import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import itMessages from "@/messages/it.json";
import enMessages from "@/messages/en.json";
import AppSidebar from "./AppSidebar";

// Session fixture we can swap per test. Matches the shape of SessionState returned by
// useSession(); only the fields AppSidebar reads (`role`, `ready`) matter here.
type FakeSession = {
  ready: boolean;
  role: "admin" | "user" | null;
  userId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
};
const sessionHolder: { current: FakeSession } = {
  current: { ready: false, role: null, userId: null, accessToken: null, accessTokenExpiresAt: null },
};

vi.mock("@/lib/auth/session", () => ({
  useSession: () => sessionHolder.current,
}));

vi.mock("@/i18n/useAppLocale", () => ({
  useAppLocale: () => ({ locale: "it" }),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    const bundle = itMessages as Record<string, unknown>;
    const path = namespace ? `${namespace}.${key}` : key;
    const value = path.split(".").reduce<unknown>(
      (acc, segment) => (acc as Record<string, unknown> | null)?.[segment],
      bundle,
    );
    if (typeof value !== "string") throw new Error(`missing translation key: ${path}`);
    return value;
  },
}));

describe("AppSidebar admin gating", () => {
  it("renders admin section when the session is a confirmed admin", () => {
    sessionHolder.current = {
      ready: true, role: "admin",
      userId: "u-1", accessToken: "t", accessTokenExpiresAt: null,
    };
    render(<AppSidebar />);

    expect(screen.getByTestId("admin-nav-section")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fonti" })).toHaveAttribute("href", "/it/admin/sources");
    expect(screen.getByRole("link", { name: "Rimozioni" })).toHaveAttribute("href", "/it/admin/takedown");
    expect(screen.getByRole("link", { name: "Log di ingest" })).toHaveAttribute("href", "/it/admin/ingestion-log");
  });

  it("hides admin section for a regular user", () => {
    sessionHolder.current = {
      ready: true, role: "user",
      userId: "u-2", accessToken: "t", accessTokenExpiresAt: null,
    };
    render(<AppSidebar />);

    expect(screen.queryByTestId("admin-nav-section")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Fonti" })).not.toBeInTheDocument();
  });

  it("hides admin section for anonymous visitors", () => {
    sessionHolder.current = {
      ready: true, role: null,
      userId: null, accessToken: null, accessTokenExpiresAt: null,
    };
    render(<AppSidebar />);

    expect(screen.queryByTestId("admin-nav-section")).not.toBeInTheDocument();
  });

  it("hides admin section while the session is not yet hydrated", () => {
    // Even if role happens to be "admin" pre-hydration (shouldn't happen in practice),
    // the guard requires ready=true to rule out SSR / early-render flash.
    sessionHolder.current = {
      ready: false, role: "admin",
      userId: null, accessToken: null, accessTokenExpiresAt: null,
    };
    render(<AppSidebar />);

    expect(screen.queryByTestId("admin-nav-section")).not.toBeInTheDocument();
  });

  it("keeps regular nav items visible for every session state", () => {
    sessionHolder.current = {
      ready: true, role: null,
      userId: null, accessToken: null, accessTokenExpiresAt: null,
    };
    render(<AppSidebar />);

    expect(screen.getByRole("link", { name: "Per te" })).toHaveAttribute("href", "/it/feed");
    expect(screen.getByRole("link", { name: "Ultimi" })).toHaveAttribute("href", "/it/feed?tab=latest");
    expect(screen.getByRole("link", { name: "Esplora" })).toHaveAttribute("href", "/it/explore");
  });

  it("EN bundle carries the admin heading translation", () => {
    // Sanity: a missing admin.heading in any locale would blow up the render. Swapping the
    // translator bundle to en proves the key exists in both.
    const enTranslator = (namespace?: string) => (key: string) => {
      const bundle = enMessages as Record<string, unknown>;
      const path = namespace ? `${namespace}.${key}` : key;
      const value = path.split(".").reduce<unknown>(
        (acc, segment) => (acc as Record<string, unknown> | null)?.[segment],
        bundle,
      );
      if (typeof value !== "string") throw new Error(`missing translation key: ${path}`);
      return value;
    };
    expect(enTranslator("layout.sidebar.admin")("heading")).toBe("Administration");
    expect(enTranslator("layout.sidebar.admin")("sources")).toBe("Sources");
    expect(enTranslator("layout.sidebar.admin")("takedown")).toBe("Takedowns");
    expect(enTranslator("layout.sidebar.admin")("ingestionLog")).toBe("Ingestion log");
  });
});
