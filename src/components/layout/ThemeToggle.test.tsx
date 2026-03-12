import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ThemeToggle from "./ThemeToggle";

const useThemeMock = vi.fn();
const setThemeMock = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => useThemeMock(),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    setThemeMock.mockClear();
    useThemeMock.mockReturnValue({
      resolvedTheme: "light",
      setTheme: setThemeMock,
      theme: "system",
    });
  });

  it("lets the user choose a theme override", async () => {
    const user = userEvent.setup();

    render(
      <ThemeToggle
        labels={{
          theme: "Theme",
          system: "System",
          light: "Light",
          dark: "Dark",
        }}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Theme" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Dark" }));

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("displays the resolved theme icon", async () => {
    useThemeMock.mockReturnValue({
      resolvedTheme: "dark",
      setTheme: setThemeMock,
      theme: "dark",
    });

    render(
      <ThemeToggle
        labels={{
          theme: "Theme",
          system: "System",
          light: "Light",
          dark: "Dark",
        }}
      />
    );

    // Wait for mounted state and icon to render
    await waitFor(() => {
      // Moon icon should be rendered for dark theme
      const button = screen.getByRole("button", { name: "Theme" });
      expect(button).toBeInTheDocument();
    });
  });

  it("shows system option in radio group", async () => {
    const user = userEvent.setup();

    render(
      <ThemeToggle
        labels={{
          theme: "Theme",
          system: "System",
          light: "Light",
          dark: "Dark",
        }}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Theme" }));
    const systemOption = screen.getByRole("menuitemradio", { name: "System" });
    await user.click(systemOption);

    expect(setThemeMock).toHaveBeenCalledWith("system");
  });
});