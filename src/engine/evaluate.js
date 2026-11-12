/**
 * Horizontal and vertical wins.
 * 3, 4, or 5 identical symbols in a straight row or column.
 * WILD substitutes. Free spins are scatters (4+ anywhere).
 * Jar prize: 3+ jars anywhere.
 * 3+ consecutive WILDs also pay.
 *
 * Cascades: winning symbols are removed, new symbols drop in, multiplier rises.
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
  "wild-storm": { 3: 25, 4: 75, 5: 200 },
};

export function evaluateDemo(grid, symbols) {
  const wins = [];
  const seen = new Set();

  function isWild(cell) {
    return cell && (cell.role === "WILD" || cell.type === "wild");
  }
  function isScatter(cell) {
    return cell && (cell.type === "scatter" || cell.role === "FREESPIN");
  }
  function matches(cell, targetId) {
    if (!cell) return false;
    if (isWild(cell)) return true;
    return cell.id === targetId;
  }

  // Horizontal: check every starting reel so a scatter/wild on the left doesn't hide a run
  for (let row = 0; row < 4; row++) {
    for (let start = 0; start <= 2; start++) {
      const first = grid[start][row];
      if (!first || isWild(first) || isScatter(first)) continue;
      let run = 1;
      for (let reel = start + 1; reel < 5; reel++) {
        if (matches(grid[reel][row], first.id)) run++;
        else break;
      }
      if (run >= 3) {
        const runStart = start;
        start += run - 1; // pay the longest run once, not its 4- and 3-long tails too
        const key = `h-${first.id}-${row}-${runStart}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const symbol = symbols.find((s) => s.id === first.id);
        const pay = PAYTABLE[first.id] || { 3: 5, 4: 12, 5: 30 };
        const positions = [];
        for (let r = 0; r < run; r++) positions.push({ reel: runStart + r, row });
        wins.push({ symbol, count: run, reward: pay[run] || pay[3], direction: "horizontal", positions });
      }
    }
    // Pure wild runs
    let wildRun = 0;
    let wildStart = -1;
    for (let reel = 0; reel < 5; reel++) {
      if (isWild(grid[reel][row])) {
        if (wildRun === 0) wildStart = reel;
        wildRun++;
      } else {
        if (wildRun >= 3) {
          const symbol = symbols.find((s) => s.type === "wild");
          const pay = PAYTABLE[symbol?.id] || { 3: 25, 4: 75, 5: 200 };
          const positions = [];
          for (let r = 0; r < wildRun; r++) positions.push({ reel: wildStart + r, row });
          wins.push({ symbol, count: wildRun, reward: pay[wildRun] || pay[3], direction: "horizontal", positions });
        }
        wildRun = 0;
      }
    }
    if (wildRun >= 3) {
      const symbol = symbols.find((s) => s.type === "wild");
      const pay = PAYTABLE[symbol?.id] || { 3: 25, 4: 75, 5: 200 };
      const positions = [];
      for (let r = 0; r < wildRun; r++) positions.push({ reel: wildStart + r, row });
      wins.push({ symbol, count: wildRun, reward: pay[wildRun] || pay[3], direction: "horizontal", positions });
    }
  }

  // Vertical
  for (let reel = 0; reel < 5; reel++) {
    for (let start = 0; start <= 1; start++) {
      const first = grid[reel][start];
      if (!first || isWild(first) || isScatter(first)) continue;
      let run = 1;
      for (let row = start + 1; row < 4; row++) {
        if (matches(grid[reel][row], first.id)) run++;
        else break;
      }
      if (run >= 3) {
        const runStart = start;
        start += run - 1;
        const key = `v-${first.id}-${reel}-${runStart}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const symbol = symbols.find((s) => s.id === first.id);
        const pay = PAYTABLE[first.id] || { 3: 5, 4: 12, 5: 30 };
        const positions = [];
        for (let r = 0; r < run; r++) positions.push({ reel, row: runStart + r });
        wins.push({ symbol, count: run, reward: pay[run] || pay[3], direction: "vertical", positions });
      }
    }
    // Pure wild column
    let wildRun = 0;
    let wildStart = -1;
    for (let row = 0; row < 4; row++) {
      if (isWild(grid[reel][row])) {
        if (wildRun === 0) wildStart = row;
        wildRun++;
      } else {
        if (wildRun >= 3) {
          const symbol = symbols.find((s) => s.type === "wild");
          const pay = PAYTABLE[symbol?.id] || { 3: 25, 4: 75, 5: 200 };
          const positions = [];
          for (let r = 0; r < wildRun; r++) positions.push({ reel, row: wildStart + r });
          wins.push({ symbol, count: wildRun, reward: pay[wildRun] || pay[3], direction: "vertical", positions });
        }
        wildRun = 0;
      }
    }
    if (wildRun >= 3) {
      const symbol = symbols.find((s) => s.type === "wild");
      const pay = PAYTABLE[symbol?.id] || { 3: 25, 4: 75, 5: 200 };
      const positions = [];
      for (let r = 0; r < wildRun; r++) positions.push({ reel, row: wildStart + r });
      wins.push({ symbol, count: wildRun, reward: pay[wildRun] || pay[3], direction: "vertical", positions });
    }
  }

  let freeSpinCount = 0;
  for (const reel of grid) {
    for (const cell of reel) {
      if (cell?.role === "FREESPIN" || cell?.type === "scatter") freeSpinCount++;
    }
  }
  const freeSpinsAwarded = freeSpinCount >= 5 ? 10 : freeSpinCount >= 4 ? 6 : 0;
  // Jar prize: 3 or more jars anywhere on the grid
  let jarCount = 0;
  for (const reel of grid) for (const cell of reel) if (cell?.id === "jar") jarCount++;
  return { wins, freeSpinsAwarded, freeJar: jarCount >= 3 };
}

/**
 * Run cascades after an initial evaluation.
 * Removes winning positions, drops new symbols from the top of each reel,
 * re-evaluates, and multiplies the payout of each successive cascade.
 * Returns the sequence of steps plus the final grid and totals.
 */
