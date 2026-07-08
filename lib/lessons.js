// lib/lessons.js — server-side lesson content registry
//
// This is the ONLY place lesson knowledge lives. The SCORM package sends a
// lesson_id; the proxy injects this content into the system prompt. Learners
// never see or control the prompt.
//
// Structure per lesson:
//   can_do        — the Can-do objective (Irodori-style, original content)
//   level         — JF/CEFR level, drives tutor register
//   vocab         — [{ jp, romaji, en }]
//   grammar       — [{ pattern, explanation, example }]
//   dialogues     — model dialogues the tutor may reference
//   tutor_notes   — pedagogy instructions specific to this lesson
//   roleplay      — optional scoped roleplay the tutor may perform
//   model         — optional per-lesson model override ("sonnet"|"haiku"|full string)
// NOTE: quiz answer keys are deliberately NOT stored here — the tutor cannot
// leak what it does not know.

import { createHash } from 'crypto';

export const lessons = {
  'jp-starter-01': {
    title: 'Good morning!',
    can_do: 'I can use basic greetings for different times of day, and say thank you / sorry, in both polite and casual forms.',
    level: 'A1 (Starter)',
    vocab: [
      { jp: 'おはようございます', romaji: 'ohayou gozaimasu', en: 'Good morning (polite)' },
      { jp: 'おはよう', romaji: 'ohayou', en: 'Good morning (casual)' },
      { jp: 'こんにちは', romaji: 'konnichiwa', en: 'Hello / Good afternoon' },
      { jp: 'こんばんは', romaji: 'konbanwa', en: 'Good evening' },
      { jp: 'おやすみなさい', romaji: 'oyasuminasai', en: 'Good night (polite)' },
      { jp: 'おやすみ', romaji: 'oyasumi', en: 'Good night (casual)' },
      { jp: 'ありがとうございます', romaji: 'arigatou gozaimasu', en: 'Thank you (polite)' },
      { jp: 'どうも', romaji: 'doumo', en: 'Thanks (casual)' },
      { jp: 'すみません', romaji: 'sumimasen', en: 'Excuse me / Sorry' },
      { jp: 'じゃあ、また', romaji: 'jaa, mata', en: 'See you (casual goodbye)' },
      { jp: 'お疲れさまでした', romaji: 'otsukaresama deshita', en: 'Thanks for your hard work (polite, said when parting after shared effort)' },
      { jp: 'お疲れさま', romaji: 'otsukaresama', en: 'Thanks for your hard work (casual)' },
    ],
    grammar: [],
    kana_scope: 'Hiragana rows あ–こ (a i u e o, ka ki ku ke ko). Learners are just beginning to read kana; always show romaji alongside Japanese.',
    dialogues: [
      'A（上司）: おはようございます。\nB（新人）: おはようございます！',
      'B: おはよう！\nC（友だち）: おはよう。げんき？',
      'A: お疲れさまでした。\nB: お疲れさまでした！じゃあ、また。',
    ],
    tutor_notes:
      "This lesson has no sentence-building grammar, only functional greeting phrases, so mastery is demonstrated by correct usage in context, not by constructing sentences. The core skill is choosing the right phrase for the situation: time of day (morning/afternoon/evening/night) and register (polite for a stranger or superior, casual for a friend). Actively ask the learner situational questions rather than just presenting vocabulary — for example, 'If you saw your boss at 8am, what would you say?' or 'Your friend is going to bed, what do you say to them?' This forces them to pick both the correct phrase and the correct register, which is the actual skill this lesson teaches. When a learner uses a phrase correctly for a given situation, that counts as demonstrated mastery of that word. If they use the casual form when the polite form was called for (or vice versa), treat it as a gentle correction opportunity, not a failure: confirm they picked the right phrase family, then coach the register. Do not introduce grammar patterns, particles, or sentence construction in this lesson, even if the learner asks — that begins in a later lesson. If the learner tries to introduce themselves or say their name, warmly acknowledge it but redirect: that skill is coming in a later lesson, and this one is about greetings only. Drive toward full completion: the learner has a visual checklist of all 12 vocabulary items in this lesson, and each one only gets checked off when you mark it mastered. Treat working through the full list as the session's goal, not a single exchange. Steer unprompted toward whatever's still missing (see the VOCABULARY CHECKLIST STATE in your instructions for exactly which words remain) — for example, 'Nice, you've got morning and evening covered. Let's try a nighttime one now' or 'You've nailed the polite forms, want to try the casual versions with a friend?' If the learner seems to be wrapping up with items still unchecked, proactively offer one or two more situational prompts covering what's left before letting the conversation move on. Don't rush or force it if the learner clearly wants to stop, but always leave the door open by naming what's left.",
    roleplay:
      'You may roleplay brief greeting exchanges at different times of day and with different relationships (a boss/stranger requiring polite form, a close friend allowing casual form). Present the learner with a quick scenario (e.g., "It\'s 9pm and you\'re leaving the office, your manager is still there") and have them respond with the appropriate phrase and register. Do not roleplay a first-meeting or self-introduction scene, since that content belongs to a later lesson.',
  },

  'jp-starter-02': {
    title: 'Numbers, Time and Prices',
    can_do: 'I can say and understand numbers, clock times, and simple prices.',
    level: 'A1 (Starter)',
    vocab: [
      { jp: 'いち', romaji: 'ichi', en: 'one' },
      { jp: 'に', romaji: 'ni', en: 'two' },
      { jp: 'さん', romaji: 'san', en: 'three' },
      { jp: 'じ', romaji: 'ji', en: "o'clock (hour counter)" },
      { jp: 'えん', romaji: 'en', en: 'yen' },
      { jp: 'いくらですか', romaji: 'ikura desu ka', en: 'How much is it?' },
    ],
    grammar: [
      {
        pattern: '[Number] じ です',
        explanation: 'Attach "ji" to a number for clock hours.',
        example: 'さんじです。(San-ji desu.) — It is 3 o\u2019clock.',
      },
    ],
    kana_scope: 'Hiragana rows さ–と added. Continue showing romaji.',
    dialogues: [],
    tutor_notes: 'Drill numbers playfully. Offer mini number quizzes when the learner asks for practice.',
    roleplay: 'You may quiz the learner on numbers and times, one question at a time.',
  },

  'jp-starter-03': {
    title: 'Ordering at a Restaurant',
    can_do: 'I can order food and drinks at a restaurant.',
    level: 'A1 (Starter)',
    vocab: [
      { jp: 'みず', romaji: 'mizu', en: 'water' },
      { jp: 'おちゃ', romaji: 'ocha', en: 'tea' },
      { jp: 'ください', romaji: 'kudasai', en: 'please (give me)' },
      { jp: 'メニュー', romaji: 'menyuu', en: 'menu' },
    ],
    grammar: [
      {
        pattern: '[Item] を ください',
        explanation: '"o kudasai" politely requests an item.',
        example: 'みずを ください。(Mizu o kudasai.) — Water, please.',
      },
    ],
    kana_scope: 'Review of learned hiragana; katakana loanwords introduced gently (メニュー).',
    dialogues: [],
    tutor_notes: 'The restaurant roleplay is the heart of this lesson — offer it proactively.',
    roleplay: 'You may roleplay restaurant staff taking the learner\u2019s order, staying within lesson vocabulary.',
  },
};

export function getLesson(lessonId) {
  return lessons[lessonId] || null;
}

// Content-version hash: a stable fingerprint of everything that actually
// shapes the tutor's behavior for a lesson (teaching content), deliberately
// EXCLUDING operational fields like `model` that don't change what's being
// taught. Any edit to vocab, grammar, dialogues, tutor_notes, roleplay,
// can_do, or kana_scope changes this hash automatically — no manual version
// bump required. Used to detect and auto-discard stale chat history that
// was recorded against a since-changed version of a lesson (see
// store.getHistory / store.appendHistory).
function contentFingerprint(lesson) {
  const relevant = {
    title: lesson.title,
    can_do: lesson.can_do,
    level: lesson.level,
    vocab: lesson.vocab,
    grammar: lesson.grammar,
    kana_scope: lesson.kana_scope,
    dialogues: lesson.dialogues,
    tutor_notes: lesson.tutor_notes,
    roleplay: lesson.roleplay,
  };
  return createHash('sha256').update(JSON.stringify(relevant)).digest('hex').slice(0, 12);
}

export function getLessonVersion(lessonId) {
  const lesson = getLesson(lessonId);
  return lesson ? contentFingerprint(lesson) : null;
}
