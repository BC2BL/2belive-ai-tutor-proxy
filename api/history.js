// api/history.js — fetch persisted chat history so a learner can resume
// a lesson's Sensei conversation where they left off.
//
// GET /api/history?student_id=...&lesson_id=...
// Reply: { history: [{ role: "user"|"assistant", content: "..." }, ...] }

import { config } from '../lib/config.js';
import { store } from '../lib/store.js';
import { getLessonVersion } from '../lib/lessons.js';

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
    const lessonId = String(req.query.lesson_id || '');
    if (!studentId || studentId.length > 128) {
      return res.status(400).json({ error: 'missing_student_id' });
    }
    if (!lessonId) {
      return res.status(400).json({ error: 'missing_lesson_id' });
    }
    const history = await store.getHistory(studentId, lessonId, getLessonVersion(lessonId));
    const progress = await store.getProgress(studentId);
    const masteredWords = progress.masteredWords[lessonId] || [];
    return res.status(200).json({ history, mastered_words: masteredWords });
  } catch (err) {
    console.error('History fetch error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
