import { ApiError } from "@/lib/api";

/**
 * Turn a caught error into user-facing copy. For an ApiError the resolution order is:
 *   1. byDetail[e.detail]  — a message keyed on the backend's `detail` discriminator
 *   2. byStatus[e.status]  — a message keyed on the HTTP status
 *   3. e.detail            — the raw detail, when `preferDetail` is set and it's present
 *   4. fallback
 * Anything that isn't an ApiError (network failure, etc.) always gets the fallback.
 */
export function apiErrorMessage(
  e: unknown,
  opts: {
    byStatus?: Record<number, string>;
    byDetail?: Record<string, string>;
    preferDetail?: boolean;
    fallback: string;
  },
): string {
  if (e instanceof ApiError) {
    const byDetail = opts.byDetail?.[e.detail];
    if (byDetail !== undefined) return byDetail;
    const byStatus = opts.byStatus?.[e.status];
    if (byStatus !== undefined) return byStatus;
    if (opts.preferDetail && e.detail) return e.detail;
  }
  return opts.fallback;
}
