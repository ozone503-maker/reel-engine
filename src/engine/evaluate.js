/**
 * Demo-only evaluator.
 * This is NOT a verified 1,024-ways implementation.
 * It is a simple left-to-right consecutive match for prototype display.
 */
export function evaluateDemo(grid, symbols) {
  const counts = new Map();
  for (let startRow = 0; startRow < 4; startRow++) {
    const first = grid[0][startRow];
    let run = 1;
    for (let reel = 1; reel < 5; reel++) {
      if (grid[reel].some((s) => s.id === first.id)) run++;
      else break;
    }
    if (run >= 3) counts.set(first.id, Math.max(counts.get(first.id) || 0, run));
  }
  const wins = [...counts.entries()].map(([id, count]) => {
    const symbol = symbols.find((s) => s.id === id);
    const base = symbol.type === "character" ? 12 : 5;
    return { symbol, count, reward: base * (count - 2) };
  });
  return wins;
}
