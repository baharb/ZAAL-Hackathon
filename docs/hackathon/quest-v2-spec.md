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

Remove the category screen ("What do you want to play with today?"). Instead
the child answers **five quick picks, one screen each**:

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

### Story (chosen at random each quest — the child does not choose)

Each story has its own background and destination. Start with:

| Story id | Story (shown/narrated simply) | Destination at the end |
|---|---|---|
| `picnic_grandma` | Neli is going to a picnic with Grandma | picnic blanket with Grandma |
| `shopping_home` | Neli goes shopping and drives home | home |
| `park_friends` | Neli drives to the park to play | playground |

Keep stories in a small list (`src/quest/stories.ts`) so more can be added.

### How it plays

- The buddy (default Neli; other buddies from the existing buddy store are
  allowed later) sits **in a small car**. The car drives **right → left**
  (Farsi direction) along a street across the full-screen background, which
  scrolls gently as the car moves.
- Along the street there are **5 mystery boxes with a «؟» on them** — one per
  pick (fruit, ingredient, color, ingredient, food). The car drives to the next
  box and stops.
- **The child taps the box** → it **pops open** (lid flies up, small sparkle,
  gentle sound) → a question appears: **"Which one is «سیب»?"** with
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

- `car.png` — small friendly car, side view, facing left, with an open top or a
  window where the buddy's existing base-pose picture is placed (so any buddy
  can ride).
- `box-closed.png`, `box-open.png` — mystery box with «؟», closed and open.
- Backgrounds per story, e.g. `street-picnic.png`, `street-town.png`,
  `street-park.png` — wide, flat 2D, with a road along the bottom; repeat
  horizontally (mirror every other copy) like the garden background.
- Destinations: reuse `landmarks/picnic.png`; add `destination-home.png`,
  `destination-park.png`, and a `grandma` picture if one exists in the app.
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
