# Galactic Keystroke

A Galaga-style typing shooter that finds your weak key transitions (bigrams) and drills them.
Type the letters of each word to shoot them. Every 5th wave a boss appears: one typo and it
tractor-beams the two keys involved, and you must type 5 practice words to rescue them.

**Play:** https://moosylog.github.io/galactic

## What it does
- **Layout-aware:** pick Go60, Glove80, Corne, Voyager or ANSI 60%, or upload a MoErgo/ZMK layout JSON and choose which layer to train.
- **Bigram stats:** latency and errors are tracked per key pair and saved in your browser (localStorage); nothing leaves your device apart from fetching a word list.
- **Hand and finger aware:** keys are tagged by hand/finger from the layout; the end screen reports same-finger, same-hand, alternating and thumb bigrams. Same-finger bigrams common in English are pre-flagged as suspects.
- **Targeted waves:** about a third of words contain your weakest (or suspect) bigrams.
- **Focus and challenge waves:** every third wave is themed on one of your weak bigrams; wave 3, 8, 13... is a no-damage Challenge Stage where a perfect clear pays double.
- **Feedback:** combo milestones every 25 (EMP charge, hull), BLAZING/CLEAN word bonuses, laser pitch rising with your combo, new background colour each sector, a warning before a boss strikes, and an end-screen readout of your most improved bigram.
- **Boss pressure:** idle bosses strike; typos cost you your keys. Speed scales with wave and your WPM.

## Honest notes
The game is built on deliberate-practice ideas (target weaknesses, immediate feedback). Its effect on real typing speed has not been measured.

Inspired by the capture-and-rescue mechanic of Galaga (Namco). Not affiliated.

© 2026 Moosy Research. All rights reserved. See LICENSE.
