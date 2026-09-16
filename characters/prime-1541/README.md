# Prime Machin #1541 — first companion interpretation

Original: `0x396a29857be19beb3131e23d90b059d180bf938ea35d6c4ad19114e58deaced5` on Sui mainnet.
Resolved through the collection's frozen Registry and its u16→ID table, not marketplace numbering. `source.json` records the read; `provenance.json` records the eight SHA-256-verified image chunks. `original.avif` is the base85-decoded on-chain artwork; `original.png` is a lossless viewing conversion.

`avatar.png` and `full-body.png` are AI-assisted companion interpretations generated with the built-in imagegen tool from that original. Preserve pink casing, racing stripe, kitsune mask, red tassels, golden bells, ice-cream headwear and white hoodie. Full body adds pink mechanical hands, plum trousers and ivory/pink sneakers. These additions are not official collection models. The final assets use an ivory background; transparent exports are not ready.

Public viewing does not prove ownership. No holder signature has been supplied for #1541 during development. The server checks fresh original ownership before issuing a short-lived challenge and again after verifying the holder's signature. Minting is closed until a source-bound testnet flow is implemented; these assets are previews, not minted companions.

## Reproduce source retrieval

Run `bun scripts/resolve-prime.ts 1541`, then `bun scripts/fetch-prime-art.ts 1541`. Decode the resulting concatenated data with RFC1924/Python b85decode. Hash checks are over UTF-8 encoded chunk strings, matching the collection's Move implementation.

## Collection rollout

The canonical registry contains 3,333 objects. Resolve each ID from that registry, recover and verify its artwork, then prepare a matching avatar/body pair. Cache by original object ID plus image ID and asset revision; do not substitute a generic design. Share reviewed body families where traits allow, while retaining each NFT's distinctive headwear, mask, screen, skin and clothing. Render and review on demand before a collection-wide batch. Ownership must be freshly checked before any creation/update; a prior signature must not survive transfer as permanent authorization.

An original mainnet NFT cannot be atomically checked by a testnet Move contract. A future testnet mint needs a bounded server attestation and a contract record containing the original network, object ID, image ID and asset manifest. Face ID/passkey access requires explicit delegation from the current holding wallet; a new passkey address alone is never ownership proof.
