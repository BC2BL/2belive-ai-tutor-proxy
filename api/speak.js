// api/speak.js — ElevenLabs text-to-speech proxy for Sensei's English replies
//
// POST /api/speak
// Body: { student_id, text }
// Reply: audio/mpeg binary (200), or JSON error
//
// Keeps the ElevenLabs API key server-side, same pattern as the Anthropic
// proxy. Only ever receives English text — Japanese speech stays on the
// free browser voice and never touches this endpoint.
//
// If ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID isn't configured, this
// returns 503 and the SCORM client falls back to the browser voice
// automatically. That means this can ship and stay dormant until you add
// your Voice ID — no SCORM re-upload needed to activate it later.

import { config } from '../lib/config.js';
import { store } from '../lib/store.js';

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
    const { student_id, text } = req.body || {};

    if (!student_id || typeof student_id !== 'string' || student_id.length > 128) {
      return res.status(400).json({ error: 'missing_student_id' });
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'missing_text' });
    }
    if (text.length > config.maxSpeechChars) {
      return res.status(400).json({ error: 'text_too_long' });
    }
    if (!config.elevenLabsApiKey || !config.elevenLabsVoiceId) {
      return res.status(503).json({ error: 'tts_not_configured' });
    }

    if (!(await store.speechRateAllow(student_id))) {
      return res.status(429).json({ error: 'too_fast' });
    }

    const elResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': config.elevenLabsApiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: config.elevenLabsModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elResp.ok) {
      const errText = await elResp.text();
      console.error('ElevenLabs error:', elResp.status, errText.slice(0, 300));
      return res.status(502).json({ error: 'tts_unavailable' });
    }

    const audioBuffer = await elResp.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('Speak handler error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
