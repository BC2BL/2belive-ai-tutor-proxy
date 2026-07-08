// lib/store.js — credit ledger + rate limiting
//
// Production backend: Upstash Redis (REST API — zero npm deps, works on Vercel).
// Fallback: in-memory Map. WARNING: in-memory state does NOT persist across
// serverless invocations on Vercel. The fallback exists only for local dev.
//
// Ledger design supports BOTH payment models (decision deferred):
//   - Learner balance:  key credits:student:{student_id}
//   - Org credit pool:  key credits:org:{org_id}
// If the request carries an org_id AND that org pool key exists, the pool is
// charged (with the per-learner daily cap still enforced). Otherwise the
// learner's individual balance is charged.

import { config } from './config.js';

// ---------- Backend selection ----------

const mem = new Map();

const hasRedis = () => !!(config.upstashUrl && config.upstashToken);

async function redis(cmd) {
  // cmd: array like ["GET", "key"] or ["SET", "key", "value"]
  const res = await fetch(config.upstashUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.upstashToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  const data = await res.json();
  return data.result;
}

async function kvGet(key) {
  if (hasRedis()) {
    const v = await redis(['GET', key]);
    return v === null ? null : v;
  }
  return mem.has(key) ? mem.get(key) : null;
}

async function kvSet(key, value) {
  if (hasRedis()) return redis(['SET', key, String(value)]);
  mem.set(key, String(value));
  return 'OK';
}

async function kvIncrBy(key, n) {
  if (hasRedis()) return redis(['INCRBY', key, n]);
  const cur = parseInt(mem.get(key) || '0', 10) + n;
  mem.set(key, String(cur));
  return cur;
}

async function kvExpire(key, seconds) {
  if (hasRedis()) return redis(['EXPIRE', key, seconds]);
  return 1; // no-op in memory fallback
}

// ---------- Ledger API ----------

function studentKey(studentId) {
  return `credits:student:${studentId}`;
}
function orgKey(orgId) {
  return `credits:org:${orgId}`;
}
function dailyKey(studentId) {
  const day = new Date().toISOString().slice(0, 10);
  return `usage:${studentId}:${day}`;
}
function lastSeenKey(studentId) {
  return `lastreq:${studentId}`;
}

export const store = {
  usingRedis: hasRedis,

  // Returns { balance, source } — source is "org" or "student".
  // Auto-grants initial credits to first-time learners (student balance only).
  async getBalance(studentId, orgId) {
    if (orgId) {
      const pool = await kvGet(orgKey(orgId));
      if (pool !== null) return { balance: parseInt(pool, 10), source: 'org' };
    }
    let bal = await kvGet(studentKey(studentId));
    if (bal === null) {
      await kvSet(studentKey(studentId), config.initialCredits);
      bal = String(config.initialCredits);
    }
    return { balance: parseInt(bal, 10), source: 'student' };
  },

  // Atomically consumes 1 credit. Returns { ok, balance, source, reason }.
  async consumeCredit(studentId, orgId) {
    const { balance, source } = await this.getBalance(studentId, orgId);
    if (balance <= 0) return { ok: false, balance: 0, source, reason: 'no_credits' };
    const key = source === 'org' ? orgKey(orgId) : studentKey(studentId);
    const after = await kvIncrBy(key, -1);
    if (after < 0) {
      await kvIncrBy(key, 1); // race lost — refund
      return { ok: false, balance: 0, source, reason: 'no_credits' };
    }
    return { ok: true, balance: after, source };
  },

  async refundCredit(studentId, orgId, source) {
    const key = source === 'org' ? orgKey(orgId) : studentKey(studentId);
    return kvIncrBy(key, 1);
  },

  // Daily cap: returns { ok, used, cap }.
  async checkAndCountDaily(studentId) {
    const key = dailyKey(studentId);
    const used = await kvIncrBy(key, 1);
    if (used === 1) await kvExpire(key, 60 * 60 * 26);
    if (used > config.dailyCap) return { ok: false, used, cap: config.dailyCap };
    return { ok: true, used, cap: config.dailyCap };
  },

  async undoDailyCount(studentId) {
    return kvIncrBy(dailyKey(studentId), -1);
  },

  // Simple per-student rate limit. Returns true if allowed.
  async rateAllow(studentId) {
    const key = lastSeenKey(studentId);
    const now = Date.now();
    const last = parseInt((await kvGet(key)) || '0', 10);
    if (now - last < config.minSecondsBetweenRequests * 1000) return false;
    await kvSet(key, now);
    await kvExpire(key, 3600);
    return true;
  },

  // Admin: add credits to a learner or an org pool.
  async grant(target, id, amount) {
    const key = target === 'org' ? orgKey(id) : studentKey(id);
    const existing = await kvGet(key);
    if (existing === null) await kvSet(key, 0);
    const after = await kvIncrBy(key, amount);
    return after;
  },
};
