"use client";

import { useAppLocale } from "@/i18n/useAppLocale";
import { useSession } from "@/lib/auth/session";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ready, accessToken } = useSession();
  const router = useRouter();
  const { locale } = useAppLocale();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!ready) return;

    if (!accessToken) {
      router.replace(`/${locale}/login`);
      return;
    }

    setChecked(true);
  }, [ready, accessToken, locale, router]);

  // Prevent UI flash while deciding
  if (!checked) return null;
  return <>{children}</>;
}
