import { ApiError } from "@/lib/api/errors";
import { getCsrfHeaderValue } from "@/lib/api/auth";
import { requestJson, requestVoid } from "@/lib/api/request";
import type {
  UserProfileDto,
  UpdateMyProfileRequest,
  ChangeMyPasswordRequest,
} from "./me.types";

export { ApiError };

async function buildRequestHeaders(csrf?: boolean): Promise<HeadersInit | undefined> {
  if (!csrf) {
    return undefined;
  }

  const csrfToken = await getCsrfHeaderValue();
  if (!csrfToken) {
    return undefined;
  }

  return { "X-CSRF-TOKEN": csrfToken };
}

export async function getMe(accessToken: string): Promise<UserProfileDto> {
  return requestJson<UserProfileDto>("/api/me", {
    method: "GET",
    accessToken,
  });
}

export async function patchMe(
  body: UpdateMyProfileRequest,
  accessToken: string
): Promise<UserProfileDto> {
  return requestJson<UserProfileDto>("/api/me", {
    method: "PATCH",
    body,
    accessToken,
    headers: await buildRequestHeaders(true),
  });
}

export async function changeMyPassword(
  body: ChangeMyPasswordRequest,
  accessToken: string
): Promise<void> {
  await requestVoid("/api/me/change-password", {
    method: "POST",
    body,
    accessToken,
    headers: await buildRequestHeaders(true),
  });
}

export async function deleteMe(accessToken: string): Promise<void> {
  await requestVoid("/api/me", {
    method: "DELETE",
    accessToken,
    headers: await buildRequestHeaders(true),
  });
}
