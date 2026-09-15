# Nozomi mascot

[Live demo](https://gabeperez.github.io/nozomi-mascot/) · [Repository](https://github.com/gabeperez/nozomi-mascot)

Interactive mascot based on the supplied robot drawing, using [page-mascot](https://koboyo.com/page-mascot).

## Video demo

[![Watch the Nozomi mascot video demo](public/demo/nozomi-mascot-poster.jpg)](https://gabeperez.github.io/nozomi-mascot/demo/nozomi-mascot.mp4)

[Watch the video demo](https://gabeperez.github.io/nozomi-mascot/demo/nozomi-mascot.mp4) · [Try the interactive demo](https://gabeperez.github.io/nozomi-mascot/)

## Run locally

Run `bun install` then `bun run dev`. Production build: `bun run build`.

- `public/mascots/`: aligned WebP atlases ready for React.
- `characters/nozomi/`: original generated transparent PNG sheets, retained for rebuilding.
- `src.tsx`: working React integration and expression gallery.
- `prompts.json`: generation prompts; built-in image generation was used.

Checks: true RGBA transparency; skill verifier reports 0.00 px vertical click shift at 140px, 89.5% overlap, 95.6% palette match, 8.5% width variation. Generated art retains minor outline/width variation. Browser checks cover cursor response, click reaction and mobile overflow.

## Deployment

GitHub Actions builds and deploys the demo to GitHub Pages on every push to `main`. Relative asset paths support the repository subdirectory.
