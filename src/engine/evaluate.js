/**
 * Left-to-right consecutive evaluator (ways-lite).
 * High hit rate design for the free arcade game.
 *
 * Rules:
 * - A win is 3+ identical symbols on consecutive reels starting from reel 0.
 * - Any row on a reel counts.
 * - One payout per symbol per spin (longest run only).
 * - No WILD substitution, no BONUS scatter, no multipliers in v1.
 */
export function evaluateDemo(grid, symbols) {
  const best = new Map(); // symbolId -> longest run

  // Check every possible starting symbol on reel 0
  for (let row = 0; row < 4; row++) {
    const first = grid[0][row];
    if (!first) continue;

    let run = 1;
    for (let reel = 1; reel < 5; reel++) {
      if (grid[reel].some((s) => s.id === first.id)) {
        run++;
      } else {
        break;
      }
    }

    if (run >= 3) {
      const prev = best.get(first.id) || 0;
      if (run > prev) best.set(first.id, run);
    }
  }

  const wins = [...best.entries()].map(([id, count]) => {
    const symbol = symbols.find((s) => s.id === id);
    const base = symbol?.type === "character" ? 12 : 5;
    return {
      symbol,
      count,
      reward: base * (count - 2),
    };
  });

  return wins;
}
