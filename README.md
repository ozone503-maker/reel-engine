# Reel Engine

A reusable, themeable arcade reel-game platform. The first theme is **Fruity Puppy: Kudoken Reels**.

## Current prototype

- 5 reels × 4 visible rows
- 12 configurable symbols (6 characters + 6 botanicals)
- Responsive desktop/mobile layout
- Theme configuration separated from the display
- Local demo spins, demo credits, and placeholder botanical artwork

## Run locally

```bash
npm install
npm run dev
```

## Theme architecture

The first theme configuration currently lives at the top of `src/main.jsx`. The next engineering step is to extract it into a standalone theme module and add separate theme packages/configurations for Kudoken, BroBots, BroBots vs Humans vs Aliens, and FlashTown.

Replace placeholder symbol art by adding an `image` URL/path to a symbol definition. The portrait and botanical cells already support image assets.

## Important prototype boundary

This is a front-end demonstration only. It does **not** issue, transfer, custody, or verify Kudokens. The current random outcomes and reward credits are client-side demo behavior, not a production RNG, audited paytable, wallet, or reward ledger. Real rewards require a server-authoritative outcome and accounting service, anti-abuse controls, transparent promotional rules, and legal review.

## Planned engine modules

- Theme and asset registry
- Configurable reel renderer
- Outcome generation and validation (server-side in production)
- Ways-to-win/paytable evaluator
- Bonus feature framework
- Spin eligibility and daily/earned spin service
- Reward ledger and jackpot accounting
- Player identity, history, and leaderboard
