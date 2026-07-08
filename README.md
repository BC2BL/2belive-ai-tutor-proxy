# 2BeLive AI Tutor Proxy (v1.0)

Server-side gateway between AI Tutor SCORM packages and the Anthropic API.
Holds the API key, the guardrail system prompt, the lesson content, and the
credit ledger — none of which ever ship inside a SCORM ZIP.

```
SCORM package (chat UI) → this proxy (guardrails + credits) → Anthropic API
```

Zero npm dependencies. Node 18+ (built-in fetch). Deploys to Vercel as-is.

---

## Deploy (Vercel — same pattern as Vurba)

1. Push this folder to a GitHub repo (or `vercel` CLI from the folder root).
2. Import into Vercel. No build settings needed — `api/` functions are auto-detected.
3. Set environment variables (see `.env.example`):
   - `ANTHROPIC_API_KEY` — required
   - `ADMIN_SECRET` — long random string
   - `TUTOR_MODEL` — `sonnet` (default) or `haiku`; switchable anytime in the Vercel dashboard, takes effect immediately, no redeploy
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — **required for production.** Without them the ledger is in-memory and resets between serverless invocations. Free tier at upstash.com → create Redis DB → copy REST credentials.
   - `ALLOWED_ORIGIN` — set to the 2BeLive player origin before real learners touch it
4. Verify: open `https://<deployment>/api/health` — check `storage` says `upstash-redis` and `keyConfigured: true`.
5. Re-run the SCORM connectivity probe's custom-URL test against `/api/health` from inside the 2BeLive player.
6. Open `test-harness.html` locally in a browser, point it at the deployment, and red-team Sensei.

## Model switching

Priority: per-lesson `model` field in `lib/lessons.js` → `TUTOR_MODEL` env var → default (`sonnet`).
Aliases: `sonnet` → `claude-sonnet-4-6`, `haiku` → `claude-haiku-4-5-20251001`.

## API contract (for the SCORM chat panel)

### POST /api/tutor
```json
{
  "student_id": "from cmi.core.student_id",
  "student_name": "from cmi.core.student_name (optional)",
  "org_id": "optional — charges the org pool if it exists",
  "lesson_id": "jp-starter-01",
  "message": "learner text (max 500 chars)",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```
200 → `{ reply, credits_remaining, credit_source, daily_used, daily_cap, model_used }`
402 → `{ error: "no_credits" }` — show top-up UI
429 → `{ error: "too_fast" | "daily_cap_reached" }`
400 → `{ error: "unknown_lesson_id" | "message_too_long" | "blocked_content" | ... }`
502 → `{ error: "ai_unavailable" }` — credit auto-refunded

### GET /api/credits?student_id=...&org_id=...
200 → `{ credits_remaining, credit_source, daily_cap }`

### POST /api/admin/grant  (header `x-admin-secret`)
```json
{ "target": "student" | "org", "id": "...", "amount": 200 }
```
Seeds org pools and tops up learners until Stripe is wired in.

## Credit model (both payment paths supported)

- New learners are auto-granted `INITIAL_CREDITS` (default 100) on first message.
- If the request carries an `org_id` **and** that org pool exists (seeded via
  `/api/admin/grant`), the pool is charged instead — per-learner `DAILY_CAP`
  still applies so one learner can't drain the pool.
- 1 message = 1 credit. Credit is consumed before the model call and refunded
  automatically if the Anthropic call fails.

## Guardrail layers

1. Server-side system prompt scoped to the lesson (learner never sees it)
2. Lesson content injected by `lesson_id` lookup — client sends only the ID
3. `max_tokens` cap (cost + pedagogy)
4. Input filter: length, empty, injection patterns — rejected before spending a token
5. Quiz answer keys are never stored in `lib/lessons.js`, so the tutor cannot leak them

## Adding lessons

Add an entry to `lib/lessons.js` following the `jp-starter-01` shape
(vocab, grammar, kana_scope, tutor_notes, optional roleplay + model override).
Redeploy. The SCORM package for that lesson sends the new `lesson_id`.

## Next steps (per project plan)

- [ ] Lesson 1 SCORM package with embedded chat panel (consumes this API)
- [ ] Stripe Checkout + webhook → replaces manual grants for learner-paid top-ups
- [ ] Admin usage dashboard
- [ ] Decision: learner-paid vs org-pool as the default commercial model
