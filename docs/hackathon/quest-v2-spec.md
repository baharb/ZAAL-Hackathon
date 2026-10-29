# My Daily Quest — version 2 (replaces the category picker and the quest map)

Build this following `AGENTS.md` and `CLAUDE.md`. Explain the plan in simple
English and wait for the developer's OK before changing files. Reuse the
existing `src/quest/` code where it fits (word catalog, word log, levels,
buddy store, sounds); remove what this version no longer uses.

## 1. Rules for every screen

- **Everything fits on one screen.** No scrolling unless truly necessary, on a
  short landscape phone (360–440 pt tall) and on tablets. Scale all sizes from
  a reference size (see CLAUDE.md), never fixed pixels.
- **Small title.** The «بازی امروز من» / "My Daily Quest" title is half its
  current size and sits in a thin bar at the top.
- **Close button (✕) on every step**, the same as other ZAAL screens (use the
  existing `TopBar` with `showClose`, and `topBarHeight()` for layout). Closing
  returns to Home; nothing breaks if the child leaves halfway.
- **Full-screen game:** below the thin title bar, the game background fills the
  whole rest of the screen (no frames, no white cards around the game).

## 2. Part 1 — "Which one do you like?" (the child's picks)

**Step 0 — pick your buddy.** The quest starts with the existing buddy picker
(Neli, Aidin, Mila, Lila, Dara, Robo Boombo): big pictures, tap one, it
bounces and the quest goes straight on (no "next" button), same layout rules
as above. Remember the choice for next time, with a small "change buddy"
button on later visits.

Remove the category screen ("What do you want to play with today?"). After the
buddy, the child answers **five quick picks, one screen each**:

1. **Fruit** 🍎
2. **Ingredient** 🥚
3. **Color** 🎨 — each option is a **circle filled with that color**
4. **Ingredient** again — **different** ingredients from step 2 (none of the 3
   options shown in step 2 may appear again)
5. **Food (dish)** 🍲

For each pick screen:

- Show **3 random options** from words that already exist in the app **with
  both a picture and a recording** (colors need only the recording; the circle
  is drawn in code). Different every time; never repeat an option within the
  same quest.
- When the screen opens, **the app says the 3 options once, from right to
  left** (existing recordings via `playFaAudio`, one after the other, no
  overlap — follow the audio rules in CLAUDE.md).
- **No "next" button.** Tapping an option: it bounces, the app says its name,
  and the next pick screen opens automatically (~0.6 s later).
- Options are pictures **without background boxes or white cards** behind them.
- Split the current catalog so Fruit and Ingredient are separate lists: fruits
  (apple, orange, grape, lemon, banana, strawberry, …) vs. other ingredients
  (egg, bread, cheese, rice, onion, tomato, …). Cucumber may count as either; put
  it in Fruit only if the developer confirms. Dishes come from
  `cooking/name/*`, colors from `painting/color/*`.

## 3. Part 2 — Game 1: «سفر نلی» (Neli's Drive)

A short driving adventure built from the five picks.

### Story

**For now there is only one story: `picnic_grandma`** — "Neli is going to a
picnic with Grandma". Use the existing garden background
(`assets/neli-world/quest/garden-background.png`, repeated and mirrored like
before) and draw the road in code along the bottom of the screen: a **soft cream road**
(around `#F6E7C8`, slightly darker cream edges around `#EAD3A8`, a few faint
white dashes in the middle), flat 2D, no grey asphalt. Background pictures never
contain a road themselves. The destination is `landmarks/picnic.png` (add a Grandma picture next to
it if the app already has one). The other landmarks in `quest/landmarks/`
(apple tree, bridge, sunflowers, windmill, mushroom pond) can stand along the
road as scenery between the boxes.

Still keep stories in a small list (`src/quest/stories.ts`) with one entry, so
more stories and backgrounds (shopping then home, the park, …) can be added
later without changing the game code.

### How it plays

- The chosen buddy drives **a small car**: use `assets/neli-world/quest/car-<buddyId>.png`
  (e.g. `car-neli.png` — the character is already drawn inside, transparent
  background, facing left). If a buddy has no car picture yet, use
  `car-neli.png`'s car with the buddy's existing base-pose picture placed in the
  window, or fall back to `car-neli.png`. The car drives **right → left**
  (Farsi direction) along a street across the full-screen background, which
  scrolls gently as the car moves.
