import { DIFFICULTY, SPLIT_BOARD_SHAPES, generateFullDominoSet } from './constants.js';
import { Domino } from './domino.js';
import { SplitPuzzle } from './split-puzzle.js';
import { SplitSolver } from './split-solver.js';
import {
  shuffle, pick, randomInRange,
  findTiling, createRegions, assignConstraints, tightenConstraints,
  createBoardFromShape,
} from './generator.js';

function assignDominoesForSplit(tilingA, tilingB) {
  const fullSet = generateFullDominoSet();
  const available = fullSet.map(() => true);
  const combined = [...tilingA, ...tilingB];
  const result = [];

  function backtrack(idx) {
    if (idx >= combined.length) return true;
    const order = shuffle([...Array(fullSet.length).keys()]);
    for (const i of order) {
      if (!available[i]) continue;
      available[i] = false;
      result.push({
        cellA: { row: combined[idx].cellA.row, col: combined[idx].cellA.col },
        cellB: { row: combined[idx].cellB.row, col: combined[idx].cellB.col },
        pipA: fullSet[i].pips[0],
        pipB: fullSet[i].pips[1],
        dominoId: fullSet[i].id,
      });
      if (backtrack(idx + 1)) return true;
      result.pop();
      available[i] = true;
    }
    return false;
  }

  return backtrack(0) ? result : null;
}

function tryGenerateSplit(shapeA, shapeB, config, singleCellRatio) {
  const boardA = createBoardFromShape(shapeA);
  const boardB = createBoardFromShape(shapeB);

  const tilingA = findTiling(boardA);
  if (!tilingA) return null;
  const tilingB = findTiling(boardB);
  if (!tilingB) return null;

  const combined = assignDominoesForSplit(tilingA, tilingB);
  if (!combined) return null;

  const countA = tilingA.length;
  const solutionA = combined.slice(0, countA);
  const solutionB = combined.slice(countA);

  // Build solution maps for each board
  const solutionMapA = new Map();
  for (const s of solutionA) {
    solutionMapA.set(`${s.cellA.row},${s.cellA.col}`, s.pipA);
    solutionMapA.set(`${s.cellB.row},${s.cellB.col}`, s.pipB);
  }
  const solutionMapB = new Map();
  for (const s of solutionB) {
    solutionMapB.set(`${s.cellA.row},${s.cellA.col}`, s.pipA);
    solutionMapB.set(`${s.cellB.row},${s.cellB.col}`, s.pipB);
  }

  const minRegions = config.regionCount[0];
  const maxRegionsA = Math.min(config.regionCount[1], boardA.getActiveCells().length);
  const maxRegionsB = Math.min(config.regionCount[1], boardB.getActiveCells().length);

  // Try region configurations
  const maxAttempts = singleCellRatio < 0.2 ? 12 : 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Reset region IDs
    for (const c of boardA.getActiveCells()) c.regionId = null;
    for (const c of boardB.getActiveCells()) c.regionId = null;

    const numRegionsA = randomInRange(
      Math.min(minRegions, maxRegionsA),
      maxRegionsA,
    );
    const numRegionsB = randomInRange(
      Math.min(minRegions, maxRegionsB),
      maxRegionsB,
    );

    const regionsA = createRegions(boardA, numRegionsA, config.maxRegionSize, singleCellRatio);
    const regionsB = createRegions(boardB, numRegionsB, config.maxRegionSize, singleCellRatio);

    assignConstraints(regionsA, solutionMapA, config.constraintTypes);
    assignConstraints(regionsB, solutionMapB, config.constraintTypes);

    // Build domino set for solver
    const dominoSet = combined.map(s => ({
      id: s.dominoId,
      pips: s.dominoId.split('-').map(Number),
    }));

    boardA.clearPlacements();
    boardB.clearPlacements();

    let solver = new SplitSolver(
      [{ board: boardA, regions: regionsA }, { board: boardB, regions: regionsB }],
      dominoSet,
    );
    let sols = solver.solve(2);

    if (sols.length !== 1 && !solver.hitLimit) {
      const changedA = tightenConstraints(regionsA, solutionMapA, config.constraintTypes);
      const changedB = tightenConstraints(regionsB, solutionMapB, config.constraintTypes);
      if (changedA || changedB) {
        boardA.clearPlacements();
        boardB.clearPlacements();
        solver = new SplitSolver(
          [{ board: boardA, regions: regionsA }, { board: boardB, regions: regionsB }],
          dominoSet,
        );
        sols = solver.solve(2);
      }
    }

    if (sols.length === 1) {
      boardA.clearPlacements();
      boardB.clearPlacements();

      const dominoes = combined.map(s => {
        const [a, b] = s.dominoId.split('-').map(Number);
        return new Domino(s.dominoId, a, b);
      });

      const puzzle = new SplitPuzzle(
        [boardA, boardB],
        [regionsA, regionsB],
        dominoes,
        [solutionA, solutionB],
      );
      return puzzle;
    }
  }

  return null;
}

export function generateSplitPuzzle(difficulty, { noRectangles = false } = {}) {
  const config = DIFFICULTY[difficulty];
  const singleCellRatio = difficulty === 'hard' ? 0.15 : 0.3;
  let shapePairs = SPLIT_BOARD_SHAPES[difficulty];
  if (noRectangles) {
    shapePairs = shapePairs.filter(([a, b]) => a.mask !== null && b.mask !== null);
  }

  const MAX_TIME = difficulty === 'hard' ? 15000 : 8000;
  const timePerPair = MAX_TIME / shapePairs.length;

  for (let si = 0; si < shapePairs.length; si++) {
    const pairStart = Date.now();
    const [shapeA, shapeB] = shapePairs[si];

    while (Date.now() - pairStart < timePerPair) {
      const puzzle = tryGenerateSplit(shapeA, shapeB, config, singleCellRatio);
      if (puzzle) {
        puzzle.difficulty = difficulty;
        return puzzle;
      }
    }
  }

  throw new Error(`Failed to generate ${difficulty} split puzzle - try again`);
}
