import { ConstraintType, REGION_COLORS } from './constants.js';

export class Region {
  constructor(id, constraintType = ConstraintType.NONE, target = null) {
    this.id = id;
    this.constraintType = constraintType;
    this.target = target;
    this.cellKeys = new Set();
    this.color = REGION_COLORS[id % REGION_COLORS.length];
  }

  addCell(row, col) {
    this.cellKeys.add(`${row},${col}`);
  }

  get size() {
    return this.cellKeys.size;
  }

  // Get pip values currently placed in this region
  getPlacedValues(board) {
    const values = [];
    for (const key of this.cellKeys) {
      const [r, c] = key.split(',').map(Number);
      const cell = board.getCell(r, c);
      if (cell && cell.pipValue !== null) {
        values.push(cell.pipValue);
      }
    }
    return values;
  }

  // Validate the constraint for this region
  // Returns { valid: boolean, complete: boolean }
  validate(board) {
    const allCellKeys = [...this.cellKeys];
    const values = [];
    let totalCells = 0;

    for (const key of allCellKeys) {
      const [r, c] = key.split(',').map(Number);
      const cell = board.getCell(r, c);
      if (!cell) continue;
      totalCells++;
      if (cell.pipValue !== null) {
        values.push(cell.pipValue);
      }
    }

    const isFull = values.length === totalCells;

    switch (this.constraintType) {
      case ConstraintType.NONE:
        return { valid: true, complete: isFull };

      case ConstraintType.EQUAL: {
        if (values.length === 0) return { valid: true, complete: false };
        const allSame = values.every(v => v === values[0]);
        return { valid: allSame, complete: isFull };
      }

      case ConstraintType.NOT_EQUAL: {
        if (values.length === 0) return { valid: true, complete: false };
        const allDiff = new Set(values).size === values.length;
        return { valid: allDiff, complete: isFull };
      }

      case ConstraintType.SUM: {
        const sum = values.reduce((a, b) => a + b, 0);
        const remaining = totalCells - values.length;
        if (isFull) return { valid: sum === this.target, complete: true };
        // Partial: sum <= target and sum + remaining*6 >= target
        const canReach = sum <= this.target && sum + remaining * 6 >= this.target;
        return { valid: canReach, complete: false };
      }

      case ConstraintType.LESS_THAN: {
        const allLess = values.every(v => v < this.target);
        return { valid: allLess, complete: isFull };
      }

      case ConstraintType.GREATER: {
        const allGreater = values.every(v => v > this.target);
        return { valid: allGreater, complete: isFull };
      }

      default:
        return { valid: true, complete: isFull };
    }
  }

  // Display label for the constraint
  get label() {
    switch (this.constraintType) {
      case ConstraintType.NONE: return '';
      case ConstraintType.EQUAL: return '=';
      case ConstraintType.NOT_EQUAL: return '\u2260';
      case ConstraintType.SUM: return String(this.target);
      case ConstraintType.LESS_THAN: return `<${this.target}`;
      case ConstraintType.GREATER: return `>${this.target}`;
      default: return '';
    }
  }
}