export function runCascades(initialGrid, symbols, randomSymbol, maxCascades = 5) {
  const steps = [];
  let grid = initialGrid.map((reel) => [...reel]);
  let multiplier = 1;
  let totalPayout = 0;
  let freeSpinsAwarded = 0;
  let freeJar = false;

  for (let i = 0; i < maxCascades; i++) {
    const result = evaluateDemo(grid, symbols);
    const basePayout = result.wins.reduce((sum, w) => sum + w.reward, 0);
    const stepPayout = basePayout * multiplier;

    if (result.freeSpinsAwarded > freeSpinsAwarded) freeSpinsAwarded = result.freeSpinsAwarded;
    if (result.freeJar) freeJar = true;

    steps.push({
      grid: grid.map((reel) => [...reel]),
      wins: result.wins,
      multiplier,
      payout: stepPayout,
    });

    totalPayout += stepPayout;

    if (result.wins.length === 0) break;

    // Collect all winning positions
    const remove = new Set();
    for (const win of result.wins) {
      for (const p of win.positions || []) {
        remove.add(`${p.reel},${p.row}`);
      }
    }

    // Build new grid: remove winning cells, drop remaining down, fill from top
    const newGrid = [];
    for (let reel = 0; reel < 5; reel++) {
      const kept = [];
      for (let row = 3; row >= 0; row--) {
        if (!remove.has(`${reel},${row}`)) {
          kept.push(grid[reel][row]);
        }
      }
      // kept is bottom-to-top; reverse so index 0 is top
      kept.reverse();
      while (kept.length < 4) {
        kept.unshift(randomSymbol());
      }
      newGrid.push(kept.slice(0, 4));
    }
    grid = newGrid;
    multiplier = Math.min(multiplier + 1, 5);
  }

  return {
    steps,
    finalGrid: grid,
    totalPayout,
    freeSpinsAwarded,
    freeJar,
  };
}
