# Inside, Outside — Web Art Piece — Design Spec
**Date:** 2026-07-29
**Status:** Approved
**Project:** Liminal Echoes / Inside, Outside

---

## Purpose

Put the existing "Inside, Outside" visualization (blood glucose data from 2023 mapped to sound and particle-flow visuals) onto kellieenglish.com so it can be submitted as a standalone art piece — e.g. to a gallery. The visualization already exists (built for the physical dome installation, at `~/liquidgold/visualizer/`), but its audio is a ~5.9 hour GarageBand render, far too large to host on the static site. This spec covers building a short (~65s) excerpt from a different, "basic" GarageBand pass (`dusty-synth-glucoses.band`) and wiring the whole thing into the existing site's navigation.

**Out of scope:** `control.html` (the secondary data-readout screen from the physical installation) — stays installation-only, not part of the website. No changes to the underlying sonification/MIDI generation pipeline (`glucose2midi.py` etc.) or to the physical dome installation itself.

---

## Site Structure

```
index.html "liminal echoes" card  →  art.html  →  inside-outside.html (details/intro page)
                                                          → inside-outside/index.html (full-bleed piece)
```

- **`index.html`**: the existing "liminal echoes" art card (`#art` section) currently only links to Instagram. Add a link to `art.html`.
- **`art.html`**: the existing "liminal echoes" card currently only links to Instagram. Add a link/button to the new `inside-outside.html` page.
- **`inside-outside.html`** *(new)*: a normal site page, same header/nav/footer chrome as `art.html`/`circus.html`. Content: title "Inside, Outside", a short artist statement, and a single link/button into the piece ("Enter the piece →" → `./inside-outside/index.html`), plus a back-link to `art.html`.
- **`inside-outside/`** *(new folder)*: the immersive piece itself — adapted from `~/liquidgold/visualizer/`, no site chrome (full-bleed black canvas), so it has one clean standalone URL suitable for a gallery submission link.

---

## The Excerpt

The existing visualizer's `sketch.js` maps audio playback position proportionally across the full glucose dataset: `idx = floor(audio.currentTime / audio.duration * glucoseData.length)`. This mapping is linear throughout the whole piece (confirmed via `glucose2midi.py`: 1 minute of music per day of data, all 101,976 five-minute CGM readings used, no per-section tempo changes) — so slicing both the audio and the data to the same relative segments preserves sync without any code changes to `sketch.js`.

The web excerpt is a ~65-second montage built from three non-adjacent segments of the source recording (`~/liquidgold/dusty-synth-glucoses-7-28-2026.mp3`, the "basic" GarageBand pass, 21256.908s / 510MB total):

| Segment | Source timestamp | Length | Data indices | Content |
|---|---|---|---|---|
| 1. Baseline | 3h05m21.2s – 3h05m36.2s | ~15s | 53352–53424 | Stable, ~108 mg/dL, low variance |
| 2. Low event | 3h55m28.7s – 3h55m43.5s | ~15s | 67780–67851 | Dips to 35 mg/dL |
| 3. High event | 5h22m43.1s – 5h23m17.9s | ~35s | 92891–93058 | Rises to/holds 425 mg/dL |

Timestamps were computed from the known-linear index↔time mapping (`index / 101976 * 21256.908` seconds); the low/high index ranges were reused from pre-existing "extreme event" markers (`~/liquidgold/tidal/low_event.json`, `high_event.json`) created for the earlier Tidal version of this piece.

**Audio build:** cut the three segments from the source mp3 with `ffmpeg`, concatenate in order with a 0.3-second crossfade (`acrossfade`) at each of the two splice points, export as `inside-outside/soundscape.mp3`. Note the crossfades shorten the final excerpt by ~0.6s total (two 0.3s overlaps) relative to the sum of the three segment lengths — the corresponding `glucose.json` data array is not shortened to match (216 readings stays exact), since a sub-second proportional drift is inaudible/invisible in this abstract visualization.

**Data build:** construct a new `inside-outside/glucose.json` containing exactly `readings[53352:53424] + readings[67780:67851] + readings[92891:93058]` (216 total readings), in the same `{"readings": [...]}` shape as the source `glucose.json` so `sketch.js` needs no changes.

---

## `inside-outside.html` (details/intro page)

- Same header/nav/footer as other site pages (`art.html` pattern).
- Title: "Inside, Outside"
- Artist statement: **written by Kellie, not drafted by the implementer.** Leave a clearly marked placeholder (e.g. an HTML comment `<!-- ARTIST STATEMENT: ask Kellie for final text -->` plus a short visible placeholder paragraph) in the implementation — do not invent statement copy.
- One link/button: "Enter the piece →" → `./inside-outside/index.html`
- A back-link to `art.html`

---

## `inside-outside/index.html` (the immersive piece)

Copied and adapted from `~/liquidgold/visualizer/index.html` + `sketch.js` (sketch.js unchanged):

- Same full-bleed black canvas, play button, and particle-flow visual as the existing installation version.
- `<audio>` src points to the new `soundscape.mp3` excerpt (not the original 5.9-hour file).
- `glucose.json` fetch points to the new 216-reading excerpt file (not the full-year file).
- New: a small, subtle credit line — "Inside, Outside — Kellie English" — low-opacity, positioned in a corner. **Stays visible for the entire piece — no fade-out.**
- `control.html` and its `BroadcastChannel` companion behavior are not copied over — this page is self-contained.

---

## File Layout

```
personalwebsite/
  index.html          (modified)
  art.html             (modified)
  inside-outside.html  (new)
  inside-outside/
    index.html         (new, adapted from liquidgold/visualizer/index.html)
    sketch.js           (copied as-is from liquidgold/visualizer/sketch.js)
    glucose.json         (new, 216-reading montage)
    soundscape.mp3       (new, ~65s ffmpeg-built excerpt)
```

---

## Testing

- No automated test suite for this static site (established convention — same as the rest of `personalwebsite`).
- Manual verification: open `inside-outside/index.html` locally in a browser, confirm playback starts on tapping play, particle visuals respond distinctly across the three segments (calm → agitated/low-stress-color → high-stress-color), audio and visual finish together, and the credit line remains visible throughout (no fade-out).
- Confirm navigation end-to-end: `index.html` → `art.html` → `inside-outside.html` → `inside-outside/index.html`, and back-links work.
- Confirm final `soundscape.mp3` file size is reasonable for a static site (~65s at typical mp3 bitrate should be roughly 1-2MB, well within git/GitHub Pages norms) before committing.

---

## Success Criteria

- [ ] `index.html`'s "liminal echoes" card links to `art.html`
- [ ] `art.html`'s "liminal echoes" card links to `inside-outside.html`
- [ ] `inside-outside.html` shows the artist statement placeholder (final text supplied by Kellie separately) and links into the piece
- [ ] `inside-outside/index.html` plays the ~65s excerpt with synced particle visuals, ending with both audio and visual data exhausted together
- [ ] Credit line is visible for the entire piece, no fade-out
- [ ] `soundscape.mp3` excerpt file size confirmed reasonable (not the 510MB source)
- [ ] Full navigation path manually verified in a browser
