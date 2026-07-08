// api/tutor.js — main chat endpoint
//
// POST /api/tutor
// Body: { student_id, student_name?, org_id?, lesson_id, message, history? }
// Reply: { reply, credits_remaining, credit_source, daily_used, daily_cap }
//
// Pipeline (order matters — cheap checks first, credit consumed last before
// the Anthropic call, refunded if the upstream call fails):
//   CORS -> validate -> input filter -> rate limit -> daily cap -> credits
//   -> Anthropic -> respond

import { config, resolveModelAlias } from '../lib/config.js';
import { store } from '../lib/store.js';
import { getLesson, getLessonVersion } from '../lib/lessons.js';
import { buildSystemPrompt, filterInput, sanitizeHistory, extractMastery } from '../lib/guardrails.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', config.allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const { student_id, student_name, org_id, lesson_id, message, history } = req.body || {};

    // --- Validation ---
    if (!student_id || typeof student_id !== 'string' || student_id.length > 128) {
      return res.status(400).json({ error: 'missing_student_id' });
    }
    const lesson = getLesson(lesson_id);
    if (!lesson) return res.status(400).json({ error: 'unknown_lesson_id' });

    // --- Input filter (free) ---
    const filtered = filterInput(message);
    if (!filtered.ok) {
      return res.status(400).json({ error: filtered.reason });
    }

    // --- Rate limit ---
    if (!(await store.rateAllow(student_id))) {
      return res.status(429).json({ error: 'too_fast', retry_after_seconds: config.minSecondsBetweenRequests });
    }

    // --- Daily cap ---
    const daily = await store.checkAndCountDaily(student_id);
    if (!daily.ok) {
      return res.status(429).json({ error: 'daily_cap_reached', daily_cap: daily.cap });
    }

    // --- Credits (consumed BEFORE the model call, refunded on failure) ---
    const credit = await store.consumeCredit(student_id, org_id);
    if (!credit.ok) {
      await store.undoDailyCount(student_id);
      return res.status(402).json({ error: 'no_credits', credits_remaining: 0 });
    }

    // --- Build request ---
    const progress = await store.getProgress(student_id);
    const system = buildSystemPrompt(lesson, student_name, progress, lesson_id);
    const messages = [...sanitizeHistory(history), { role: 'user', content: message }];
    const model = lesson.model ? resolveModelAlias(lesson.model) : config.model;

    // --- Anthropic call ---
    let reply = '';
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: config.maxOutputTokens,
          system,
          messages,
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`anthropic_${resp.status}: ${errText.slice(0, 200)}`);
      }
      const data = await resp.json();
      reply = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (!reply) throw new Error('empty_model_reply');
    } catch (err) {
      // Refund on upstream failure — the learner got nothing.
      await store.refundCredit(student_id, org_id, credit.source);
      await store.undoDailyCount(student_id);
      console.error('Upstream failure:', err.message);
      return res.status(502).json({ error: 'ai_unavailable' });
    }

    // Strip the invisible [[MASTERED: ...]] marker (if present) from the
    // reply before the learner ever sees or hears it, and validate any
    // named words against this lesson's actual vocabulary so a malformed
    // or hallucinated entry can't reach the learner's progress record.
    const { cleanReply, masteredWords } = extractMastery(reply, lesson);
    const allMasteredForLesson = await store.addMasteredWords(student_id, lesson_id, masteredWords);

    // Record this successful exchange for future progress-based encouragement
    // and for resuming the conversation on a future visit. Strip the
    // "[Spoken practice attempt]" tag before storing — that's an internal
    // signal for Sensei, not something the learner should see echoed back
    // in their own chat bubble when they return to this lesson later.
    const updatedProgress = await store.recordProgress(student_id, lesson_id);
    const displayMessage = message.replace(/^\[Spoken practice attempt\]\s*/, '');
    await store.appendHistory(student_id, lesson_id, displayMessage, cleanReply, getLessonVersion(lesson_id));

    return res.status(200).json({
      reply: cleanReply,
      credits_remaining: credit.balance,
      credit_source: credit.source,
      daily_used: daily.used,
      daily_cap: daily.cap,
      model_used: model,
      progress: updatedProgress,
      mastered_words: allMasteredForLesson,
    });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
