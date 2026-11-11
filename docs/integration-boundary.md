# Integration Boundary

This document describes **future** interfaces. None of these are implemented in the current milestone.

## Layers

```
Theme (branding, symbols, local rules)
  ↓
Reel Engine (reels, spin UI, demo credits)
  ↓
Shared Identity / Wallet layer (Base wallet, Kudoken balance) — not built
  ↓
Server + Onchain (outcome authority, reward distribution)
```

## Intended injectable contract (future)

The engine will accept these as props or context. They are **not** implemented yet.

```js
// Future — not present in current code
onSpinRequest(): Promise<{
  outcome: Symbol[][],   // 5×4 grid
  spinId: string | null,
  mode: "demo" | "authoritative"
}>

// Future — separate from winning
onRewardClaimed?(payload: {
  spinId: string,
  amount: number,
  symbolIds: string[]
}): void
```

In demo mode the engine generates the outcome locally and updates local demo credits.  
In authoritative mode the server returns the outcome and later confirms any real Kudoken distribution.

## Demo vs real Kudoken

- Demo credits = local React state only.
- Real Kudoken = Base token + server validation. The engine never decides eligibility or holds keys.

## Token information needed later

- Contract address on Base
- Interface (ERC-20 or custom)
- Decimals
- Display symbol/name
- Any reward-specific methods
- Server endpoint that validates a spin and authorizes distribution

The same wallet session and balance are intended to be reusable across Monkey Jockey, Fly Hawaii, BroBots, FlashTown, and other properties.
