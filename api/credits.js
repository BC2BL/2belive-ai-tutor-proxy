// api/credits.js — balance lookup for the SCORM chat panel
//
// GET /api/credits?student_id=...&org_id=...
// Reply: { credits_remaining, credit_source, daily_cap }

import { config } from '../lib/config.js';
import { store } from '../lib/store.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', config.allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const studentId = String(req.query.student_id || '');
    const orgId = req.query.org_id ? String(req.query.org_id) : undefined;
    if (!studentId || studentId.length > 128) {
      return res.status(400).json({ error: 'missing_student_id' });
    }
    const { balance, source } = await store.getBalance(studentId, orgId);
    return res.status(200).json({
      credits_remaining: balance,
      credit_source: source,
      daily_cap: config.dailyCap,
    });
  } catch (err) {
    console.error('Credits error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
