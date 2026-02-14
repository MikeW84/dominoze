import { ConstraintType } from './constants.js';

export class Solver {
  constructor(board, regions, dominoSet) {
    this.board = board;
    this.regions = regions;
    this.dominoSet = dominoSet;
    this.solutions = [];
    this.maxSolutions = 1;
    this.callCount = 0;
    this.maxCalls = 300000;
    this.activeCellList = board.getActiveCells()
      .sort((a, b) => a.row - b.row || a.col - b.col);

    // Pre-compute: which region does each cell belong to?
    this._cellRegion = new Map();
    for (const region of regions) {
      for (const key of region.cellKeys) {
        this._cellRegion.set(key, region);
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
    const cellValues = new Map();

    this._backtrack(available, cellValues);
    this.hitLimit = this.callCount > this.maxCalls;
    return this.solutions;
  }

  // Get feasible pip values for a cell based on its region constraint and current state
  _getFeasibleValues(cellKey, cellValues) {
    const region = this._cellRegion.get(cellKey);
    if (!region) return [0, 1, 2, 3, 4, 5, 6]; // no region = anything

    // Get already placed values in this region
    const placedValues = [];
    let totalCells = 0;
    for (const key of region.cellKeys) {
      totalCells++;
      if (cellValues.has(key)) placedValues.push(cellValues.get(key));
    }
    const remaining = totalCells - placedValues.length - 1; // -1 for the cell we're about to fill

    const all = [0, 1, 2, 3, 4, 5, 6];

    switch (region.constraintType) {
      case ConstraintType.NONE:
        return all;

      case ConstraintType.EQUAL:
        if (placedValues.length > 0) return [placedValues[0]]; // must match existing
        return all; // first in region, anything goes

      case ConstraintType.NOT_EQUAL:
        return all.filter(v => !placedValues.includes(v));

      case ConstraintType.SUM: {
        const currentSum = placedValues.reduce((a, b) => a + b, 0);
        return all.filter(v => {
          const newSum = currentSum + v;
          // Must not exceed target even with minimum remaining (0 each)
          if (newSum > region.target) return false;
          // Must be reachable with maximum remaining (6 each)
          if (newSum + remaining * 6 < region.target) return false;
          // If this fills the region, must equal target
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

    // Get feasible values for this cell
    const feasibleA = this._getFeasibleValues(emptyCell.key, cellValues);
    if (feasibleA.length === 0) return; // dead end

    const neighbors = this.board.getNeighbors(emptyCell.row, emptyCell.col)
      .filter(n => !cellValues.has(n.key));

    for (const neighbor of neighbors) {
      const feasibleB = this._getFeasibleValues(neighbor.key, cellValues);
      if (feasibleB.length === 0) continue;

      // Only try dominoes whose pip values match feasible sets
      for (let di = 0; di < this.dominoSet.length; di++) {
        if (!available[di]) continue;
        const [pipLow, pipHigh] = this._dominoPips[di];

        const orientations = pipLow === pipHigh
          ? [[pipLow, pipHigh]]
          : [[pipLow, pipHigh], [pipHigh, pipLow]];

        for (const [valA, valB] of orientations) {
          // Quick check: are these values feasible?
          if (!feasibleA.includes(valA) || !feasibleB.includes(valB)) continue;

          cellValues.set(emptyCell.key, valA);
          cellValues.set(neighbor.key, valB);
          available[di] = false;

          if (!this._hasIsolatedEmpty(cellValues)) {
            this._backtrack(available, cellValues);
          }

          cellValues.delete(emptyCell.key);
          cellValues.delete(neighbor.key);
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
      // Score = number of feasible values × number of empty neighbors
      const feasible = this._getFeasibleValues(cell.key, cellValues);
      const emptyNeighbors = this.board.getNeighbors(cell.row, cell.col)
        .filter(n => !cellValues.has(n.key)).length;
      if (emptyNeighbors === 0) return cell; // must fail - return immediately
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
      const neighbors = this.board.getNeighbors(cell.row, cell.col);
      let hasEmpty = false;
      for (const n of neighbors) {
        if (!cellValues.has(n.key)) { hasEmpty = true; break; }
      }
      if (!hasEmpty) return true;
    }
    return false;
  }
}
