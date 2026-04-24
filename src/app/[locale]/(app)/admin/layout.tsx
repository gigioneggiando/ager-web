import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { readRoleCookie } from "@/lib/auth/cookie";

// Two-layer access control for the admin area:
//   1. SERVER — every request renders here first; we redirect non-admins before any admin
//      component hydrates. The role comes from the non-HttpOnly `ager_role` cookie written by
//      the auth proxy routes on login / refresh / register / oauth and cleared on logout.
//      Non-admins (role="user") and anonymous visitors (no cookie) never see admin UI.
//   2. BACKEND — every /api/admin/* endpoint is gated by `RequireRole("admin")`. If the
//      cookie is ever tampered with client-side the backend rejects the request with 401/403.
//      This file hides the UI; the backend enforces authorisation.
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const role = await readRoleCookie();
  if (role !== "admin") {
    redirect(`/${locale}`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Admin</h1>
      {children}
    </div>
  );
}
