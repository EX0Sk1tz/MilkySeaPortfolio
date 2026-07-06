# Image panels — how to adjust them

Every photo on the site sits inside a `.panel` box (in `style.css`). The box
forces the photo into a fixed shape and crops it to fill that shape
(`object-fit: cover`). Three CSS custom properties let you override the
result **per image, directly in the HTML** — you never need to edit
`style.css` to adjust a single photo.

```html
<div class="panel wide" style="--w: 70%">
  <img src="assets/img/example.jpg" style="--focal: 50% 20%">
</div>
```

Note where each variable goes: `--w` and `--ratio` go on the `.panel` div
(they control the box), `--focal` goes on the `<img>` (it controls the crop
inside the box).

## `--focal` — fix a bad crop

Goes on the `<img>` tag. Controls which part of the photo stays visible
when the panel crops it.

```html
<img src="assets/img/example.jpg" style="--focal: 50% 20%">
```

- Two values: `horizontal% vertical%`, measured on the **original photo**.
- `50% 50%` (default) = crop stays centered.
- Lower the vertical number to show more of the **top** of the photo
  (use this when a crop is cutting off a head).
- Raise it to show more of the **bottom**.
- Same idea horizontally: lower the first number to keep more of the
  **left** side, raise it for the **right**.

This only re-aims the crop — it can't show more of the photo than the
panel's shape allows. If the subject still doesn't fit, the panel is the
wrong shape for that photo; use `--ratio` (below) or pick a differently
shaped panel class.

## `--w` — resize a panel

Goes on the `.panel` div. Controls the panel's width as a percentage of
the normal column width, and auto-centers it.

```html
<div class="panel wide" style="--w: 70%">
```

- `100%` (default) — fills the column, same as before.
- Lower than `100%` (e.g. `60%`) — shrinks the panel and centers it, for a
  smaller, quieter image.
- Higher than `100%` (e.g. `115%`) — lets the panel break out wider than
  the column, for emphasis.

Use this to introduce size variance between images on the same page
instead of every panel being identical width.

Note: on its own, `--w` resizes the panel **proportionally** — height
follows width via the panel's aspect-ratio. If you want to change only
the width (keeping height fixed) or only the height (keeping width
fixed), see `--h` below.

## `--h` — set an independent, fixed height

Goes on the `.panel` div. By default a panel has no explicit height — its
height is derived from its width and its aspect-ratio (`--ratio` or the
class default). Setting `--h` overrides that: the panel gets a fixed
height regardless of width, so you can change `--w` and `--h`
independently.

```html
<div class="panel wide" style="--w: 60%; --h: 22rem">
```

- Any CSS length works: `22rem`, `400px`, `60vh`, etc.
- Once `--h` is set, `--ratio` is ignored for that panel (the fixed height
  wins).
- Leave `--h` unset (the default) when you just want proportional
  resizing via `--w`/`--ratio` — that's the simpler, more common case.

## `--ratio` — change a panel's shape

Goes on the `.panel` div. Overrides the aspect-ratio that the panel's
class (`.wide`, `.photo`, `.card`) would normally set.

```html
<div class="panel wide" style="--ratio: 4 / 5">
```

- Format is `width / height`, e.g. `1 / 1` (square), `4 / 5` (tall),
  `21 / 9` (very wide/short).
- Without `--ratio`, each class keeps its usual shape:
  - `.wide` — short and wide (a hero banner shape; wider still on desktop)
  - `.photo` — tall portrait (3:4)
  - `.card` — 4:3

Combine `--ratio` with `--w` for real variety: e.g. a small square accent
photo (`--w: 45%; --ratio: 1 / 1`) next to a full-width hero (`--w: 100%`).

## Combining them

Proportional resize + crop nudge:
```html
<div class="panel wide" style="--w: 65%; --ratio: 4 / 5">
  <img src="assets/img/example.jpg" style="--focal: 50% 15%">
</div>
```

Independent width and height:
```html
<div class="panel wide" style="--w: 65%; --h: 20rem">
  <img src="assets/img/example.jpg" style="--focal: 50% 15%">
</div>
```

This makes one panel smaller and taller than the rest, and pulls its crop
toward the top of the source photo.

## If a photo is actually rotated (not just badly cropped)

`--focal` only re-aims a crop — it can't fix a photo that's genuinely
rotated 90°/180° in the file itself (this happened with `work-1-hero.jpg`,
which was sideways). That has to be fixed in the image file, not CSS:
open it in any photo viewer/editor, rotate it to look correct, and
re-export over the same filename. There's no CSS property that reliably
fixes this — a `transform: rotate()` would also rotate the panel's fixed
box shape, distorting the crop.

## If a photo is missing

Every `<img>` has `onerror="this.remove()"` and a `<span>...placeholder</span>`
sitting behind it. If the file at `src` doesn't exist, the broken `<img>`
removes itself and the uppercase placeholder label shows through instead —
so you can drop in real photos whenever they're ready without breaking the
layout in the meantime.
