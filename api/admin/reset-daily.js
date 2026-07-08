// api/admin/reset-daily.js — manually reset a learner's daily message cap.
//
// The daily counter normally self-clears ~26h after first use (rolls over
// at midnight), but this unblocks a student immediately — mainly useful
// during QA/testing so you're not stuck waiting for the day to roll over.
//
// POST /api/admin/reset-daily
// Headers: { "x-admin-secret": ADMIN_SECRET }
// Body: { student_id }
// Reply: { ok, student_id }

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
    const { student_id } = req.body || {};
    if (!student_id || typeof student_id !== 'string' || student_id.length > 128) {
      return res.status(400).json({ error: 'bad_student_id' });
    }
    await store.resetDaily(student_id);
    return res.status(200).json({ ok: true, student_id });
  } catch (err) {
    console.error('Reset-daily error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
