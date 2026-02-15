export class SplitPuzzle {
  constructor(boards, regions, dominoes, solutions) {
    this.boards = boards;       // [Board, Board]
    this.regions = regions;     // [Region[], Region[]]
    this.dominoes = dominoes;   // Shared Domino[] array
    this.solutions = solutions; // [solution[], solution[]]
    this.difficulty = null;

    // Track which board each domino is placed on
    this._dominoBoard = new Map(); // dominoId -> boardIndex
  }

  getBoard(boardIndex) {
    return this.boards[boardIndex];
  }

  getRegions(boardIndex) {
    return this.regions[boardIndex];
  }

  placeDomino(domino, boardIndex, cellAPos, cellBPos) {
    const board = this.boards[boardIndex];
    const cellA = board.getCell(cellAPos.row, cellAPos.col);
    const cellB = board.getCell(cellBPos.row, cellBPos.col);
    if (!cellA || !cellB) return false;
    if (!cellA.active || !cellB.active) return false;
    if (cellA.dominoId !== null || cellB.dominoId !== null) return false;

    const pipA = domino.getPipAt(0);
    const pipB = domino.getPipAt(1);

    cellA.dominoId = domino.id;
    cellA.pipValue = pipA;
    cellB.dominoId = domino.id;
    cellB.pipValue = pipB;

    domino.place(cellAPos, cellBPos);
    this._dominoBoard.set(domino.id, boardIndex);
    return true;
  }

  removeDomino(domino) {
    if (!domino.placed) return;

    const boardIndex = this._dominoBoard.get(domino.id);
    if (boardIndex === undefined) return;

    const board = this.boards[boardIndex];
    const cellA = board.getCell(domino.cellA.row, domino.cellA.col);
    const cellB = board.getCell(domino.cellB.row, domino.cellB.col);

    if (cellA) cellA.clear();
    if (cellB) cellB.clear();

    domino.unplace();
    this._dominoBoard.delete(domino.id);
  }

  getBoardIndexForDomino(domino) {
    return this._dominoBoard.get(domino.id);
  }

  isSolved() {
    if (!this.dominoes.every(d => d.placed)) return false;

    for (let bi = 0; bi < this.boards.length; bi++) {
      for (const region of this.regions[bi]) {
        const result = region.validate(this.boards[bi]);
        if (!result.valid || !result.complete) return false;
      }
    }
    return true;
  }

  getViolations(boardIndex) {
    const violations = [];
    for (const region of this.regions[boardIndex]) {
      const result = region.validate(this.boards[boardIndex]);
      if (!result.valid) {
        violations.push({
          regionId: region.id,
          cellKeys: [...region.cellKeys],
        });
      }
    }
    return violations;
  }

  getAllViolations() {
    return [
      ...this.getViolations(0),
      ...this.getViolations(1),
    ];
  }
}
