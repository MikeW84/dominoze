export class Domino {
  constructor(id, pipA, pipB) {
    this.id = id;
    this.pips = [pipA, pipB]; // canonical [low, high]
    this.orientation = 0; // 0=H normal, 1=V normal, 2=H flipped, 3=V flipped
    this.placed = false;
    this.cellA = null; // {row, col} of first half
    this.cellB = null; // {row, col} of second half
  }

  get isDouble() {
    return this.pips[0] === this.pips[1];
  }

  get isHorizontal() {
    return this.orientation % 2 === 0;
  }

  rotate() {
    if (this.isDouble) {
      // Doubles only have 2 meaningful orientations
      this.orientation = (this.orientation + 1) % 2;
    } else {
      this.orientation = (this.orientation + 1) % 4;
    }
  }

  // Get pip value at position index (0 = anchor cell, 1 = second cell)
  getPipAt(index) {
    if (this.orientation < 2) {
      return index === 0 ? this.pips[0] : this.pips[1];
    } else {
      return index === 0 ? this.pips[1] : this.pips[0];
    }
  }

  // Get the two cells this domino would occupy if anchor is at (row, col)
  getPlacementCells(row, col) {
    if (this.isHorizontal) {
      return [{ row, col }, { row, col: col + 1 }];
    } else {
      return [{ row, col }, { row: row + 1, col }];
    }
  }

  place(cellA, cellB) {
    this.placed = true;
    this.cellA = { row: cellA.row, col: cellA.col };
    this.cellB = { row: cellB.row, col: cellB.col };
  }

  unplace() {
    this.placed = false;
    this.cellA = null;
    this.cellB = null;
  }

  clone() {
    const d = new Domino(this.id, this.pips[0], this.pips[1]);
    d.orientation = this.orientation;
    return d;
  }
}
