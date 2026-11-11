/**
 * Left-to-right consecutive + free spin scatters.
 * High hit rate. WILD substitutes. Free spins are scatters (anywhere).
 */

const PAYTABLE = {
  ipo: { 3: 15, 4: 40, 5: 100 },
  ruch: { 3: 12, 4: 30, 5: 80 },
  erv: { 3: 12, 4: 30, 5: 80 },
  nonna: { 3: 12, 4: 30, 5: 80 },
  fonk: { 3: 12, 4: 30, 5: 80 },
  dinny: { 3: 12, 4: 30, 5: 80 },
  lilikoi: { 3: 6, 4: 15, 5: 40 },
  papaya: { 3: 5, 4: 12, 5: 30 },
  "cranberry-hibiscus": { 3: 5, 4: 12, 5: 30 },
  "ice-cream-bean": { 3: 4, 4: 10, 5: 25 },
  spearmint: { 3: 4, 4: 10, 5: 25 },
  "aloe-vera": { 3: 4, 4: 10, 5: 25 },
  kdu: { 3: 8, 4: 20, 5: 50 },
};

export function evaluateDemo(grid, symbols) {
  const best = new Map();

  function matches(cell, targetId) {
    if (!cell) return false;
    if (cell.role === "WILD" || cell.type === "wild") return true;
    return cell.id === targetId;
  }

  // Left-to-right consecutive
  for (let row = 0; row < 4; row++) {
    const first = grid[0][row];
    if (!first || first.role === "WILD" || first.type === "wild" || first.type === "scatter") continue;

    let run = 1;
    for (let reel = 1; reel < 5; reel++) {
      if (grid[reel].some((s) => matches(s, first.id))) run++;
      else break;
    }
    if (run >= 3) {
      const prev = best.get(first.id) || 0;
      if (run > prev) best.set(first.id, run);
    }
  }

  const wins = [...best.entries()].map(([id, count]) => {
    const symbol = symbols.find((s) => s.id === id);
    const pay = PAYTABLE[id] || { 3: 5, 4: 12, 5: 30 };
    return { symbol, count, reward: pay[count] || pay[3] };
  });

  // Free spin scatters (anywhere)
  let freeSpinCount = 0;
  for (const reel of grid) {
    for (const cell of reel) {
      if (cell?.role === "FREESPIN" || cell?.type === "scatter") freeSpinCount++;
    }
  }
  const freeSpinsAwarded = freeSpinCount >= 5 ? 12 : freeSpinCount >= 4 ? 8 : freeSpinCount >= 3 ? 5 : 0;

  return { wins, freeSpinsAwarded };
}
