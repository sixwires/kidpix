# KidPix

Tiny KidPix-style paint app in plain HTML + p5.js. No build step.

Open `index.html` in a browser.

## Pens

- Pencil – solid 7px line
- Scribble – thin jittery line
- Spray – random dots
- Rainbow – hue cycles along the stroke
- Dots – pulsing circles
- Animated stamp – stamps frames of an animated GIF along the stroke
- Eraser – paints white

The square row above the canvas picks the size for every pen. Pick a color from
the swatches. Undo reverts the last stroke. Clear wipes the canvas. Save keeps the
drawing in this browser (restored on reload). Export downloads a PNG.

## Adding GIF stamps

Put animated GIFs in `gifs/` and list them in `GIFS` at the top of `sketch.js`.
Until then the stamp pen uses a generated smiley.

## Files

- `index.html` – layout and buttons
- `sketch.js` – tools and p5 sketch
- `p5.min.js` – vendored p5.js 1.9.4

## Deploy

Linked to Vercel (team binkhaus, project `kidpix`). Needs `vercel login` once.

```sh
npm run vercel:build   # pull settings + build to .vercel/output
npm run deploy         # build + preview deploy
npm run deploy:prod    # build + production deploy
```
