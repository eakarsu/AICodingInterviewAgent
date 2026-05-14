// Per-user AI rate limiter: 20 AI calls per hour per user (identified by IP or user id)
const aiStore = new Map();

const AI_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const AI_MAX_CALLS = 20;

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of aiStore) {
    if (now > entry.resetTime) {
      aiStore.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

const aiRateLimiter = (req, res, next) => {
  const key = (req.user && req.user.id)
    ? `user:${req.user.id}`
    : `ip:${req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'}`;

  const now = Date.now();
  let entry = aiStore.get(key);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + AI_WINDOW_MS };
    aiStore.set(key, entry);
  }

  entry.count++;

  res.set('X-RateLimit-Limit', AI_MAX_CALLS);
  res.set('X-RateLimit-Remaining', Math.max(0, AI_MAX_CALLS - entry.count));
  res.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

  if (entry.count > AI_MAX_CALLS) {
    return res.status(429).json({
      error: 'AI rate limit exceeded',
      message: `Maximum ${AI_MAX_CALLS} AI calls per hour allowed. Try again after ${new Date(entry.resetTime).toISOString()}`
    });
  }

  next();
};

module.exports = { aiRateLimiter };
