# Reel Engine

A reusable, themeable arcade reel-game platform.

The first theme is **Fruity Puppy: Kudoken Reels**.

## Current status

- Extracted engine (`src/engine/`) + first theme (`src/themes/fruity-puppy.js`)
- 5 reels × 4 rows visual prototype
- Demo-only evaluator (not a verified ways implementation)
- Local demo credits and spins
- Image support ready on symbols (assets not yet wired)

## Run locally

```bash
npm install
npm run dev
```

## Architecture

- Engine is theme-agnostic.
- Themes are plain objects under `src/themes/`.
- Future Base / Kudoken wallet integration is documented in `docs/integration-boundary.md` and is **not** implemented.

## Important prototype boundary

This is a front-end demonstration only. It does **not** issue, transfer, or verify real Kudokens. Demo credits are local. Real rewards require server-authoritative outcomes and onchain distribution.

## Next practical steps

1. Wire the 12 approved symbol images into the Fruity Puppy theme.
2. Add a second theme once the first is stable.
3. Implement the documented spin-request boundary when a server exists.
