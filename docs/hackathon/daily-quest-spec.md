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

## 2. The child picks what to play with today

Start simple, using words that **already exist in the app** (art + recording):

1. **Pick a category.** Big picture buttons: Animals, Fruits, Vegetables,
   Food & ingredients, Clothes, Colors, Numbers, Letters. Only show a category
   if it has at least 4 words with both art (`assets/neli-world/...`) and a
   recording (`FA_TEST_AUDIO`). Zaal asks (icon + animation): "What do you want
   to play with today?"
2. **Pick favourites.** Show 6–8 items of that category: "Which ones do you like
   most today?" The child taps 2–4 of them (the number depends on the level,
   see section 4). **Every tap plays the word's recording** and the picture
   bounces.
3. Optionally mix in 1–2 words the child met earlier today or that need
   practice (from `wordLog.ts`) — the AI decides, within the level rules.

Build a word catalog `src/data/questWords.ts` from existing data: id, category,
Farsi text, art, recording key, and the **first letter id** (matching the
alphabet ids used by the tracing screens, e.g. گربه → `gaf`).

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

| type | What the child does | From level |
|---|---|---|
| `find_it` | Hears the word (existing recording), taps the right picture. | 1 |
| `say_it` | Sees the picture, hears the word, presses a big 🎤 and says it. Played back with a fun echo, saved **on the device only** for the parent (section 6). Always succeeds once the child makes a sound (volume check only — no speech recognition). | 1 |
| `memory_pairs` | Flip cards to match pairs of the chosen words. | 2 |
| `count_it` | "How many?" — taps the right number (uses counting recordings). | 2 |
| `first_letter` | Sees the picture (e.g. cat 🐱), hears the word, then taps its first letter (گ) among 2–4 letters; the letter name plays. | 3 |
| `trace_letter` | Traces the first letter of the word, reusing the existing tracing component (`src/components/farsi/FarsiLetterTracer.tsx`). | 3 |
| `odd_one_out` | Taps the picture that doesn't belong (different category). | 3 |
| `color_it` | Taps the right color of an object (uses painting/color recordings). | 3 |
| `finale` | Celebration that completes the theme with all chosen items; awards stars/sticker. | 1 |

Instructions to the child are **icons, animation and the word's own recording**
— no new narration recordings and no TTS. Theme titles are shown as text for
the parent. Keep a single function `speakLine(text)` in
`src/services/storyVoice.ts` that is silent for now, so an AI voice can be
added later.

## 3b. Look and feel: a calm quest map (like Lingokids, never busy)

### Pick a buddy
Before the first quest (and any time from a small button), the child picks a
buddy from ZAAL's existing characters: Neli, Aidin 🦉, Mila, Lila, Dara 🦒,
Robo Boombo. Use their existing pose art in `src/assets/characterAssets.ts`
(base, waving, walking, jumping, thinking, celebration). The chosen buddy is
saved locally and is the hero of every quest. Tapping a buddy plays a short
happy bounce; no extra recordings needed.

### The quest map
Each quest is one screen: a **soft path across a themed world** with 5–7 round
stops (one per step) and a goal at the end.

- **Layers, like a real 2D side-scroller** (all flat 2D, no 3D):
  1. **Background layer:** one wide sky-and-hills picture per world (e.g.
     `assets/neli-world/quest/garden-background.png`, made with Meta's Muse
     Image). Repeat it horizontally, **mirroring every other copy** so the
     joins are seamless, for as long as the path needs.
  2. **Path layer, drawn in code** (react-native-svg): a flat, soft sandy path
     running **right → left** (Farsi reading direction) across the lower part
     of the screen, with gentle rounded ends. Stops are flat circles on the
     path, spaced about one screen-width apart so there is room between them.
  3. **Landmark layer:** separate cut-out pictures with transparent background
     (apple tree, wooden bridge, sunflowers, windmill, mushroom pond, picnic
     goal — files in `assets/neli-world/quest/landmarks/`). One landmark sits
     between each pair of stops, standing on the grass behind the path, so
     every part of the journey shows something new. The finale goal landmark
     sits at the left end. Muse Spark chooses which landmarks appear and in
     which order (from the list available for that world).
- **The map scrolls horizontally.** The screen shows the current stop and a bit
  of the next one. After a step, the camera slides gently (~1 s) to follow the
  buddy to the next stop. The child can also drag to look back at done stops,
  but cannot skip ahead.
- If a world's background or landmarks are missing, fall back to a soft flat
  gradient sky with simple flat hills drawn in code, so the game always works.
- The buddy stands on the current stop (base pose). Tapping the glowing stop
  opens that step's mini-game as a large rounded card over the map.
- After a step: the collected item (e.g. the apple picture) floats gently into
  a **backpack bar** at the top; the stop turns into a ⭐; the buddy walks
  (walking pose, ~1 s slide) to the next stop.
- The goal at the end matches the theme (picnic blanket, wardrobe, rocket,
  paint easel, letter castle). At the finale the buddy switches to the
  celebration pose and all collected items appear together on the goal.
- A quest takes about **5–8 minutes**. After the finale: "See you tomorrow! 🌙"
  with a small preview of tomorrow's world. No endless next-next-next.

