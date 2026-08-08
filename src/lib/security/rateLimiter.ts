/**
 * Simple in-memory sliding-window rate limiter.
 *
 * CAVEAT: this state lives in the serverless function's memory, so on
 * Vercel it only protects within a single warm instance — it resets
 * on cold starts and isn't shared across concurrent instances. That's
 * fine as a first line of defense against casual abuse; for durable,
 * cross-instance brute-force detection (which matters more for
 * security) see lib/security/loginGuard.ts, which persists attempts
 * to MongoDB instead. A production deployment under real attack
 * traffic should put this behind Redis (e.g. Upstash) — flagged here
 * as a Phase 4+ upgrade rather than built now to avoid adding a new
 * infra dependency before it's needed.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: maxRequests - existing.count };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
