/**
 * In-memory sliding-window rate limiter.
 *
 * Good enough for a single-process Next.js server. For horizontal scaling,
 * swap the Map for Upstash Redis or similar.
 *
 * Usage:
 *   const limiter = rateLimit({ windowMs: 60_000, max: 5 });
 *   if (!limiter.check("login:127.0.0.1")) {
 *     return { ok: false, error: "Too many attempts. Try again later." };
 *   }
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Prune expired entries every 5 minutes to prevent memory leaks.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export type RateLimitOpts = {
  /** Window size in milliseconds. Default: 60 000 (1 min). */
  windowMs?: number;
  /** Max requests per window. Default: 10. */
  max?: number;
};

export function rateLimit(opts: RateLimitOpts = {}) {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 10;

  return {
    /**
     * Returns `true` if the request is allowed, `false` if rate-limited.
     * Each unique `key` (e.g. `"login:192.168.1.1"`) is tracked separately.
     */
    check(key: string): boolean {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },

    /** Returns how many ms until the window resets, or 0 if allowed. */
    retryAfter(key: string): number {
      const entry = store.get(key);
      if (!entry) return 0;
      return Math.max(0, entry.resetAt - Date.now());
    },
  };
}

/**
 * Pre-configured limiters for common endpoints.
 */
export const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 5 }); // 5 per 15 min
export const checkoutLimiter = rateLimit({ windowMs: 60_000, max: 3 }); // 3 per min
export const formLimiter = rateLimit({ windowMs: 60_000, max: 3 }); // 3 per min
export const trackLimiter = rateLimit({ windowMs: 60_000, max: 10 }); // 10 per min
