"use client";

import { LaptopMinimal, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThemeToggleLabels = {
  theme: string;
  system: string;
  light: string;
  dark: string;
};

export default function ThemeToggle({ labels }: { labels: ThemeToggleLabels }) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? resolvedTheme ?? theme ?? "system" : "system";

  const themeIcon =
    activeTheme === "dark" ? <Moon className="h-4 w-4" /> :
    activeTheme === "light" ? <Sun className="h-4 w-4" /> :
    <LaptopMinimal className="h-4 w-4" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={labels.theme} title={labels.theme}>
          {themeIcon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{labels.theme}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="system">
            <LaptopMinimal className="h-4 w-4" />
            {labels.system}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun className="h-4 w-4" />
            {labels.light}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="h-4 w-4" />
            {labels.dark}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}