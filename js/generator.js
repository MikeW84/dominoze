import { ConstraintType, DIFFICULTY, BOARD_SHAPES, generateFullDominoSet } from './constants.js';
import { Board } from './board.js';
import { Region } from './region.js';
import { Domino } from './domino.js';
import { Puzzle } from './puzzle.js';
import { Solver } from './solver.js';

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function randomInRange(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createBoardFromShape(shape) {
  const board = new Board(shape.rows, shape.cols);
  if (shape.mask) {
    for (let r = 0; r < shape.rows; r++) {
      for (let c = 0; c < shape.cols; c++) {
        if (!shape.mask[r * shape.cols + c]) {
          board.cells[r][c].active = false;
        }
      }
    }
  }
  return board;
}

export function findTiling(board) {
  const activeCells = board.getActiveCells()
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const covered = new Set();
  const tiling = [];

  function backtrack(idx) {
    while (idx < activeCells.length && covered.has(activeCells[idx].key)) idx++;
    if (idx >= activeCells.length) return true;
    const cell = activeCells[idx];
    const neighbors = board.getNeighbors(cell.row, cell.col)
      .filter(n => !covered.has(n.key));
    shuffle(neighbors);
    for (const neighbor of neighbors) {
      covered.add(cell.key);
      covered.add(neighbor.key);
      tiling.push({ cellA: cell, cellB: neighbor });
      if (backtrack(idx + 1)) return true;
      covered.delete(cell.key);
      covered.delete(neighbor.key);
      tiling.pop();
    }
    return false;
  }

  return backtrack(0) ? tiling : null;
}

function assignDominoes(tiling) {
  const fullSet = generateFullDominoSet();
  const available = fullSet.map(() => true);
  const result = [];

  function backtrack(idx) {
    if (idx >= tiling.length) return true;
    const order = shuffle([...Array(fullSet.length).keys()]);
    for (const i of order) {
      if (!available[i]) continue;
      available[i] = false;
      result.push({
        cellA: { row: tiling[idx].cellA.row, col: tiling[idx].cellA.col },
        cellB: { row: tiling[idx].cellB.row, col: tiling[idx].cellB.col },
        pipA: fullSet[i].pips[0], pipB: fullSet[i].pips[1], dominoId: fullSet[i].id,
      });
      if (backtrack(idx + 1)) return true;
      result.pop();
      available[i] = true;
    }
    return false;
  }

  return backtrack(0) ? result : null;
}

// Create regions with a mix of sizes. Key: ensure some single-cell regions for uniqueness.
export function createRegions(board, numRegions, maxRegionSize, singleCellRatio = 0.3) {
  const activeCells = board.getActiveCells();
  const totalCells = activeCells.length;

  // Strategy: mix of sizes. Single-cell regions are the most constraining.
  const targetSingleCell = Math.max(1, Math.floor(numRegions * singleCellRatio));

  // Pick spread seeds
  const seeds = [];
  const usedKeys = new Set();
  const shuffled = shuffle([...activeCells]);

  for (const cell of shuffled) {
    if (seeds.length >= numRegions) break;
    if (usedKeys.has(cell.key)) continue;
    seeds.push(cell);
    usedKeys.add(cell.key);
  }

  // But re-spread them using farthest-first
  const finalSeeds = [seeds[0]];
  const remaining = seeds.slice(1);
  while (finalSeeds.length < numRegions && remaining.length > 0) {
    let bestIdx = 0, bestDist = -1;
    for (let i = 0; i < remaining.length; i++) {
      const minDist = Math.min(...finalSeeds.map(s =>
        Math.abs(s.row - remaining[i].row) + Math.abs(s.col - remaining[i].col)));
      if (minDist > bestDist) { bestDist = minDist; bestIdx = i; }
    }
    finalSeeds.push(remaining.splice(bestIdx, 1)[0]);
  }

  const regions = finalSeeds.map((cell, i) => {
    const region = new Region(i);
    region.addCell(cell.row, cell.col);
    cell.regionId = i;
    return region;
  });

  // Determine which regions stay single-cell
  const singleCellRegions = new Set();
  const singleIndices = shuffle([...Array(regions.length).keys()]).slice(0, targetSingleCell);
  for (const idx of singleIndices) singleCellRegions.add(idx);

  // Grow non-single regions
  for (let iter = 0; iter < totalCells * 3; iter++) {
    if (activeCells.every(c => c.regionId !== null)) break;

    let progress = false;
    for (let ri = 0; ri < regions.length; ri++) {
      if (singleCellRegions.has(ri)) continue;
      if (regions[ri].size >= maxRegionSize) continue;

      const frontier = [];
      const seen = new Set();
      for (const key of regions[ri].cellKeys) {
        const [r, c] = key.split(',').map(Number);
        for (const n of board.getNeighbors(r, c)) {
          if (n.regionId === null && !seen.has(n.key)) {
            seen.add(n.key);
            frontier.push(n);
          }
        }
      }
      if (frontier.length === 0) continue;

      const p = frontier[Math.floor(Math.random() * frontier.length)];
      regions[ri].addCell(p.row, p.col);
      p.regionId = ri;
      progress = true;
    }
    if (!progress) break;
  }

  // Assign any remaining cells to adjacent regions (including single-cell ones if needed)
  for (const cell of activeCells) {
    if (cell.regionId !== null) continue;
    const neighbor = board.getNeighbors(cell.row, cell.col).find(n => n.regionId !== null);
    if (neighbor) {
      regions[neighbor.regionId].addCell(cell.row, cell.col);
      cell.regionId = neighbor.regionId;
    }
  }

  return regions;
}

export function assignConstraints(regions, solutionMap, allowedTypes) {
  for (const region of regions) {
    const values = [...region.cellKeys].map(key => solutionMap.get(key));

    // Single-cell regions: ALWAYS use SUM (pins exact value) for maximum constraint
    if (values.length === 1 && allowedTypes.includes(ConstraintType.SUM)) {
      region.constraintType = ConstraintType.SUM;
      region.target = values[0];
      continue;
    }

    const feasible = [];

    if (allowedTypes.includes(ConstraintType.SUM)) {
      const sum = values.reduce((a, b) => a + b, 0);
      feasible.push({ type: ConstraintType.SUM, target: sum, weight: 6 });
    }

    if (allowedTypes.includes(ConstraintType.EQUAL) && values.length >= 2 && new Set(values).size === 1) {
      feasible.push({ type: ConstraintType.EQUAL, target: null, weight: 8 });
    }

    if (allowedTypes.includes(ConstraintType.NOT_EQUAL) && values.length >= 2 && new Set(values).size === values.length) {
      feasible.push({ type: ConstraintType.NOT_EQUAL, target: null, weight: 5 });
    }

    if (allowedTypes.includes(ConstraintType.LESS_THAN)) {
      const maxVal = Math.max(...values);
      if (maxVal < 6) {
        feasible.push({ type: ConstraintType.LESS_THAN, target: maxVal + 1, weight: 4 });
      }
    }

    if (allowedTypes.includes(ConstraintType.GREATER)) {
      const minVal = Math.min(...values);
      if (minVal > 0) {
        feasible.push({ type: ConstraintType.GREATER, target: minVal - 1, weight: 4 });
      }
    }

    // Only add NONE with low weight if other options exist
    if (allowedTypes.includes(ConstraintType.NONE) && feasible.length > 0) {
      feasible.push({ type: ConstraintType.NONE, target: null, weight: 0.5 });
    }

    if (feasible.length === 0) {
      region.constraintType = ConstraintType.NONE;
      region.target = null;
      continue;
    }

    const totalWeight = feasible.reduce((s, f) => s + f.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen = feasible[feasible.length - 1];
    for (const f of feasible) {
      roll -= f.weight;
      if (roll <= 0) { chosen = f; break; }
    }

    region.constraintType = chosen.type;
    region.target = chosen.target;
  }
}

export function tightenConstraints(regions, solutionMap, allowedTypes) {
  let changed = false;
  for (const region of regions) {
    if (region.constraintType !== ConstraintType.NONE) continue;
    const values = [...region.cellKeys].map(key => solutionMap.get(key));

    if (allowedTypes.includes(ConstraintType.SUM)) {
      region.constraintType = ConstraintType.SUM;
      region.target = values.reduce((a, b) => a + b, 0);
      changed = true;
    }
  }
  return changed;
}

function tryGenerateWithShape(shape, config, singleCellRatio) {
  const board = createBoardFromShape(shape);

  const tiling = findTiling(board);
  if (!tiling) return null;

  const solution = assignDominoes(tiling);
  if (!solution) return null;

  const solutionMap = new Map();
  for (const s of solution) {
    solutionMap.set(`${s.cellA.row},${s.cellA.col}`, s.pipA);
    solutionMap.set(`${s.cellB.row},${s.cellB.col}`, s.pipB);
  }

  const minRegions = config.regionCount[0];
  const maxRegions = Math.min(config.regionCount[1], board.getActiveCells().length);

  for (let numRegions = minRegions; numRegions <= maxRegions; numRegions++) {
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const c of board.getActiveCells()) c.regionId = null;

      const regions = createRegions(board, numRegions, config.maxRegionSize, singleCellRatio);
      assignConstraints(regions, solutionMap, config.constraintTypes);

      const dominoSet = solution.map(s => ({
        id: s.dominoId,
        pips: s.dominoId.split('-').map(Number),
      }));

      board.clearPlacements();
      let solver = new Solver(board, regions, dominoSet);
      let sols = solver.solve(2);

      if (sols.length !== 1 && !solver.hitLimit) {
        tightenConstraints(regions, solutionMap, config.constraintTypes);
        board.clearPlacements();
        solver = new Solver(board, regions, dominoSet);
        sols = solver.solve(2);
      }

      if (sols.length === 1) {
        board.clearPlacements();
        const dominoes = solution.map(s => {
          const [a, b] = s.dominoId.split('-').map(Number);
          return new Domino(s.dominoId, a, b);
        });
        return new Puzzle(board, regions, dominoes, solution);
      }
    }
  }

  return null;
}

