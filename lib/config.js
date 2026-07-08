// lib/config.js — central configuration for the 2BeLive AI Tutor proxy
// All values overridable via Vercel environment variables.

const MODEL_ALIASES = {
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
};

function resolveModel(value) {
  if (!value) return MODEL_ALIASES.sonnet;
  const v = String(value).trim().toLowerCase();
  return MODEL_ALIASES[v] || value; // allow full model strings too
}

export const config = {
  // --- Model ---
  // Set TUTOR_MODEL to "sonnet", "haiku", or a full Anthropic model string.
  // Per-lesson override supported via `model` field in lib/lessons.js.
  model: resolveModel(process.env.TUTOR_MODEL),
  maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS || '400', 10),

  // --- Credits ---
  initialCredits: parseInt(process.env.INITIAL_CREDITS || '100', 10), // auto-granted to new learners
  dailyCap: parseInt(process.env.DAILY_CAP || '50', 10),              // messages/day even with credits

  // --- Abuse controls ---
  maxMessageChars: parseInt(process.env.MAX_MESSAGE_CHARS || '500', 10),
  maxHistoryTurns: parseInt(process.env.MAX_HISTORY_TURNS || '12', 10), // trims conversation sent to the model
  minSecondsBetweenRequests: parseInt(process.env.MIN_SECONDS_BETWEEN || '3', 10),

  // --- CORS ---
  // Lock to the 2BeLive player origin in production, e.g. "https://app.2belive.net".
  // "*" is acceptable only during QA.
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',

  // --- Secrets ---
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  adminSecret: process.env.ADMIN_SECRET || '', // required for /api/admin/grant

  // --- ElevenLabs (English speech for Sensei's chat replies) ---
  // Japanese speech is unaffected — it stays on the free browser voice.
  // If elevenLabsApiKey or elevenLabsVoiceId is unset, /api/speak returns
  // 503 and the SCORM client automatically falls back to the browser voice
  // — so this can ship now and activate later purely via env vars, no
  // SCORM re-upload required.
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '',
  // Flash v2.5 — low latency, ~half the credit cost of Multilingual v2.
  // Override via env var if ElevenLabs changes model IDs, or switch to
  // "eleven_multilingual_v2" for higher quality later.
  elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
  maxSpeechChars: parseInt(process.env.MAX_SPEECH_CHARS || '1000', 10),
  minSecondsBetweenSpeech: parseInt(process.env.MIN_SECONDS_BETWEEN_SPEECH || '1', 10),

  // --- Persistent chat history (resume where the learner left off) ---
  maxStoredHistoryMessages: parseInt(process.env.MAX_STORED_HISTORY_MESSAGES || '40', 10), // 20 turns
  historyTtlDays: parseInt(process.env.HISTORY_TTL_DAYS || '90', 10),

  // --- Storage (Upstash Redis REST — recommended for production) ---
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL || '',
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || '',
};

export function resolveModelAlias(value) {
  return resolveModel(value);
}
