/**
 * Left-to-right consecutive evaluator (ways-lite).
 * High hit rate. WILD substitutes for any symbol.
 */
export function evaluateDemo(grid, symbols) {
  const best = new Map();

  function matches(cell, targetId) {
    if (!cell) return false;
    if (cell.role === "WILD" || cell.type === "wild") return true;
    return cell.id === targetId;
  }

  for (let row = 0; row < 4; row++) {
    const first = grid[0][row];
    if (!first || first.role === "WILD" || first.type === "wild") continue;

    let run = 1;
    for (let reel = 1; reel < 5; reel++) {
      if (grid[reel].some((s) => matches(s, first.id))) {
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
    const base = symbol?.type === "character" ? 12 : symbol?.type === "token" ? 8 : 5;
    return {
      symbol,
      count,
      reward: base * (count - 2),
    };
  });

  return wins;
}
