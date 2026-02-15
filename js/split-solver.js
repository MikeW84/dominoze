import { ConstraintType } from './constants.js';

export class SplitSolver {
  constructor(boardConfigs, dominoSet) {
    // boardConfigs: [{board, regions}, {board, regions}]
    this.boardConfigs = boardConfigs;
    this.dominoSet = dominoSet;
    this.solutions = [];
    this.maxSolutions = 1;
    this.callCount = 0;
    this.maxCalls = 300000;

    // Build merged active cell list with board index tagging
    // Use namespaced keys: "boardIndex:row,col"
    this.activeCellList = [];
    for (let bi = 0; bi < boardConfigs.length; bi++) {
      const cells = boardConfigs[bi].board.getActiveCells()
        .sort((a, b) => a.row - b.row || a.col - b.col);
      for (const cell of cells) {
        this.activeCellList.push({
          row: cell.row,
          col: cell.col,
          key: `${bi}:${cell.key}`,
          boardIndex: bi,
        });
      }
    }

    // Pre-compute: which region does each namespaced cell key belong to?
    this._cellRegion = new Map();
    for (let bi = 0; bi < boardConfigs.length; bi++) {
      for (const region of boardConfigs[bi].regions) {
        for (const key of region.cellKeys) {
          this._cellRegion.set(`${bi}:${key}`, region);
        }
      }
    }

    // Pre-parse domino pips
    this._dominoPips = [];
    for (const d of dominoSet) {
      this._dominoPips.push(d.id.split('-').map(Number));
    }
  }

  solve(maxSolutions = 1) {
    this.maxSolutions = maxSolutions;
    this.solutions = [];
    this.callCount = 0;
    this.hitLimit = false;

    const available = new Array(this.dominoSet.length).fill(true);
    const cellValues = new Map(); // namespaced key -> pip value

    this._backtrack(available, cellValues);
    this.hitLimit = this.callCount > this.maxCalls;
    return this.solutions;
  }

  _getFeasibleValues(nsKey, cellValues) {
    const region = this._cellRegion.get(nsKey);
    if (!region) return [0, 1, 2, 3, 4, 5, 6];

    // Extract board index to namespace region cell keys
    const bi = parseInt(nsKey.split(':')[0]);
    const placedValues = [];
    let totalCells = 0;
    for (const key of region.cellKeys) {
      totalCells++;
      const nsRegionKey = `${bi}:${key}`;
      if (cellValues.has(nsRegionKey)) placedValues.push(cellValues.get(nsRegionKey));
    }
    const remaining = totalCells - placedValues.length - 1;

    const all = [0, 1, 2, 3, 4, 5, 6];

    switch (region.constraintType) {
      case ConstraintType.NONE:
        return all;

      case ConstraintType.EQUAL:
        if (placedValues.length > 0) return [placedValues[0]];
        return all;

      case ConstraintType.NOT_EQUAL:
        return all.filter(v => !placedValues.includes(v));

      case ConstraintType.SUM: {
        const currentSum = placedValues.reduce((a, b) => a + b, 0);
        return all.filter(v => {
          const newSum = currentSum + v;
          if (newSum > region.target) return false;
          if (newSum + remaining * 6 < region.target) return false;
          if (remaining === 0 && newSum !== region.target) return false;
          return true;
        });
      }

      case ConstraintType.LESS_THAN:
        return all.filter(v => v < region.target);

      case ConstraintType.GREATER:
        return all.filter(v => v > region.target);

      default:
        return all;
    }
  }

  _backtrack(available, cellValues) {
    if (this.solutions.length >= this.maxSolutions) return;
    if (++this.callCount > this.maxCalls) return;

    const emptyCell = this._findMostConstrainedEmpty(cellValues);
    if (!emptyCell) {
      this.solutions.push(new Map(cellValues));
      return;
    }

    const feasibleA = this._getFeasibleValues(emptyCell.key, cellValues);
    if (feasibleA.length === 0) return;

    const board = this.boardConfigs[emptyCell.boardIndex].board;
    const neighbors = board.getNeighbors(emptyCell.row, emptyCell.col)
      .filter(n => !cellValues.has(`${emptyCell.boardIndex}:${n.key}`));

    for (const neighbor of neighbors) {
      const neighborNsKey = `${emptyCell.boardIndex}:${neighbor.key}`;
      const feasibleB = this._getFeasibleValues(neighborNsKey, cellValues);
      if (feasibleB.length === 0) continue;

      for (let di = 0; di < this.dominoSet.length; di++) {
        if (!available[di]) continue;
        const [pipLow, pipHigh] = this._dominoPips[di];

        const orientations = pipLow === pipHigh
          ? [[pipLow, pipHigh]]
          : [[pipLow, pipHigh], [pipHigh, pipLow]];

        for (const [valA, valB] of orientations) {
          if (!feasibleA.includes(valA) || !feasibleB.includes(valB)) continue;

          cellValues.set(emptyCell.key, valA);
          cellValues.set(neighborNsKey, valB);
          available[di] = false;

          if (!this._hasIsolatedEmpty(cellValues)) {
            this._backtrack(available, cellValues);
          }

          cellValues.delete(emptyCell.key);
          cellValues.delete(neighborNsKey);
          available[di] = true;

          if (this.solutions.length >= this.maxSolutions) return;
          if (this.callCount > this.maxCalls) return;
        }
      }
    }
  }

  _findMostConstrainedEmpty(cellValues) {
    let best = null;
    let bestScore = Infinity;
    for (const cell of this.activeCellList) {
      if (cellValues.has(cell.key)) continue;
      const feasible = this._getFeasibleValues(cell.key, cellValues);
      const board = this.boardConfigs[cell.boardIndex].board;
      const emptyNeighbors = board.getNeighbors(cell.row, cell.col)
        .filter(n => !cellValues.has(`${cell.boardIndex}:${n.key}`)).length;
      if (emptyNeighbors === 0) return cell; // must fail
      const score = feasible.length * emptyNeighbors;
      if (score < bestScore) {
        bestScore = score;
        best = cell;
      }
    }
    return best;
  }

  _hasIsolatedEmpty(cellValues) {
    for (const cell of this.activeCellList) {
      if (cellValues.has(cell.key)) continue;
      const board = this.boardConfigs[cell.boardIndex].board;
      const neighbors = board.getNeighbors(cell.row, cell.col);
      let hasEmpty = false;
      for (const n of neighbors) {
        if (!cellValues.has(`${cell.boardIndex}:${n.key}`)) { hasEmpty = true; break; }
      }
      if (!hasEmpty) return true;
    }
    return false;
  }
}
