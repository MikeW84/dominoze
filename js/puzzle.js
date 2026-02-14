export class Puzzle {
  constructor(board, regions, dominoes, solution) {
    this.board = board;
    this.regions = regions;       // Array of Region
    this.dominoes = dominoes;     // Array of Domino (the set for this puzzle)
    this.solution = solution;     // Array of {cellA, cellB, pipA, pipB, dominoId}
    this.difficulty = null;
  }

  // Place a domino on the board
  placeDomino(domino, cellAPos, cellBPos) {
    const cellA = this.board.getCell(cellAPos.row, cellAPos.col);
    const cellB = this.board.getCell(cellBPos.row, cellBPos.col);
    if (!cellA || !cellB) return false;
    if (!cellA.active || !cellB.active) return false;
    if (cellA.dominoId !== null || cellB.dominoId !== null) return false;

    // Determine which pip goes where based on anchor position
    const pipA = domino.getPipAt(0);
    const pipB = domino.getPipAt(1);

    cellA.dominoId = domino.id;
    cellA.pipValue = pipA;
    cellB.dominoId = domino.id;
    cellB.pipValue = pipB;

    domino.place(cellAPos, cellBPos);
    return true;
  }

  // Remove a domino from the board
  removeDomino(domino) {
    if (!domino.placed) return;

    const cellA = this.board.getCell(domino.cellA.row, domino.cellA.col);
    const cellB = this.board.getCell(domino.cellB.row, domino.cellB.col);

    if (cellA) cellA.clear();
    if (cellB) cellB.clear();

    domino.unplace();
  }

  // Check if all dominoes placed and all constraints satisfied
  isSolved() {
    if (!this.dominoes.every(d => d.placed)) return false;

    for (const region of this.regions) {
      const result = region.validate(this.board);
      if (!result.valid || !result.complete) return false;
    }
    return true;
  }

  // Get all current constraint violations (regions with invalid state)
  getViolations() {
    const violations = [];
    for (const region of this.regions) {
      const result = region.validate(this.board);
      if (!result.valid) {
        violations.push({
          regionId: region.id,
          cellKeys: [...region.cellKeys],
        });
      }
    }
    return violations;
  }
}
