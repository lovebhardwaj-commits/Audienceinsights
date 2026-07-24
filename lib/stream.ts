import { MetaApiError, type MetaErrorCode } from "./meta-api";

export type ProgressEmit = (progress: { current: number; total: number; label: string }) => void;

/** Streaming reports can emit each entity as it resolves, so the client renders it
 *  the moment it lands instead of waiting for the whole run (D2, wired up in Phase 3). */
export type PartialEmit = (partial: unknown) => void;

export type NdjsonEvent =
  | { type: "progress"; current: number; total: number; label: string }
  | { type: "partial"; item: unknown }
  | { type: "done"; data: unknown }
  | { type: "error"; message: string; code: MetaErrorCode };

export type StreamSettled = { status: "success" } | { status: "error"; code: MetaErrorCode; message: string };

/** Wraps a long-running report computation in an NDJSON stream so the client can render live
 *  progress. `work` receives a progress emitter and a partial emitter — the latter streams each
 *  entity as it resolves so the page renders it immediately instead of waiting for the whole run (D2).
 *  `onSettled` (optional) fires once with the final outcome — used for activity logging without
 *  duplicating the try/catch classification in every streaming report route. */
export function ndjsonResponse(
  work: (emit: ProgressEmit, emitPartial: PartialEmit) => Promise<unknown>,
  onSettled?: (result: StreamSettled) => void
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit: ProgressEmit = (progress) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", ...progress }) + "\n"));
      };
      const emitPartial: PartialEmit = (item) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "partial", item }) + "\n"));
      };
      try {
        const data = await work(emit, emitPartial);
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done", data }) + "\n"));
        onSettled?.({ status: "success" });
      } catch (err) {
        // Classify inline so the stream carries the same taxonomy as JSON routes (D1).
        const code: MetaErrorCode =
          err instanceof MetaApiError
            ? err.errorCode
            : err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")
              ? "TIMEOUT"
              : "UNKNOWN";
        if (code !== "META_AUTH") console.error(`Streaming report failed [${code}]:`, err);
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message, code }) + "\n"));
        onSettled?.({ status: "error", code, message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
