// api/admin/clear-history.js — manually clear a learner's stored chat
// history for one lesson.
//
// Mainly useful for:
//   - QA/test accounts, so you don't wait out the 90-day TTL between tests
//   - Force-resetting a specific learner if something looks stuck/stale
// Note: most staleness is now handled automatically — see getLessonVersion
// in lib/lessons.js and the version check in store.getHistory/appendHistory.
// This endpoint is for the manual cases that automatic invalidation doesn't
// cover (e.g. you want to reset a learner's conversation without changing
// the lesson content itself).
//
// POST /api/admin/clear-history
// Headers: { "x-admin-secret": ADMIN_SECRET }
// Body: { student_id, lesson_id }
// Reply: { ok, student_id, lesson_id }

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
    const { student_id, lesson_id } = req.body || {};
    if (!student_id || typeof student_id !== 'string' || student_id.length > 128) {
      return res.status(400).json({ error: 'bad_student_id' });
    }
    if (!lesson_id || typeof lesson_id !== 'string') {
      return res.status(400).json({ error: 'bad_lesson_id' });
    }
    await store.clearHistory(student_id, lesson_id);
    return res.status(200).json({ ok: true, student_id, lesson_id });
  } catch (err) {
    console.error('Clear-history error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
