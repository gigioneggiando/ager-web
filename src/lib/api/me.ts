import { ApiError, parseApiError } from "@/lib/api/errors";
import { getCsrfHeaderValue } from "@/lib/api/auth";
import type {
  UserProfileDto,
  UpdateMyProfileRequest,
  ChangeMyPasswordRequest,
} from "./me.types";

export { ApiError };

async function authFetch(
  input: string,
  init: RequestInit,
  accessToken: string,
  options?: { csrf?: boolean }
) {
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (options?.csrf) {
    const csrf = await getCsrfHeaderValue();
    if (csrf) {
      headers.set("X-CSRF-TOKEN", csrf);
    }
  }

  const res = await fetch(input, {
    ...init,
    headers,
  });

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res;
}

export async function getMe(accessToken: string): Promise<UserProfileDto> {
  const res = await authFetch(`/api/me`, { method: "GET" }, accessToken);
  return (await res.json()) as UserProfileDto;
}

export async function patchMe(
  body: UpdateMyProfileRequest,
  accessToken: string
): Promise<UserProfileDto> {
  const res = await authFetch(
    `/api/me`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    accessToken,
    { csrf: true }
  );

  return (await res.json()) as UserProfileDto;
}

export async function changeMyPassword(
  body: ChangeMyPasswordRequest,
  accessToken: string
): Promise<void> {
  await authFetch(
    `/api/me/change-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    accessToken,
    { csrf: true }
  );
}

export async function deleteMe(accessToken: string): Promise<void> {
  await authFetch(
    `/api/me`,
    { method: "DELETE" },
    accessToken,
    { csrf: true }
  );
}
