export type UserProfileDto = {
  id?: string;            // tolerate either id or userId
  userId?: string;
  email?: string;
  username: string;
  avatarUrl?: string | null;
  locale?: string | null;
  timezone?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UpdateMyProfileRequest = Partial<{
  username: string;
  avatarUrl: string | null;
  locale: string | null;
  timezone: string | null;
}>;

export type ChangeMyPasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

// Backend returns Results.BadRequest(result) => a Result or Result<T> json object.
// We accept a few common shapes and normalize in the client.
export type ResultEnvelope<T> = {
  isSuccess?: boolean;
  success?: boolean;
  error?: string | null;
  errors?: string[] | Record<string, string[]> | null;
  value?: T;
};
