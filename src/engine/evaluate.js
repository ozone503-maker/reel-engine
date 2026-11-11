export export const PAYTABLE = {
/**
 * Horizontal rows only.
 * A win is 3, 4, or 5 identical symbols in a straight row (same row, left to right).
 * WILD substitutes. Free spins are scatters (anywhere).
 */

export const PAYTABLE = {
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
  jar: { 3: 50, 4: 200, 5: 0 },
};

export function evaluateDemo(grid, symbols) {
  const wins = [];

  function matches(cell, targetId) {
    if (!cell) return false;
    if (cell.role === "WILD" || cell.type === "wild") return true;
    return cell.id === targetId;
  }

  // Check each of the 4 horizontal rows
  for (let row = 0; row < 4; row++) {
    const first = grid[0][row];
    if (!first || first.role === "WILD" || first.type === "wild" || first.type === "scatter") continue;

    let run = 1;
    for (let reel = 1; reel < 5; reel++) {
      if (matches(grid[reel][row], first.id)) run++;
      else break;
    }

    if (run >= 3) {
      const symbol = symbols.find((s) => s.id === first.id);
      const pay = PAYTABLE[first.id] || { 3: 5, 4: 12, 5: 30 };
      wins.push({
        symbol,
        count: run,
        reward: pay[run] || pay[3],
        row,
      });
    }
  }

  // Free spin scatters (anywhere)
  let freeSpinCount = 0;
  for (const reel of grid) {
    for (const cell of reel) {
      if (cell?.role === "FREESPIN" || cell?.type === "scatter") freeSpinCount++;
    }
  }
  const freeSpinsAwarded = freeSpinCount >= 5 ? 12 : freeSpinCount >= 4 ? 8 : freeSpinCount >= 3 ? 5 : 0;

  const jarWin = wins.find((w) => w.symbol?.id === "jar" && w.count === 5);
  return { wins, freeSpinsAwarded, freeJar: !!jarWin };
}
