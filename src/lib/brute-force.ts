/**
 * Brute-force protection for login endpoints.
 *
 * Tracks failed attempts per identifier (e.g. email or IP).
 * After `maxAttempts` failures within `windowMs`, the account/IP is locked
 * for `lockoutMs`.
 */

type AttemptEntry = { count: number; firstAt: number; lockedUntil: number | null };

const attempts = new Map<string, AttemptEntry>();

// Prune every 10 minutes.
// Skip in serverless (Vercel) — each invocation is isolated.
if (typeof setInterval !== "undefined" && process.env.VERCEL !== "1") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (entry.lockedUntil && now > entry.lockedUntil) {
        attempts.delete(key);
      } else if (!entry.lockedUntil && now - entry.firstAt > 10 * 60 * 1000) {
        attempts.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export type BruteForceOpts = {
  /** Max failed attempts before lockout. Default: 5. */
  maxAttempts?: number;
  /** Window in ms to track attempts. Default: 15 min. */
  windowMs?: number;
  /** Lockout duration in ms. Default: 15 min. */
  lockoutMs?: number;
};

export function bruteForceProtection(opts: BruteForceOpts = {}) {
  const maxAttempts = opts.maxAttempts ?? 5;
  const windowMs = opts.windowMs ?? 15 * 60_000;
  const lockoutMs = opts.lockoutMs ?? 15 * 60_000;

  return {
    /** Returns `true` if the identifier is allowed to attempt login. */
    isLocked(key: string): boolean {
      const entry = attempts.get(key);
      if (!entry) return false;
      if (entry.lockedUntil) {
        if (Date.now() < entry.lockedUntil) return true;
        attempts.delete(key);
        return false;
      }
      return false;
    },

    /** Record a failed attempt. Returns `true` if now locked. */
    recordFailure(key: string): boolean {
      const now = Date.now();
      const entry = attempts.get(key);
      if (!entry || now - entry.firstAt > windowMs) {
        attempts.set(key, { count: 1, firstAt: now, lockedUntil: null });
        return false;
      }
      entry.count += 1;
      if (entry.count >= maxAttempts) {
        entry.lockedUntil = now + lockoutMs;
        return true;
      }
      return false;
    },

    /** Clear attempts on successful login. */
    recordSuccess(key: string): void {
      attempts.delete(key);
    },

    /** Returns ms until lockout expires, or 0 if not locked. */
    retryAfter(key: string): number {
      const entry = attempts.get(key);
      if (!entry?.lockedUntil) return 0;
      return Math.max(0, entry.lockedUntil - Date.now());
    },
  };
}

/** Shared instance for login protection. */
export const loginProtection = bruteForceProtection();
