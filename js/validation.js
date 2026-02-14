import { applyErrorHighlights, clearErrorHighlights } from './ui.js';

export class ValidationManager {
  constructor(puzzle) {
    this.puzzle = puzzle;
  }

  // Validate all regions, apply visual feedback, return violations
  validate() {
    const violations = this.puzzle.getViolations();
    applyErrorHighlights(violations);
    return violations;
  }

  // Check if puzzle is fully and correctly solved
  checkWin() {
    return this.puzzle.isSolved();
  }

  // Clear all error visuals
  clear() {
    clearErrorHighlights();
  }
}