- Along the street there are **5 mystery boxes with a «؟» on them** — one per
  pick (fruit, ingredient, color, ingredient, food). The car drives to the next
  box and stops.
- **The child taps the box** → it **wiggles and pops open** (lid up, sparkles,
  gentle "pop" sound) → a question appears: **"Which one is «سیب»?"** with
  **3 options**: the child's own pick for that box plus 2 others from the same
  list. There is no recording of the question itself, so play only the word
  (e.g. «سیب») and show a friendly pointing-hand / "?" icon.
- Options float over the scene **without backgrounds or white boxes**.
- **Right answer:** the item flies into the car (it stays visible in the car /
  on the roof rack), the app says the word again, the car drives on to the next
  box.
- **Wrong answer:** the wrong option gently shakes and fades, the word plays
  again, the child tries again; after 2 wrong tries the right option softly
  glows. **Do not send the child back to the start** (ZAAL's rule: no losing,
  no game over — small children give up when they lose progress).
- **Finale:** the car arrives at the destination (picnic with Grandma / home /
  park). All 5 collected items come out of the car and appear together (e.g. on
  the picnic blanket), the app says each word once more, the buddy celebrates,
  and "See you tomorrow! 🌙".

### Art (files in `assets/neli-world/quest/`, transparent PNGs)

- `car-<buddyId>.png` — the buddy sitting in the red car, side view, facing
  left (`car-neli.png` exists; others are added one by one).
- `box-closed.png` and `box-open.png` — purple gift box with a yellow bow,
  closed, and open (lid tilted up, empty inside). Neither has a symbol: the app
  draws a big **«؟»** in a soft white circle badge on the front of the closed
  box, so it is always crisp. When tapped: the closed box wiggles, swaps to
  `box-open.png` with a small "pop" and 8–12 sparkles/stars flying up out of it
  (~0.6 s); then the question and its 3 options rise out of the open box, and
  the box fades away.
- Background: the existing `garden-background.png` for now (more later).
- Destination: `landmarks/picnic.png`.
- If a picture is missing, draw a simple placeholder in code so the game still
  runs.

### Motion and feel

- Calm: one thing moves at a time, ease-in-out. The car drives ~1.5 s between
  boxes with a small up-down bounce; wheels can rotate.
- Every interactive element is big (≥ 64 pt on a phone), with an accessibility
  label.
- Keep the existing "say it to pack it" recordings and parent check only if the
  developer asks; they are not part of Game 1.

## 4. More games later

Design `DailyQuestScreen` so Part 2 can be **one of several games** that all use
the five picks (e.g. a cooking game, a dress-up trip, a memory game). Game 1 is
Neli's Drive; others will be added later. Later, Muse Spark will choose the
story and game each day (see `daily-quest-spec.md` for the AI and safety rules).

## 5. Meta AI inside the game (build after Neli's Drive works end to end)

The child's game stays exactly as above. These additions put Meta's models
inside the experience without making it harder for the child.

### 5a. ✨ "Today's picnic" picture — Muse Image (build first)

- As soon as the child finishes the five picks, start creating a **new
  illustration of this child's picnic** in the background while they drive:
  Neli (or the chosen buddy) and Grandma on a blue checkered picnic blanket in
  a soft garden, with exactly the five picked things (e.g. an apple, an egg,
  something red, cheese, a bowl of آش رشته) on the blanket. Soft pastel flat
  2D children's-book style matching ZAAL. No text in the picture.
