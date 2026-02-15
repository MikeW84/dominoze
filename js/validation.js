import { applyErrorHighlights, clearErrorHighlights } from './ui.js';

export class ValidationManager {
  constructor(puzzle, boardContainers) {
    this.puzzle = puzzle;
    // Board containers for scoped error highlights in split mode
    this.boardContainers = boardContainers || null;
    this.isSplit = boardContainers && boardContainers.length > 1;
  }

  validate() {
    if (this.isSplit) {
      // Validate each board separately with scoped highlights
      const allViolations = [];
      for (let bi = 0; bi < this.boardContainers.length; bi++) {
        const violations = this.puzzle.getViolations(bi);
        applyErrorHighlights(violations, this.boardContainers[bi]);
        allViolations.push(...violations);
      }
      return allViolations;
    }

    // Single board mode
    const violations = this.puzzle.getViolations();
    applyErrorHighlights(violations);
    return violations;
  }

  checkWin() {
    return this.puzzle.isSolved();
  }

  clear() {
    if (this.isSplit) {
      for (const container of this.boardContainers) {
        clearErrorHighlights(container);
      }
    } else {
      clearErrorHighlights();
    }
  }
}
