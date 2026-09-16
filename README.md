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

## Consumer test studio

[Open the studio](https://gabeperez.github.io/nozomi-mascot/test/).
Connect a Sui wallet, get free test SUI using the in-app faucet link, and claim a practice character. Pick a name and backdrop, then save it for **0.01 test SUI plus gas**. Download an animated GIF, a ZIP with sprites/CSS/JavaScript, or copy a hosted iframe embed. The wallet must hold the character to resume its downloads in the app.

This is a real testnet mint and unlock flow using our own `TestCharacter` collection. It does **not** mint or modify Prime Machin NFTs, verify Prime Machin ownership, or generate fresh AI artwork. The artwork is the shared Nozomi sample. Public static assets are not access-controlled; the payment demonstrates an on-chain unlock, not DRM. Testnet data may reset. Wallet connection and wallet approval are still required; email sign-in and sponsored gas are not implemented.

The studio contract records name, backdrop, and unlock on the character itself; transferring it preserves those fields. Claims are limited to one per address. Names/backdrops are immutable after unlock. The fixed test payment goes to the dedicated development wallet. There is no production pricing or mainnet payment path.

- Contract: `contracts/nozomi-studio/sources/studio.move`
- Deployment and successful live claim/unlock receipts: `deployments/studio-testnet.json`
- Tests: `sui move test --path contracts/nozomi-studio --build-env testnet`
- Development smoke test: `bun scripts/test-studio.ts` (requires the separately stored local test wallet; never put a private key in this repository)
- Frontend validation: `bun run typecheck && bun run build`

The previous generic `nozomi-unlock` package remains a separate prototype for future original-NFT ownership integration.