export function generatePuzzle(difficulty, { noRectangles = false } = {}) {
  const config = DIFFICULTY[difficulty];
  const singleCellRatio = difficulty === 'hard' ? 0.5 : 0.3;
  let shapes = BOARD_SHAPES[difficulty];
  if (noRectangles) {
    shapes = shapes.filter(s => s.mask !== null);
  }

  if (difficulty === 'hard') {
    // Hard: try shapes in order (largest first), with time budget per shape
    const MAX_TIME = 8000;
    const timePerShape = MAX_TIME / shapes.length;

    for (let si = 0; si < shapes.length; si++) {
      const shapeStart = Date.now();

      while (Date.now() - shapeStart < timePerShape) {
        const puzzle = tryGenerateWithShape(shapes[si], config, singleCellRatio);
        if (puzzle) {
          puzzle.difficulty = difficulty;
          return puzzle;
        }
      }
    }
  } else {
    // Easy/medium: random shape selection, quick retries
    for (let retry = 0; retry < 200; retry++) {
      const puzzle = tryGenerateWithShape(pick(shapes), config, singleCellRatio);
      if (puzzle) {
        puzzle.difficulty = difficulty;
        return puzzle;
      }
    }
  }

  throw new Error(`Failed to generate ${difficulty} puzzle - try again`);
}