- The prompt is **built only from the English names of the picked word ids**
  (from the app's own catalog) and a fixed style template — never free text
  from the child, no names, no personal data.
- New Supabase Edge Function `meta-image` (same pattern as `meta-ai`: key in
  the `MODEL_API_KEY` secret, never in the app). Model `muse-image-1.0`
  (standard tier). Check the exact endpoint and request fields in Meta's docs
  or the **Get code** button on the dev.meta.ai Image page.
- At the finale, after the items appear on the blanket, show the new picture
  with a gentle reveal ("Your picnic! ✨"). Save it **on the device only** in a
  small "My picnics" album the child can reopen (newest first, keep the last
  30).
- **If the picture isn't ready or fails** (offline, slow, error), the finale
  works exactly as before without it — never make the child wait more than a
  couple of seconds.

### 5b. 🧠 Muse Spark as the trip director (hidden from the child)

- Before the drive, send Muse Spark (via `askMeta()`) the five picked word ids,
  the allowed word lists, the child's level, and up to 5 words the child got
  wrong before (from `wordLog.ts`). Ask for **JSON only**: the order of the five
  boxes and, for each box, the 2 wrong options.
- **Validate in code:** every id exists in the catalog and in the right list
  (fruit wrong options are fruits, etc.), wrong options differ from the answer
  and from each other, all five picks appear once. If anything is wrong, ask
  once more, then fall back to the built-in random choice. The child never
  waits more than ~3 seconds (show the car "getting ready").
- Prefer wrong options that the child has confused before, so practice targets
  real mistakes.

### 5c. 📝 Note for parents — Muse Spark

- In the parent area (behind the existing PIN gate), show a short daily note
  written by Muse Spark from **local stats only** (words picked, first-try
  right/wrong, words confused): 2–3 warm sentences in English and Farsi plus one
  idea to practice at home (e.g. "At dinner, ask her the color of the cheese").
- No names, recordings or pictures are sent — only word ids and counts.

## 6. My Family + Yalda Night (next feature, after the finale polish)

Goal: connect the game to family and culture — the Persian family words diaspora
children lose (عمو / عمه / دایی / خاله have no English equivalents) and the
first upcoming celebration, **شب یلدا** (Yalda Night, December 21).

### 6a. The family cast (premade, shared by every child)

- Six family members in the **same style as the existing Grandma**
  (`assets/neli-world/characters/Grandma/grandma_standing.webp`):
  مامان‌بزرگ (existing Grandma), بابابزرگ, عمو, عمه, دایی, خاله. Pictures go in
  `assets/neli-world/characters/Family/<id>.png` with ids `mamanbozorg`,
  `bababozorg`, `amoo`, `ammeh`, `daei`, `khaleh` (transparent background,
  standing, facing the viewer, waving pose if possible). Until a picture exists,
  show the Grandma picture with the role word underneath.
- Voices: `assets/audio/fa-test/family/<id>.wav` (generated from
  `scripts/family-yalda-voices.csv`).
- **"My family" setup** (once, changeable later from a small button): the child
  (or parent) taps which family members they have — big pictures, each tap
  plays the word. Saved on the device only. No names, no photos of real people.
- **Personal touch (Muse Image, optional, after 6a works):** the child picks a
  favorite color for each family member; Muse Image recolors that member's
  clothes (edit of the premade picture via the `meta-image` Edge Function),
  saved on the device; fall back to the premade picture if offline or failed.

### 6b. Who do we visit today?

- New first question of the quest, before the five picks: «امروز بریم پیش کی؟»
  (recorded: `family/who-visit`) with the child's family members as options
  (each tap plays the role word). The chosen relative replaces Grandma as the
  host at the destination and in the finale/photo.

### 6c. Yalda Night story (`yalda_night`)

- Add a second entry to `stories.ts`: **شب یلدا at the chosen relative's house**.
  The drive happens at **evening/night** (darken and tint the garden background
  toward dusk blue in code, a moon and a few stars), the destination is the
  relative's house with a warm lit window.
- Picks for Yalda: the fruit pick uses **Yalda fruits** (watermelon, pomegranate,
  plus other fruits with art + voice); one ingredient pick becomes **nuts**
  (walnut, almonds — `nuts/*`). Colors and dish stay.
- Finale (Yalda): instead of a picnic blanket, a **sofreh** (cloth) in the
  chosen color with a big **watermelon slice and pomegranate** always present,
  the fruit bowl, the nuts (آجیل) and the dish; the relative says
  «سلام عزیزم! خوش اومدی!» on arrival and «یلدات مبارک!» at the end
  (recorded: `yalda/khosh-oomadi`, `yalda/mobarak`). Optional: a small Hafez
  book on the sofreh with «بیا با هم فال حافظ بگیریم!».
- From now until December 21, the quest picks the Yalda story by default;
  otherwise it chooses at random between the picnic and Yalda.

### 6d. New words

Fruits with art but no voice before (watermelon, pomegranate, strawberry,
cherries, grapes, pear, peach, apricot, kiwi, fig, plum, mango, pineapple) and
nuts (walnut, almonds) get voices from `scripts/family-yalda-voices.csv`
(folders `fruits/`, `nuts/`). Add them to the fruit/nut pick lists once the
`.wav` files exist and `faTestAudio.generated.ts` is regenerated.
