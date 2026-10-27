# «بازی امروز من» — My Daily Word Quest (hackathon feature spec)

Build this for ZAAL following `AGENTS.md` and `CLAUDE.md`. Explain your plan in
simple English and wait for the developer's OK before changing files. Build in
the small steps listed at the end, and list every changed file after each step.

## Idea in one line

Every day, Meta's AI designs a **new, personal multi-step game** for each child,
built from the Farsi words that child met in ZAAL that day. The child plays
alone; parents check the child's spoken words later, and their feedback shapes
tomorrow's game.

## 1. Today's words (tracking)

- Add a small local tracker `src/store/wordLog.ts` (AsyncStorage only).
- Every time a vocabulary clip plays through `playFaAudio()` in
  `utils/faAudio.ts`, log its key (e.g. `ingredients/apple`, `clothes/hat`,
  `painting/color/red`) with today's date. **Only log vocabulary categories**
  (ingredients, clothes, painting/color, counting/number, feed-animals/food,
  cooking/name, alphabet/example, solar-system) — not cheers, music, intros.
- Keep per word: times seen, times answered right/wrong in the quest, and the
  parent's verdict (see section 5).
- If the child met fewer than 4 words today, top up with words from earlier
  days that need practice, then with easy starter words.

## 2. The child picks today's words

Start screen of the quest: show up to 8 picture cards of today's words. The
child taps to choose 4–6 of them ("which ones do you want to play with?").
Each tap plays the word's existing recording. Use the word's existing art; if a
word has no art, don't offer it.

## 3. The AI designs the game (Muse Spark)

The app sends Muse Spark (via `askMeta()` → Supabase Edge Function `meta-ai`):
the chosen word ids, their category, the child's age, words that need practice,
and the list of available step types below. **No name or personal data.**

Muse Spark returns **JSON only**: a short quest with a theme that fits the words
(e.g. "Help Neli collect food for Grandma's picnic", "Get dressed for the snow
trip"), and **5–7 connected steps**. Steps must build on each other: items found
in one step are used in a later step, and the last step completes the theme
(the picnic is ready, Neli is dressed, the rocket launches).

```json
{
  "theme_id": "picnic_for_grandma",
  "theme_title_fa": "پیک‌نیک با مادربزرگ",
  "steps": [
    { "type": "find_it",     "target": "ingredients/apple", "distractors": ["clothes/hat", "ingredients/egg"] },
    { "type": "say_it",      "target": "ingredients/apple" },
    { "type": "memory_pairs","words": ["ingredients/apple", "ingredients/egg", "ingredients/bread"] },
    { "type": "count_it",    "target": "ingredients/egg", "count": 3 },
    { "type": "odd_one_out", "words": ["ingredients/apple", "ingredients/bread", "clothes/hat"], "answer": "clothes/hat" },
    { "type": "say_it",      "target": "ingredients/bread" },
    { "type": "finale",      "words": ["ingredients/apple", "ingredients/egg", "ingredients/bread"] }
  ]
}
```

### Step types (the app implements these; the AI only chooses and orders them)

| type | What the child does |
|---|---|
| `find_it` | Hears the word (existing recording), taps the right picture among 2–3. |
| `say_it` | Sees the picture, hears the word, presses a big 🎤 and says it. Recording is played back with a fun echo, then saved **on the device only** for the parent (section 5). The step always succeeds once the child makes a sound (volume check only — no speech recognition). |
| `memory_pairs` | Flip cards to match 2–3 pairs of today's words. |
| `count_it` | "How many?" — taps the right number (uses counting recordings). |
| `odd_one_out` | Taps the picture that doesn't belong (different category). |
| `color_it` | Taps the right color of an object (uses painting/color recordings). Only when the AI includes a color word. |
| `finale` | Short celebration that completes the theme with all collected items; awards stars/sticker. |

Instructions to the child are **icons, animation and the word's own recording**
— no new narration recordings and no TTS. Theme titles are shown as text for
the parent. Keep a single function `speakLine(text)` in
`src/services/storyVoice.ts` that is silent for now, so an AI voice can be
added later.

## 4. Safety and quality (required)

Because the AI only **chooses word ids and step types**, the output can be fully
checked in code:

1. Strict instructions in every request: ages 3–7, 5–7 steps, at least 2
   `say_it` steps, only the provided word ids and step types, themes must be
   happy and everyday (food, family, play, nature, home, trips, space) — never
   fear, danger, violence, sadness.
2. Code validator `src/services/questValidator.ts`:
   - valid JSON in the shape above; 5–7 steps; last step is `finale`;
   - every word id exists in `FA_TEST_AUDIO` and has art;
   - every step type is known and has its required fields; `answer` is among
     its `words`; `count` is 1–5; distractors differ from the target;
   - every chosen word appears at least once;
   - `theme_id` is in an allowed list `src/data/questThemes.ts` (each with a
     title in Farsi checked by the developer and a background art key).
3. If invalid: ask once more; if still invalid, build a quest with a simple
   built-in generator (no AI) so the child is never stuck.
4. Prepare the quest when the child taps "Play" while showing a short fun
   loading animation (max ~5 s, then fall back to the built-in generator).
5. Privacy: no child data on any server, no name sent to the AI, microphone
   audio never uploaded.

## 5. Parent check (inside the existing parent area, behind the PIN gate)

- **"Today's words"** screen: for each `say_it` word, the picture, the correct
  recording, and the child's recording. Parent taps ✅ "said it well" or
  🔁 "practice again".
- 🔁 words are sent as "needs practice" in tomorrow's quest request; ✅ words
  count as learned.
- Child recordings auto-delete after 7 days; a "delete all recordings" button.
- **Daily note (Muse Spark):** a short, warm summary for the parent from the
  local stats only (words played, words said, words to practice), in English
  and Farsi, with one idea to practice at home (e.g. "At dinner, ask her
  «اینا چند تا تخم‌مرغه؟»"). No recordings or names are sent.

## Build steps

1. `wordLog.ts` tracking hooked into `playFaAudio()`, plus the word catalog
   (id → category, art, recording) for vocabulary words that have art.
2. Step-type components: `find_it`, `say_it` (with local echo + save), then
   `memory_pairs`, `count_it`, `odd_one_out`, `color_it`, `finale`.
3. Quest generation: prompt, `askMeta()` call, validator, retry, built-in
   generator fallback. Works offline and when Supabase is not configured.
4. Quest screens: word picker → steps → finale. Add a "My Daily Quest" button to
   the Games screen. Landscape only, every `<Modal>` with
   `supportedOrientations={['landscape']}`, all sizes scaled from a reference.
5. Parent "Today's words" check screen and the daily note.
6. (Later) Muse Image theme art / reward stickers; AI voice in `storyVoice.ts`.
