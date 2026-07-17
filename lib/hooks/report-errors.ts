import type { MetaErrorCode } from "@/lib/meta-api";

/** Client-side abort budget — trips before Vercel's 120s function kill so the UI can
 *  render a TIMEOUT banner instead of a dead connection / false auth error (spec 4.3, D1). */
export const CLIENT_ABORT_MS = 110_000;

/** Normalizes any fetch-layer failure into the shared error taxonomy.
 *  A client-side AbortError (our 110s budget) is always a TIMEOUT, never auth. */
export function classifyClientError(err: unknown): { message: string; code: MetaErrorCode } {
  if (err instanceof DOMException && err.name === "AbortError") {
    return {
      code: "TIMEOUT",
      message: "This range is too heavy to compute in one go.",
    };
  }
  const code = (err as { code?: MetaErrorCode })?.code;
  const message = err instanceof Error ? err.message : "Something went wrong";
  if (code === "META_AUTH" || code === "META_RATE_LIMIT" || code === "TIMEOUT" || code === "UNKNOWN") {
    return { code, message };
  }
  return { code: "UNKNOWN", message };
}