### What changes every day (chosen by Muse Spark, within the level rules)
- the **world/theme** (from the allowed list in `questThemes.ts`, each with a
  background and goal art), the order and type of steps, which words go where,
  the distractor pictures, and how the steps connect to the goal.
- The **structure stays familiar** (same map, same buddy, same controls), so
  the child always knows what to do. Only the content is new.

### Calm, child-professional design rules (must follow)
- **One thing moves at a time.** Gentle ease-in-out motion, 300–600 ms; no
  shaking, flashing, fast spinning or confetti storms. Small celebrations
  (sparkle on the item, buddy jump) — one big celebration only at the finale.
- **Large touch targets** (scaled from a reference size, roughly ≥ 64 pt on a
  phone), at least 16 pt between choices. Nothing important in the corners.
- **Soft, limited palette** matching ZAAL's existing theme; high contrast for
  Farsi text and pictures; Vazirmatn font.
- **No timers, no lives, no "game over", no losing stars.** Wrong answer → the
  wrong card gently fades, the buddy shows the thinking pose, the word plays
  again; after 2 tries the right card softly glows.
- **Sound:** gentle effects, never loud; respects the app's existing audio
  rules (one output at a time, see CLAUDE.md). A mute button for parents.
- **No ads, no purchases, no external links, no streak pressure** inside the
  quest. Parent features stay behind the existing PIN gate.
- Respect accessibility: every interactive element has an accessibility label;
  colors are never the only cue (except in `color_it`, which also plays the
  color word).

## 4. Levels: harder only when the child is ready

Difficulty is **not fixed by age**. Age only picks the starting level
(age 3–4 → level 1, 5–6 → level 2, 7+ → level 3). After that the child moves
by how they play. Store the level locally per child.

| Level | Words picked | Steps | Choices per question | Step types allowed |
|---|---|---|---|---|
| 1 | 2 | 4 | 2 | find_it, say_it, finale |
| 2 | 3 | 5 | 2–3 | + memory_pairs (2 pairs), count_it (1–3) |
| 3 | 3 | 6 | 3 | + first_letter, trace_letter, odd_one_out, color_it |
| 4 | 4 | 7 | 3–4 | all; memory 3 pairs, count 1–5 |
| 5 | 4 | 7 | 4 | all; first_letter with similar-looking letters (ب پ ت ث) |

**Moving between levels:**

- **Level up:** two quests in a row with ≥ 80% of answers right on the first
  try (say_it doesn't count). Celebrate it ("Level 3! 🌟").
- **Stay:** anything in between — the next quest stays at this level, and the
  AI repeats the words and step types the child got wrong.
- **Stuck:** two quests in a row under 50% first-try → the next quest is an
  easier version of the **same level** (fewer choices, more find_it/say_it).
  Never show a "level down" to the child.

The level rules are sent to Muse Spark with every request, and the validator
rejects any quest that breaks them.

## 5. Safety and quality (required)

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
   - step count, choices and step types match the child's level (section 4);
   - `first_letter`/`trace_letter` use the word's real first letter from the
     catalog;
   - `theme_id` is in an allowed list `src/data/questThemes.ts` (each with a
     title in Farsi checked by the developer and a background art key).
3. If invalid: ask once more; if still invalid, build a quest with a simple
   built-in generator (no AI) so the child is never stuck.
4. Prepare the quest when the child taps "Play" while showing a short fun
   loading animation (max ~5 s, then fall back to the built-in generator).
5. Privacy: no child data on any server, no name sent to the AI, microphone
   audio never uploaded.

## 6. Parent check (inside the existing parent area, behind the PIN gate)

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

1. Word catalog `questWords.ts` (only words with art + recording, with first
   letter), `wordLog.ts` tracking hooked into `playFaAudio()`, and the level
   store with the level-up rules.
2. Buddy picker, quest map (path, stops, backpack bar, buddy walking), category
   picker and favourites picker, then step components: `find_it`,
   `say_it` (local echo + save), `finale` — enough for level 1 end to end.
   Then `memory_pairs`, `count_it`, `first_letter`, `trace_letter`,
   `odd_one_out`, `color_it`.
3. Quest generation (with the level rules): prompt, `askMeta()` call, validator, retry, built-in
   generator fallback. Works offline and when Supabase is not configured.
4. Quest flow: category → favourites → steps → finale → level-up celebration.
   **Where it starts:** add «بازی امروز من» / "My Daily Quest" as the **first
   big card on the Home screen** (`BIG_CARDS` in `src/screens/HomeScreen.tsx`,
   before Games, Cooking, Painting, Alphabet), with a gentle "new today ✨"
   badge until today's quest is played. Make sure the five big cards still fit
   on a landscape phone (the card size is computed from the available width and
   height — keep that working, don't hard-code sizes). Also add it as a card on
   the Games screen. Add a new route name `DailyQuest` in the app's navigator
   (`App.tsx` / `NavContext`), following how existing games are registered. Landscape only, every `<Modal>` with
   `supportedOrientations={['landscape']}`, all sizes scaled from a reference.
5. Parent "Today's words" check screen and the daily note.
6. (Later) Muse Image theme art / reward stickers; AI voice in `storyVoice.ts`.
