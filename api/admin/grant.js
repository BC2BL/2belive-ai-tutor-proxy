// api/admin/grant.js — manually add credits (pre-Stripe stopgap + org pool setup),
// or reset a student's balance back to the configured starting amount.
//
// POST /api/admin/grant
// Headers: { "x-admin-secret": ADMIN_SECRET }
// Body: { target: "student"|"org"|"reset", id, amount }
//   amount is required for "student"/"org" (added on top of current balance,
//   can be negative to deduct). Not used for "reset" — that always snaps
//   the student back to config.initialCredits, regardless of current balance.
// Reply: { ok, new_balance }
//
// Examples:
//   Seed an org pool:        { target: "org", id: "kidsrkids-southshore", amount: 5000 }
//   Top up one learner:      { target: "student", id: "stu_12345", amount: 200 }
//   Reset a test account:    { target: "reset", id: "local-student" }

import { config } from '../../lib/config.js';
import { store } from '../../lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', config.allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  if (!config.adminSecret || req.headers['x-admin-secret'] !== config.adminSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const { target, id, amount } = req.body || {};
    if (!['student', 'org', 'reset'].includes(target)) return res.status(400).json({ error: 'bad_target' });
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'bad_id' });

    if (target === 'reset') {
      const newBalance = await store.resetCredits(id);
      return res.status(200).json({ ok: true, target, id, new_balance: newBalance });
    }

    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 1000000) {
      return res.status(400).json({ error: 'bad_amount' });
    }
    const newBalance = await store.grant(target, id, n);
    return res.status(200).json({ ok: true, target, id, new_balance: newBalance });
  } catch (err) {
    console.error('Grant error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
