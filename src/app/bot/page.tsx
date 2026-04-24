import { redirect } from "next/navigation";

// The AgerBot User-Agent advertises +https://agerculture.com/bot without a locale prefix;
// this top-level redirect points it at the default-locale page. Mirror of the /app/page.tsx
// pattern that redirects / → /it.
export default function BotRootRedirect() {
  redirect("/it/bot");
}
