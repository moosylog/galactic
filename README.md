# Galactic Keystroke

A Galaga-style typing shooter for keyboard enthusiasts. Letters fly in as words, you shoot them by typing, and the game quietly finds the key transitions (bigrams) you are slow or sloppy at and drills them. It knows your real keyboard: Go60, Glove80, Corne, Voyager, a standard 60%, or your own MoErgo/ZMK layout.

**Play:** https://moosylog.github.io/galactic

---

## Contents
1. [Quick start](#quick-start)
2. [How to play](#how-to-play)
3. [Reading the screen](#reading-the-screen)
4. [The keyboard panel](#the-keyboard-panel)
5. [Waves, bosses and bonuses](#waves-bosses-and-bonuses)
6. [Health and score](#health-and-score)
7. [Difficulty levels](#difficulty-levels)
8. [Settings](#settings)
9. [Controls](#controls)
10. [Training and progress](#training-and-progress)
11. [Words](#words)
12. [Tips for beginners](#tips-for-beginners)
13. [Questions and troubleshooting](#questions-and-troubleshooting)
14. [Your data](#your-data)
15. [For developers](#for-developers)
16. [Credits and licence](#credits-and-licence)

---

## Quick start
1. Pick your **Hardware** and **Logical Layout** (or upload a custom layout, see [Settings](#settings)).
2. Pick a **Difficulty**. If you are new, choose **Academy**.
3. Start the game. Words fly in. **Type the first letter of a word, then finish it in order.**
4. Keep your **health** above zero. Press **Esc** to pause.

---

## How to play

1. **Words arrive as letters.** Each word flies in as a group of letters and settles into a row near the top. Every word in a wave starts with a different letter.
2. **Choose a word** by typing its first letter. The word helper, one fixed row just above the keyboard line, shows every word in the same order all the time, with first letters in green.
3. **Finish it in order.** Once you have started a word you are *locked on*: only its next letter counts. The locked word is shown large with your progress.
4. **A wrong key is a mistake**, not a switch. It breaks your combo and lowers your accuracy, but you keep your word and can carry on.
5. **Letters that reach the danger line cost you health.** After a short grace period the letters of a word dive together, swooping toward the line above the keyboard. Finish the word before they land.
6. **Clear all words** to start the next wave. Every 5th wave is a boss.

You can only start a word from its first letter, and you cannot jump between words in the middle. That is what makes the game train real typing and not just letter spotting.

---

## Reading the screen

| Part | What it shows |
|---|---|
| **Status bar** | Score, wave/sector, combo, words per minute, accuracy, **HEALTH** and the **EMP** charge bar. |
| **HEALTH** | Starts at 100%. Shown as ship icons (one per 20%) plus the percentage. Reaching 0 ends the run. |
| **EMP bar** | Fills as you hit letters and earn bonuses. When full it glows and **Enter** detonates it (see [Waves, bosses and bonuses](#waves-bosses-and-bonuses)). |
| **Word helper** | All current words in **one fixed row**, always in the same order (the order they appeared), so a word never jumps to a different place. Each word also keeps its spot after its neighbours are finished, and when a snake splits. Before you start a word, first letters are green. Once locked, your word gets a green box, finished letters fade and the next letter glows, while the other words dim. Golden words are gold. |
| **Danger line** | The horizontal line above the keyboard. A letter that crosses it costs health. |
| **Keyboard panel** | Your real layout. See below. |
| **Pop-up messages** | Short notices such as WAVE, FOCUS, CLEAN, BLAZING, COMBO, BOSS CHARGING, SHIELD READY. |

---

## The keyboard panel

The panel at the bottom of the screen mirrors the layout you chose. Letters dive toward their own key, and your lasers fire from the key you press.

- **Blue keys** are left hand, **pink keys** are right hand. Hands come from the layout itself, not from screen position.
- **A white glow marks the next key to press.**
  - Before you start a word, it marks the first letter of every word.
  - While you are typing a word, it marks that word's next letter.
  - During a boss, it marks the boss's next letter.
  - This teaches finger positions, especially on a custom layout.
- **A yellow dot marks your focus keys:** the keys that belong to your weakest bigrams right now. It shows what the game is currently training.
- **A stronger pink flash** on a key means a diving letter is heading for it.
- **Captured keys disappear** from the panel during a boss rescue and come back when you rescue them.
- **A small legend** in the right corner above the danger line explains the glow and the dot: *WHITE GLOW = NEXT KEY, YELLOW DOT = FOCUS KEY*.

**Keyboard Size** (main screen, remembered between visits):

| Size | Share of screen height | Notes |
|---|---|---|
| Small | 20% | Most room for the playfield. Keys are small. |
| **Compact** | **28%** (default) | A good balance. |
| Large | 40% | The original size. |

A smaller panel gives letters more room to fall, so the game is a little easier. Letters are given less time to reach the line on Large.

---

## Waves, bosses and bonuses

**Normal waves.** One word in waves 1 to 4, two in waves 5 to 8, three from wave 9 (a fourth for players averaging 90+ WPM). Words enter from the sides or top in one of six random patterns (loop, spiral, pincer, snake, arc, figure-eight), settle in their own rows, and later dive in S-curves.

**Focus waves.** Every third wave is themed on one of your weak bigrams. The wave announces it ("FOCUS: TH"), and the words contain that pair. In other waves, about a third of the words also contain your weakest or suspected-weak bigrams.

**Centipede waves** (every 4th wave from wave 2: waves 2, 6, 14, 22, 26 and so on; boss and Challenge waves are never Centipede waves). The usual number of words crawl down the screen as snakes, zig-zagging across and dropping a row at each edge, and they **speed up with every row**, like the arcade game. Type each one from its **head** (the first letter, ringed in yellow).
- **A slip splits the snake.** A wrong key cuts the remaining letters in two: the front part speeds up and the rear part slows down. Each part is now its own shorter word, so you can finish either first.
- **Mushrooms.** Every snake letter you shoot leaves a pink mushroom. They are harvested when the next wave starts for 20 points each.
- A letter that reaches the danger line costs health, as in any other wave.

**Challenge Stage** (waves 3, 8, 13, 18 and so on). Two words at first (wave 3), three from wave 8 and four from wave 13 fly through the screen and leave. Nothing hurts you here: letters that escape cost no health and typos cost nothing. A **perfect clear pays double** the usual perfect-wave bonus.

**Boss waves** (every 5th wave). One long word, up to 8 letters. Type it cleanly to win.
- **A wrong key** lets the boss **capture the two keys** involved (the previous and the current letter). They vanish from your keyboard.
- To rescue them you type **5 practice words** built around that pair. A typo resets the word (small health cost). A word that falls past the line costs health and is replaced by a new one. **EMP is disabled during a rescue.**
- **An idle boss strikes** for 10 health if you stop typing for a while. "BOSS CHARGING" warns you at 70% of the timer.
- Beating a boss moves you to the next sector and restores some health.

**EMP.** Fill the bar, then press **Enter**. It clears every letter on screen (50 points each) and deals 2 damage to a boss. It cannot be used during a rescue.

**Weapon jam.** Three wrong keys within a tenth of a second (key mashing) jam your weapon for half a second.

**Golden word** (from wave 3, not every wave). One word turns gold. Type it with no mistakes for a large bonus and a **shield** that blocks the next letter that would have hurt you.

**Bonus UFO** (from wave 4, occasionally, never in Centipede or Challenge waves). A purple three-letter word glides across the top. It is **optional and never listed in the word helper**. Type its first letter and finish it for +300 and EMP charge. If it escapes, nothing happens.

**Combo milestones.** Every 25 in a row gives EMP charge, and every 50 also restores some health.

---

## Health and score

### Health

| Event | Effect |
|---|---|
| A letter reaches the danger line | −5 (Academy), −8 (Contender), −10 (Apex). Blocked by a shield. None in Challenge Stages. |
| Boss strike (you stopped typing) | −10 |
| Boss rescue: typo | −2 |
| Boss rescue: word falls past the line | −5 |
| A typo in a normal wave | −1 (it can never take you below 1%) |
| Clearing a boss sector | +20 |
| A perfect wave | +5 |
| Every 50 combo | +5 |

### Score

- **Each letter you shoot** = (100 + 10 × your current combo) × the **accuracy multiplier** × the **difficulty multiplier**.
- **Accuracy multiplier** (your last 100 keystrokes): 100% ×2, 98%+ ×1.5, 95%+ ×1, 90%+ ×0.5, below 90% ×0.1.
- **Difficulty multiplier:** Academy ×1, Contender ×2, Apex ×3.
- **Word bonuses:** CLEAN (no mistakes) +10 per letter; BLAZING (clean and well above your usual speed) +25 more per letter; golden word +100 per letter; UFO +300.
- **Boss:** finishing a boss pays 500 × the multipliers.
- **Perfect wave:** 1,000 × the wave number × the difficulty multiplier (doubled in a Challenge Stage).
- **EMP:** 50 points for each letter it clears.
- **Mushrooms** (Centipede waves): 20 points each when harvested at the start of the next wave.

Scores are only comparable within the same difficulty.

---

## Difficulty levels

| Level | Word length | Letters hover before diving | Score | Word pool |
|---|---|---|---|---|
| **Academy** | 3 to 5 | About 7 s | ×1 | Only the most common words, widening wave by wave. Avoids Q, X, Z, J. |
| **Contender** | 4 to 7 | About 4 s | ×2 | Common words, widening faster. |
| **Apex** | 5 to 8 | About 1.5 s | ×3 | A wide pool from the start. |

On every level on **Apex** words get one letter longer every 8 waves (up to two extra, capped at 8), and on every level rarer words are mixed in as waves progress, letters fall faster as you play, and the speed also follows your typing speed.

---

## Settings

All settings are on the main screen. **They cannot be changed mid-run.**

- **Hardware:** MoErgo Go60, MoErgo Glove80, Corne (42-key), ZSA Voyager, Standard ANSI 60%.
- **Logical Layout:** QWERTY, Colemak-DH or Dvorak.
- **Custom layout:** use **Upload MoErgo json** to load a layout exported from the MoErgo/ZMK layout editor. The hardware is detected from the file. A **layer picker** appears so you choose which layer to train (for example your alpha layer). Your layout, all its layers and your chosen layer are remembered in your browser, so you do not need to upload the file again. Only letters on that layer are used for words. The button warns you if the layer does not have the number of keys the hardware expects.
- **Difficulty:** Academy, Contender or Apex.
- **Keyboard Size:** Small, Compact or Large (see above).

---

## Controls

| Input | Action |
|---|---|
| Letter keys | Start a word with its first letter, then type it in order. |
| **Enter** | Detonate EMP when the bar is full. On the end screen: play again. |
| **Esc** | Pause or resume. |
| **PAUSE** button (bottom left) | Same as Esc. |
| **EXIT** button / **EXIT TO MAIN SCREEN** | End the run and return to the main screen. See below. |

**Pause and exit.** Pausing freezes everything, and your WPM and combo timing are not affected. The game also pauses by itself if the tab or window loses focus. **Exiting ends the run with no score and cannot be resumed**, so settings can never be changed mid-run. Your typing statistics are still saved.

---

## Training and progress

**What the game measures.** For every pair of keys you type in sequence, it records how fast you were and how often you slipped. This is stored in your browser and grows over time.

**Where it shows up**
- **Focus keys and focus waves:** your weakest pairs get a yellow dot on the keyboard and show up more often in words.
- **Suspect bigrams:** before you have any history, the game flags same-finger pairs that are common in English on *your* layout, so a new player already gets targeted words.
- **Hand and finger aware:** keys are tagged by hand and finger from the layout. Pairs are classed as same-finger, same-hand, alternating or thumb.
- **Tiers and ranks:** each pair earns **Bronze, Silver or Gold** from accuracy and speed over time. The points add up to a rank: **Cadet, Pilot, Ace, Commander, Admiral**.
- **End screen:** your rank, any pairs that levelled up, your most improved pair, the difficulty, your **top 5 problem keys** as text, and a keyboard heatmap (blue = fast and accurate, pink = slow or error-prone). Press **Enter** to play again.
- **Records:** the main screen keeps your **all-time high** and your **last 10 runs**. Each shows date and time, how long you played, the **difficulty**, the wave, the score and the **top 5 problem keys** of that run. Exited runs are not recorded.

The effect of the game on real typing speed has not been measured. It is built on deliberate-practice ideas: target weaknesses and give immediate feedback.

---

## Words

Words are the most common English words of 3 to 8 letters. The list is fetched once from the public *google-10000-english* list and cached in your browser. Names, places, brands and abbreviations are filtered out, and a smaller built-in word list is used if the download is unavailable. Easier levels start with the most common words and widen as waves progress.

If you meet a word you do not like, add it to `BLOCKED_WORDS` in `js/config.js`.

---

## Tips for beginners
- Start on **Academy**, keep the **Compact** keyboard, and follow the **white glow** to learn where each key is.
- **Accuracy before speed.** The score multiplier rewards clean typing far more than fast typing.
- Look at the **word helper**, pick one word, finish it, then pick the next.
- A typo costs only a little in normal waves. Do not freeze. Keep typing.
- Ignore the purple **UFO** until you are comfortable. It is only a bonus.
- In a **Centipede wave**, a slip splits the snake. Do not panic: finish the front part first, then the rear.
- Use **Pause** to take a breather. Press Esc any time.
- After a run, look at your **problem keys** and let the yellow dots tell you what to practise.

---

## Questions and troubleshooting

**Why are some letters purple?**
That is the optional Bonus UFO. You never have to type it.

**What are the pink mushrooms?**
Letters you shot in a Centipede wave. They are worth 20 points each at the start of the next wave.

**Why did my keys disappear from the keyboard?**
A boss captured them after a mistake. Type the 5 practice words to rescue them.

**Why can't I resume after pressing Exit?**
On purpose: it stops settings from being changed mid-run. Use **Pause** (Esc) to take a break.

**Why does the game pause when I switch tabs?**
So you cannot lose health while away. Resume with Esc or the RESUME button.

**Some letters do not appear in my custom layout.**
Only letters on the chosen layer are used. Pick another layer, or check the layer has the right number of keys.

**The end screen is too tall for my window.**
It scrolls. Making the browser window taller, or zooming out, also helps.

**How do I start over?**
Use **WIPE DATA & RESET CACHE** at the bottom of the main screen. It deletes your records, typing statistics and saved layout settings after a confirmation. Your keyboard size and the cached word list are kept.

---

## Your data
Records, typing statistics, your custom layout and the keyboard size are stored **in your browser** (localStorage). Nothing is sent anywhere. The only network request is the one-time download of the word list. Clearing your browser data removes everything. WIPE DATA removes your records, statistics and saved layout (not the keyboard size or the cached word list).

---

## For developers
- Plain HTML, CSS and JavaScript. No build step.
  - `index.html`, `css/styles.css`
  - `js/config.js` (hardware geometry, difficulty, words, helpers)
  - `js/entities.js` (enemies, boss, lasers)
  - `js/main.js` (game loop, input, interface, records)
- **Tests:** `npm test` runs the smoke, practice and pacing tests.
- **Balance tool:** `node tools/balance-sim.js` runs the real game code headlessly with scripted typists of different skill and prints survival, waves and score. Use it to tune difficulty before changing numbers.
- **Publishing:** the game is a static site. Upload the files to the repository root and enable GitHub Pages on the `main` branch.

---

## Credits and licence
Inspired by the capture-and-rescue mechanic of Galaga (Namco). Not affiliated.

The word list is *google-10000-english*, derived from the Google Web Trillion Word Corpus (Norvig / Kaufman). It is fetched at run time, not included here, and its own licence (educational and personal use) applies to it.

© 2026 Moosy Research. All rights reserved. See `LICENSE`.
