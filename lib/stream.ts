export type ProgressEmit = (progress: { current: number; total: number; label: string }) => void;

export type NdjsonEvent =
  | { type: "progress"; current: number; total: number; label: string }
  | { type: "done"; data: unknown }
  | { type: "error"; message: string };

/** Wraps a long-running report computation in an NDJSON stream so the client can render live progress. */
export function ndjsonResponse(work: (emit: ProgressEmit) => Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit: ProgressEmit = (progress) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", ...progress }) + "\n"));
      };
      try {
        const data = await work(emit);
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done", data }) + "\n"));
      } catch (err) {
        console.error("Streaming report failed:", err);
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message }) + "\n"));
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
