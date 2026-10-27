# «قصه‌ی من» — My Story Adventure (hackathon feature spec)

Build this for ZAAL following `AGENTS.md` and `CLAUDE.md`. Explain your plan in
simple English and wait for the developer's OK before changing files. Build in
the small steps listed at the end, and list every changed file after each step.

## Goal

A child aged 3–7 **playing alone** picks a few things they like, and Meta's AI
turns them into a short, personal Farsi adventure game. The child answers by
tapping, says words out loud, and ends with their own illustrated storybook.
Parents can trust every story because it passes several safety layers.

## Child flow

1. **Pick 3 cards** from a library of everyday things (cat, apple, ball, cup,
   shoe, moon, …). Use existing art in the project where possible.
2. **Story is ready instantly** — it was prepared in advance (see "Story queue").
3. **4–5 scenes.** Each scene shows the Farsi text large and clear (Vazirmatn,
   right-to-left) with a picture, then a question with 2–3 answer cards.
   - Right answer → celebration, next scene.
   - Wrong answer → gentle hint, try again. The child never fails.
4. **"Say it!" step** after a right answer: big 🎤 button. Only check that the
   child made a sound (volume level) — no speech recognition. Play the voice
   back with a fun echo effect, then continue. The recording **never leaves the
   phone** and is deleted right after playback.
5. **The end:** celebration; the story is saved locally so the child can replay it.

## Personalisation

Each request to the AI includes: the child's first name (optional, parent can
turn off), age, the 3 picked cards, and up to 5 words the child found hard
before (stored locally). The story uses the hard words again for practice.

## Voice

`src/services/storyVoice.ts` exports `speakStoryLine(text: string)`. For now it
does nothing (silent). **Do not use recorded clips for stories.** Every scene
must call it, so an AI text-to-speech service can be plugged in later by
changing only this file.

## How the AI is called

- Only through `askMeta()` in `src/services/metaAI.ts` → Supabase Edge Function
  `meta-ai` → Meta Model API (`muse-spark-1.3`). Never call Meta from the app
  directly; never put a key in the app.
- Ask for **JSON only**, in this shape:

```json
{
  "title_spoken": "…", "title_written": "…",
  "scenes": [
    {
      "text_spoken": "…",           // spoken/colloquial Farsi (محاوره)
      "text_written": "…",          // written Farsi (کتابی)
      "question_spoken": "…",
      "choices": ["card_id", "card_id"],
      "answer": "card_id",
      "say_it": "card_id"
    }
  ]
}
```

## Safety layers (all required)

1. **Strict instructions** in every request: ages 3–6; sentences of at most
   7 words; 4–5 scenes; warm, happy, spoken home Farsi; allowed topics only
   (animals, food, family, play, nature, home, bedtime); never fear, violence,
   sadness, danger, strangers, brands or real people.
2. **Verified word list** `src/data/storyWords.ts`: for each card, `id`, the
   English name, the **spoken** form and the **written** form, checked by a
   native speaker (e.g. «لیوان» stays «لیوان» in speech — not «لیوون»).
   The AI must use these exact forms; the app also replaces card words with the
   verified forms after generation. Start with ~30 everyday words and mark the
   file clearly so the developer can review every entry.
3. **Automatic checks in code** before a story is accepted:
   - valid JSON in the shape above, 4–5 scenes;
   - Persian letters only (no Latin; no Arabic-only letters ي ك ة);
   - every sentence ≤ 7 words;
   - every `choices`/`answer`/`say_it` id exists in the word list, and `answer`
     is one of `choices`;
   - all 3 picked cards appear;
   - no word from a blocklist `src/data/storyBlocklist.ts`.
4. **AI reviewer pass:** a second `askMeta()` call asks Muse Spark to act as a
   kind Farsi kindergarten teacher, check the story for safety, simplicity and
   natural spoken Farsi, fix mistakes, and return the same JSON. Run the
   automatic checks again on the reviewed version.
5. **Retry and fallback:** if a story fails, try once more; if it fails again,
   use one of 5 built-in backup stories (hand-written, in
   `src/data/backupStories.ts`) so the child is never stuck.
6. **Story queue:** keep 2–3 checked stories ready on the device (generated when
   the app opens and the device is online), so the child never waits and never
   sees an unchecked story.
7. **Parent controls** (inside the existing parent area behind the PIN gate):
   - "Approve stories before my child plays" — off by default;
   - story history (read every story the child played);
   - "Report this story" — removes it and adds its id to a local blocklist;
   - settings: story length (short/normal), show written form too (on/off),
     use child's name (on/off).
8. **Privacy:** no child data stored on any server; nothing logged that contains
   the child's name; microphone audio never uploaded.

## Build steps

1. Word list + blocklist + backup stories + story JSON types + the automatic
   checker (with a few unit-style test cases in a small script).
2. Story generation: prompt, `askMeta()` call, reviewer pass, retry/fallback,
   story queue. Works with backup stories when offline or when Supabase is not
   configured.
3. Screens: card picker → scenes → "say it" echo step → the end. Add a button
   for the game on the Games screen. Landscape only, every `<Modal>` with
   `supportedOrientations={['landscape']}`, all sizes scaled from a reference.
4. Parent controls and story history.
5. (Later) Muse Image illustrations for the storybook; AI voice in `storyVoice.ts`.
