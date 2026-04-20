import { NextResponse } from "next/server";

// Apple OAuth is intentionally disabled until the backend flow is re-enabled with nonce
// binding. This route responds 501 instead of proxying to a commented-out backend path so
// callers get a clear signal that the feature is not available.
export async function POST() {
  return NextResponse.json(
    {
      title: "Not implemented",
      detail: "Apple sign-in is not currently available.",
      errorCode: "apple_oauth_disabled",
      status: 501,
    },
    { status: 501 }
  );
}
