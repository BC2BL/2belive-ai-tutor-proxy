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

export const lessons = {
  'jp-starter-01': {
    title: 'Greetings and Self-Introduction',
    can_do: 'I can greet people and introduce myself simply.',
    level: 'A1 (Starter)',
    vocab: [
      { jp: 'はじめまして', romaji: 'hajimemashite', en: 'Nice to meet you (first meeting)' },
      { jp: 'おはようございます', romaji: 'ohayou gozaimasu', en: 'Good morning (polite)' },
      { jp: 'こんにちは', romaji: 'konnichiwa', en: 'Hello / Good afternoon' },
      { jp: 'こんばんは', romaji: 'konbanwa', en: 'Good evening' },
      { jp: 'ありがとうございます', romaji: 'arigatou gozaimasu', en: 'Thank you (polite)' },
      { jp: 'すみません', romaji: 'sumimasen', en: 'Excuse me / Sorry' },
      { jp: 'わたし', romaji: 'watashi', en: 'I / me' },
      { jp: 'なまえ', romaji: 'namae', en: 'name' },
      { jp: 'どうぞよろしくおねがいします', romaji: 'douzo yoroshiku onegaishimasu', en: 'Please treat me well (self-intro closer)' },
      { jp: 'さようなら', romaji: 'sayounara', en: 'Goodbye' },
    ],
    grammar: [
      {
        pattern: '[Name] です (desu)',
        explanation: '"desu" is a polite copula — it works like "am/is". Attach it after your name to say "I am [Name]".',
        example: 'チェンです。(Chen desu.) — I am Chen.',
      },
      {
        pattern: '[Country/Job] から きました (kara kimashita)',
        explanation: '"kara kimashita" means "came from". Use it to say where you are from.',
        example: 'シンガポールから きました。(Singapooru kara kimashita.) — I came from Singapore.',
      },
    ],
    kana_scope: 'Hiragana rows あ–こ (a i u e o, ka ki ku ke ko). Learners are just beginning to read kana; always show romaji alongside Japanese.',
    dialogues: [
      'A: はじめまして。リンです。どうぞよろしくおねがいします。\nB: はじめまして。タンです。こちらこそ、よろしくおねがいします。',
    ],
    tutor_notes:
      'Learner is an absolute beginner. Always pair Japanese with romaji and an English gloss. Encourage the learner to attempt a full self-introduction. When they make an error, praise the attempt first, then give one gentle correction — never more than one correction per reply.',
    roleplay:
      'You may roleplay a friendly new coworker meeting the learner for the first time, staying strictly within this lesson vocabulary.',
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
