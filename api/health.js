// api/health.js — deployment check + the probe's custom-URL test target
//
// GET /api/health
// Reply: { ok, storage, model, time }

import { config } from '../lib/config.js';
import { store } from '../lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', config.allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(200).json({
    ok: true,
    storage: store.usingRedis() ? 'upstash-redis' : 'in-memory (dev only — configure Upstash for production)',
    model: config.model,
    keyConfigured: !!config.anthropicApiKey,
    elevenLabsConfigured: !!(config.elevenLabsApiKey && config.elevenLabsVoiceId),
    elevenLabsModel: config.elevenLabsModel,
    time: new Date().toISOString(),
  });
}
