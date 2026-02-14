export class Cell {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.active = true;
    this.regionId = null;
    this.dominoId = null;
    this.pipValue = null;
  }

  get key() {
    return `${this.row},${this.col}`;
  }

  clear() {
    this.dominoId = null;
    this.pipValue = null;
  }
}

export class Board {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = [];
    for (let r = 0; r < rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < cols; c++) {
        this.cells[r][c] = new Cell(r, c);
      }
    }
  }

  getCell(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.cells[row][col];
  }

  getActiveCells() {
    const result = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c].active) result.push(this.cells[r][c]);
      }
    }
    return result;
  }

  getEmptyCells() {
    return this.getActiveCells().filter(c => c.dominoId === null);
  }

  getNeighbors(row, col) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const result = [];
    for (const [dr, dc] of dirs) {
      const cell = this.getCell(row + dr, col + dc);
      if (cell && cell.active) result.push(cell);
    }
    return result;
  }

  // Get all pairs of adjacent active cells
  getAdjacentPairs() {
    const pairs = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (!cell.active) continue;
        // Right neighbor
        const right = this.getCell(r, c + 1);
        if (right && right.active) pairs.push([cell, right]);
        // Down neighbor
        const down = this.getCell(r + 1, c);
        if (down && down.active) pairs.push([cell, down]);
      }
    }
    return pairs;
  }

  // Check if all active cells are connected via BFS
  isConnected() {
    const active = this.getActiveCells();
    if (active.length === 0) return true;

    const visited = new Set();
    const queue = [active[0]];
    visited.add(active[0].key);

    while (queue.length > 0) {
      const cell = queue.shift();
      for (const neighbor of this.getNeighbors(cell.row, cell.col)) {
        if (!visited.has(neighbor.key)) {
          visited.add(neighbor.key);
          queue.push(neighbor);
        }
      }
    }

    return visited.size === active.length;
  }

  // Clear all domino placements
  clearPlacements() {
    for (const cell of this.getActiveCells()) {
      cell.clear();
    }
  }
}
