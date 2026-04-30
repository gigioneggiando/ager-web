import { NextResponse } from "next/server";

const ITALIAN_COUNTRIES = new Set(["IT", "SM", "VA"]);

function pickIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? null;
}

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number.parseInt(ip.split(".")[1] ?? "", 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
}

function localeFromAcceptLanguage(header: string | null): "it" | "en" {
  if (!header) return "en";
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("it") ? "it" : "en";
}

async function lookupCountryByIp(ip: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      signal: controller.signal,
      headers: { "User-Agent": "ager-web locale-detect" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim().toUpperCase();
    return text.length === 2 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  const edgeCountry =
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    null;

  let country = edgeCountry?.toUpperCase() ?? null;

  if (!country) {
    const ip = pickIp(req);
    if (ip && !isPrivateIp(ip)) {
      country = await lookupCountryByIp(ip);
    }
  }

  let locale: "it" | "en";
  if (country) {
    locale = ITALIAN_COUNTRIES.has(country) ? "it" : "en";
  } else {
    locale = localeFromAcceptLanguage(req.headers.get("accept-language"));
  }

  return NextResponse.json(
    { locale, country: country ?? null, source: country ? "geo" : "accept-language" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
