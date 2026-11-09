# Galactic Keystroke

A Galaga-style typing shooter that finds your weak key transitions (bigrams) and drills them.
Type the letters of each word to shoot them. Every 5th wave a boss appears: one typo and it
tractor-beams the two keys involved, and you must type 5 practice words to rescue them.

**Play:** https://moosylog.github.io/galactic

## What it does
- **Layout-aware:** pick Go60, Glove80, Corne, Voyager or ANSI 60%, or upload a MoErgo/ZMK layout JSON and choose which layer to train.
- **Bigram stats:** latency and errors are tracked per key pair and saved in your browser (localStorage); nothing leaves your device apart from fetching a word list.
- **Hand and finger aware:** keys are tagged by hand/finger from the layout; the end screen reports same-finger, same-hand, alternating and thumb bigrams. Same-finger bigrams common in English are pre-flagged as suspects.
- **Ordered typing:** start a word with its first letter (every word in a wave starts differently), then type it in order; a wrong key is a mistake but keeps your lock. A word dives as one unit.
- **Progress you can see:** bigrams earn Bronze/Silver/Gold tiers, which add up to a rank (Cadet to Admiral) shown on the end screen with any level-ups. From wave 3 a golden word may appear; type it cleanly for a shield that blocks one missed letter.
- Press Enter on the end screen to play again.
- **Galaga surprises:** six random entrance patterns (loop, spiral, pincer, snake, arc, figure-eight), each word in its own row and shape, a true Challenging Stage where words fly through with no penalty, dives swoop in S-curves, and from wave 2 a Bonus UFO sometimes glides across the top with a short word (+300 and EMP charge; no penalty if it escapes).
- **Pause and exit:** Esc (or the PAUSE button) pauses; the game also pauses when the tab loses focus. EXIT returns to the main screen and forfeits the run, so settings cannot be changed mid-run.
- **Records:** the main screen shows your all-time high and your last 10 runs with date, time, play time, score and the 5 problem keys of each run.
- **Keyboard panel:** choose Small, Compact (default) or Large. A white glow marks the next key to press and a yellow dot marks your current focus keys.
- **Targeted waves:** about a third of words contain your weakest (or suspect) bigrams.
- **Focus and challenge waves:** every third wave is themed on one of your weak bigrams; wave 3, 8, 13... is a no-damage Challenge Stage where a perfect clear pays double.
- **Feedback:** combo milestones every 25 (EMP charge, health), BLAZING/CLEAN word bonuses, laser pitch rising with your combo, new background colour each sector, a warning before a boss strikes, and an end-screen readout of your most improved bigram.
- **Boss pressure:** idle bosses strike; typos cost you your keys. Speed scales with wave and your WPM.

## Honest notes
The game is built on deliberate-practice ideas (target weaknesses, immediate feedback). Its effect on real typing speed has not been measured.

Inspired by the capture-and-rescue mechanic of Galaga (Namco). Not affiliated.

© 2026 Moosy Research. All rights reserved. See LICENSE.

## Words
Words come from the 10,000 most common English words (google-10000-english, derived from the Google Web Trillion Word Corpus; Norvig/Kaufman). The list is fetched once and cached in your browser; it is not bundled here, and its source licence (educational/personal use) applies to it. A smaller original word list is built in as a fallback. Only 3-8 letter words are used. Easier levels draw from the most common words and widen as waves progress; words also get longer every 5 waves.

## Balance tool
`node tools/balance-sim.js` runs the real game code headlessly with scripted typists of different skill and prints survival, waves and score. Use it to tune difficulty before changing numbers.
