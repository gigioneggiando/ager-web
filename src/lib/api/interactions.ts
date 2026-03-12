import { API_BASE } from "./client";
import { requestMaybeJson } from "@/lib/api/request";

/** String variants we use in the UI */
export type InteractionKind = "LIKE" | "SAVE" | "DISCARD" | "REPORT";

/** Backend expects numeric enum: 0=LIKE, 1=SAVE, 2=DISCARD, 3=REPORT */
const TypeToNumber: Record<InteractionKind, number> = {
  LIKE: 0,
  SAVE: 1,
  DISCARD: 2,
  REPORT: 3,
};

export type PostInteractionRequest = {
  articleId: number;
  type: InteractionKind;
  reason?: string;
};

export async function postInteraction(
  body: PostInteractionRequest,
  accessToken?: string
) {
  // Send PascalCase keys to mirror your C# DTO:
  // public int ArticleId { get; init; }
  // public InteractionType Type { get; init; }
  // public string? Reason { get; init; }
  const payload = {
    ArticleId: body.articleId,
    Type: TypeToNumber[body.type],
    // Only include Reason when present (some backends dislike nulls)
    ...(body.reason ? { Reason: body.reason } : {}),
  };

  return requestMaybeJson(`${API_BASE}/api/interactions`, {
    method: "POST",
    accessToken,
    credentials: "include",
    body: payload,
  });
}
