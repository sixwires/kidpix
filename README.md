# KidPix

Tiny KidPix-style paint app in plain HTML + p5.js. No build step.

Open `index.html` in a browser.

## Pens

- Pencil – solid line
- 20 wacky brushes ported from kmpix (`brushes.js`): Leaky Pen, Dots, Rainbow Dots,
  Bubbly, Pies, Echoes, Connect The Dots, Swirl, Rotating Dots, Rotating Pentagon,
  Rose, Splatter, Triangles, Raindrops, Rainbow Bar, Rainbow Doughnut, Rainbow Ball,
  Spray, Icy, Dumbbell
- Animated stamp – one button per GIF in `assets/`
- Fill – paint bucket, flood-fills the clicked region
- Eraser

The square row above the canvas picks the size for every pen. Pick a color from
the swatches. Undo reverts the last stroke. Clear wipes the canvas. Save keeps the
drawing in this browser (restored on reload). Export downloads a PNG.

## Adding GIF stamps

Put GIFs/PNGs in `assets/` and list them in `GIFS` at the top of `sketch.js`.

## Files

- `index.html` – layout and buttons
- `sketch.js` – tools and p5 sketch
- `brushes.js` – brush renderers + `BRUSHES` button table
- `p5.min.js` – vendored p5.js 1.9.4

## Deploy

Linked to Vercel (team binkhaus, project `kidpix`). Needs `vercel login` once.

```sh
npm run vercel:build   # pull settings + build to .vercel/output
npm run deploy         # build + preview deploy
npm run deploy:prod    # build + production deploy
```
