# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dominoze is a constraint satisfaction puzzle game. Players place domino pieces on a board to satisfy region constraints (equal, not-equal, sum, less-than, greater). Built with vanilla JavaScript (ES6 modules), HTML5, and CSS3 — no dependencies, no build step, no framework.

## Running

```bash
./start.sh                    # Starts python3 HTTP server on :8000 and opens browser
python3 -m http.server 8000   # Manual alternative
```

## Testing

```bash
node test_gen.js              # Tests puzzle generation across 20 trials per difficulty
timeout 60 node test_gen.js   # With safety timeout
```

No linting or formatting tools are configured.

## Architecture

All game logic lives in `js/` as ES6 modules loaded directly by the browser (no bundling).

**Entry point**: `index.html` → `js/main.js`

**Model layer** (`board.js`, `cell.js` via board, `domino.js`, `region.js`, `puzzle.js`):
- `Board` — 2D grid of `Cell` objects with connectivity tracking
- `Domino` — piece with orientation (0-3), pip values, placement state
- `Region` — set of cell keys + a `ConstraintType` (NONE, EQUAL, NOT_EQUAL, SUM, LESS_THAN, GREATER)
- `Puzzle` — ties board, dominos, regions, and solution together

**Generation & solving** (`generator.js`, `solver.js`):
- Multi-stage pipeline: create board shape → find domino tiling (backtracking) → assign domino values → seed regions (farthest-first) → assign constraints → validate uniqueness via solver → tighten if needed
- Solver uses backtracking with most-constrained-first cell selection, feasible-value pruning, and a 300k call limit
- Hard difficulty has an 8-second time budget with per-shape limits

**View** (`ui.js`):
- All DOM rendering: board grid, tray, modals, constraint labels
- CSS Grid layout with dynamic cell spans

**Controllers** (`interaction.js`, `validation.js`):
- `InteractionManager` — HTML5 drag-drop (tray→board), mouse drag (reposition on board), touch support with ghost element, click-to-rotate detection
- `ValidationManager` — real-time constraint checking with visual error feedback

**State** lives in `main.js`: `currentPuzzle`, `interactionManager`, `validationManager`, difficulty switching, timer.

**Constants** (`constants.js`): game configuration, constraint types, difficulty parameters.

## Key Conventions

- Classes: PascalCase; functions/vars: camelCase; constants: UPPER_SNAKE_CASE; CSS classes: kebab-case
- AbortController used for event listener cleanup
- Separate mouse and touch handlers (not unified pointer events)
- Each module is 200-400 lines with focused responsibility
