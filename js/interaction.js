import {
  renderPlacedDomino, removePlacedDomino, addDominoToTray,
  createDominoElement, highlightDropZone, clearDropHighlights,
} from './ui.js';

export class InteractionManager {
  constructor(puzzle, onPlacement, onRemoval) {
    this.puzzle = puzzle;
    this.onPlacement = onPlacement;
    this.onRemoval = onRemoval;
    this.dragState = null;
    this.ghostElement = null;
    this.clickStartPos = null;
    this.isDragging = false;
    this._boardDrag = null;
    this._abortController = new AbortController();

    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this.init();
  }

  init() {
    const signal = this._abortController.signal;
    const tray = document.getElementById('tray-container');
    const board = document.getElementById('board-container');

    // Tray: drag start + click-to-rotate + touch
    tray.addEventListener('dragstart', (e) => this._onDragStart(e), { signal });
    tray.addEventListener('mousedown', (e) => this._onMouseDown(e), { signal });
    tray.addEventListener('mouseup', (e) => this._onMouseUp(e), { signal });
    tray.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false, signal });

    // Board: HTML5 drop target for tray drags
    board.addEventListener('dragover', (e) => this._onDragOver(e), { signal });
    board.addEventListener('dragleave', () => clearDropHighlights(), { signal });
    board.addEventListener('drop', (e) => this._onDrop(e), { signal });

    // Board: mouse-based drag for repositioning placed dominoes
    board.addEventListener('mousedown', (e) => this._onBoardMouseDown(e), { signal });
    document.addEventListener('mousemove', (e) => this._onBoardMouseMove(e), { signal });
    document.addEventListener('mouseup', (e) => this._onBoardMouseUp(e), { signal });

    // Touch: document-level move/end
    document.addEventListener('touchmove', this._onTouchMove, { passive: false, signal });
    document.addEventListener('touchend', this._onTouchEnd, { signal });
  }

  destroy() {
    this._abortController.abort();
  }

  // Event delegation handles tray rebinding automatically

  // --- Drag and Drop (Desktop) ---

  _onDragStart(e) {
    const dominoEl = e.target.closest('.domino:not(.domino-placed)');
    if (!dominoEl) return;

    const domino = this._getDomino(dominoEl.dataset.dominoId);
    if (!domino || domino.placed) return;

    const grabbedHalf = this._getGrabbedHalf(dominoEl, domino, e.clientX, e.clientY);
    this.dragState = { domino, element: dominoEl, grabbedHalf };
    this.isDragging = true;

    e.dataTransfer.setData('text/plain', domino.id);
    e.dataTransfer.effectAllowed = 'move';

    // Dim the source
    requestAnimationFrame(() => dominoEl.classList.add('dragging'));
  }

  // --- Mouse-based drag for placed board dominoes ---

  _onBoardMouseDown(e) {
    const placedEl = e.target.closest('.domino-placed');
    if (!placedEl) return;

    const domino = this._getDomino(placedEl.dataset.dominoId);
    if (!domino) return;

    e.preventDefault();
    const grabbedHalf = this._getGrabbedHalf(placedEl, domino, e.clientX, e.clientY);
    this._boardDrag = {
      domino,
      element: placedEl,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      grabbedHalf,
    };
  }

  _onBoardMouseMove(e) {
    if (!this._boardDrag) return;

    const dx = Math.abs(e.clientX - this._boardDrag.startX);
    const dy = Math.abs(e.clientY - this._boardDrag.startY);

    // Start drag after moving 5px
    if (!this._boardDrag.active && dx + dy > 5) {
      this._boardDrag.active = true;

      // Unplace the domino and hide the original
      this.puzzle.removeDomino(this._boardDrag.domino);
      this.onRemoval(this._boardDrag.domino);

      // Create ghost BEFORE hiding original (so clone inherits visible state)
      this._createGhost(this._boardDrag.element, e.clientX, e.clientY);
      this._boardDrag.element.style.opacity = '0';
    }

    if (!this._boardDrag.active) return;

    this._updateGhostPosition(e.clientX, e.clientY);

    // Highlight target cells
    const cellDiv = this._cellFromPoint(e.clientX, e.clientY);
    if (cellDiv) {
      const row = parseInt(cellDiv.dataset.row);
      const col = parseInt(cellDiv.dataset.col);
      const anchor = this._findBestAnchor(this._boardDrag.domino, row, col, this._boardDrag.grabbedHalf);
      if (anchor) {
        highlightDropZone(this._boardDrag.domino.getPlacementCells(anchor.row, anchor.col), this.puzzle.board);
      } else {
        highlightDropZone(this._boardDrag.domino.getPlacementCells(row, col), this.puzzle.board);
      }
    } else {
      clearDropHighlights();
    }
  }

  _onBoardMouseUp(e) {
    if (!this._boardDrag) return;

    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }
    clearDropHighlights();

    if (!this._boardDrag.active) {
      // Was a click, not a drag - return to tray
      this.puzzle.removeDomino(this._boardDrag.domino);
      removePlacedDomino(this._boardDrag.domino);
      addDominoToTray(this._boardDrag.domino);
      this.onRemoval(this._boardDrag.domino);
      this._boardDrag = null;
      return;
    }

    // Try to place at the drop location
    let placed = false;
    const cellDiv = this._cellFromPoint(e.clientX, e.clientY);
    if (cellDiv) {
      const row = parseInt(cellDiv.dataset.row);
      const col = parseInt(cellDiv.dataset.col);
      const anchor = this._findBestAnchor(this._boardDrag.domino, row, col, this._boardDrag.grabbedHalf);
      if (anchor) {
        placed = this._tryPlace(this._boardDrag.domino, anchor.row, anchor.col);
      }
    }

    // Remove the hidden original element
    this._boardDrag.element.remove();

    // If placement failed, return to tray
    if (!placed) {
      addDominoToTray(this._boardDrag.domino);
    }

    this._boardDrag = null;
  }

  _cellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el?.closest('.cell');
  }

  _onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!this.dragState) return;

    const cellDiv = this._findCellFromEvent(e);
    if (!cellDiv) { clearDropHighlights(); return; }

    const row = parseInt(cellDiv.dataset.row);
    const col = parseInt(cellDiv.dataset.col);
    // Show best anchor position for this cell
    const anchor = this._findBestAnchor(this.dragState.domino, row, col, this.dragState.grabbedHalf);
    if (anchor) {
      const cells = this.dragState.domino.getPlacementCells(anchor.row, anchor.col);
      highlightDropZone(cells, this.puzzle.board);
    } else {
      highlightDropZone(this.dragState.domino.getPlacementCells(row, col), this.puzzle.board);
    }
  }

  _onDrop(e) {
    e.preventDefault();
    clearDropHighlights();

    if (!this.dragState) return;

    const cellDiv = this._findCellFromEvent(e);
    if (cellDiv) {
      const row = parseInt(cellDiv.dataset.row);
      const col = parseInt(cellDiv.dataset.col);
      const anchor = this._findBestAnchor(this.dragState.domino, row, col, this.dragState.grabbedHalf);
      if (anchor) {
        this._tryPlace(this.dragState.domino, anchor.row, anchor.col);
      }
    }

    this._endDrag();
  }

  _endDrag() {
    if (this.dragState && this.dragState.element) {
      this.dragState.element.classList.remove('dragging');
    }
    this.dragState = null;
    this.isDragging = false;
  }

  // --- Click to rotate ---

  _onMouseDown(e) {
    const dominoEl = e.target.closest('.domino:not(.domino-placed)');
    if (!dominoEl) return;
    this.clickStartPos = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
  }

  _onMouseUp(e) {
    const dominoEl = e.target.closest('.domino:not(.domino-placed)');
    if (!dominoEl || !this.clickStartPos) {
      this.clickStartPos = null;
      return;
    }

    const dx = Math.abs(e.clientX - this.clickStartPos.x);
    const dy = Math.abs(e.clientY - this.clickStartPos.y);
    this.clickStartPos = null;

    // If moved less than 5px, it's a click (rotate)
    if (dx + dy < 5) {
      const domino = this._getDomino(dominoEl.dataset.dominoId);
      if (domino && !domino.placed) {
        domino.rotate();
        this._rerenderTrayDomino(dominoEl, domino);
      }
    }
  }

  // --- Touch (Mobile) ---

  _onTouchStart(e) {
    const dominoEl = e.target.closest('.domino:not(.domino-placed)');
    if (!dominoEl) return;

    const domino = this._getDomino(dominoEl.dataset.dominoId);
    if (!domino || domino.placed) return;

    const touch = e.touches[0];
    this.clickStartPos = { x: touch.clientX, y: touch.clientY };
    this.isDragging = false;
    const grabbedHalf = this._getGrabbedHalf(dominoEl, domino, touch.clientX, touch.clientY);
    this.dragState = { domino, element: dominoEl, grabbedHalf };

    // Delay ghost creation to distinguish tap from drag
    this._touchTimer = setTimeout(() => {
      if (!this.dragState) return;
      this.isDragging = true;
      this._createGhost(dominoEl, touch.clientX, touch.clientY);
      dominoEl.classList.add('dragging');
    }, 120);
  }

  _onTouchMove(e) {
    if (!this.dragState) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - this.clickStartPos.x);
    const dy = Math.abs(touch.clientY - this.clickStartPos.y);

    if (dx + dy > 8 && !this.isDragging) {
      clearTimeout(this._touchTimer);
      this.isDragging = true;
      this._createGhost(this.dragState.element, touch.clientX, touch.clientY);
      this.dragState.element.classList.add('dragging');
    }

    if (!this.isDragging) return;
    e.preventDefault();

    this._updateGhostPosition(touch.clientX, touch.clientY);

    // Find cell under touch point
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellDiv = el?.closest('.cell');
    if (cellDiv) {
      const row = parseInt(cellDiv.dataset.row);
      const col = parseInt(cellDiv.dataset.col);
      const anchor = this._findBestAnchor(this.dragState.domino, row, col, this.dragState.grabbedHalf);
      if (anchor) {
        highlightDropZone(this.dragState.domino.getPlacementCells(anchor.row, anchor.col), this.puzzle.board);
      } else {
        highlightDropZone(this.dragState.domino.getPlacementCells(row, col), this.puzzle.board);
      }
    } else {
      clearDropHighlights();
    }
  }

  _onTouchEnd(e) {
    clearTimeout(this._touchTimer);

    if (!this.dragState) return;

    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    if (!this.isDragging) {
      // It was a tap - rotate
      const domino = this.dragState.domino;
      const el = this.dragState.element;
      domino.rotate();
      this._rerenderTrayDomino(el, domino);
      this.dragState.element.classList.remove('dragging');
      this.dragState = null;
      this.isDragging = false;
      return;
    }

    // Find cell at touch point and try to place
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellDiv = el?.closest('.cell');
    if (cellDiv) {
      const row = parseInt(cellDiv.dataset.row);
      const col = parseInt(cellDiv.dataset.col);
      const anchor = this._findBestAnchor(this.dragState.domino, row, col, this.dragState.grabbedHalf);
      if (anchor) {
        this._tryPlace(this.dragState.domino, anchor.row, anchor.col);
      }
    }

    this.dragState.element.classList.remove('dragging');
    clearDropHighlights();
    this.dragState = null;
    this.isDragging = false;
  }

  // --- Helpers ---

  // Find the cell element from a drag/drop event, even if target is a child or overlay
  _findCellFromEvent(e) {
    // Try direct target first
    let cellDiv = e.target.closest('.cell');
    if (cellDiv) return cellDiv;

    // If dropped on a placed domino or board container, find cell by coordinates
    const board = document.getElementById('board-container');
    const boardRect = board.getBoundingClientRect();
    const x = e.clientX - boardRect.left;
    const y = e.clientY - boardRect.top;

    if (x < 0 || y < 0 || x > boardRect.width || y > boardRect.height) return null;

    // Calculate cell from pixel position
    const cellSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  }

  // Detect which half of a domino was grabbed based on click/touch position
  _getGrabbedHalf(dominoEl, domino, clientX, clientY) {
    const rect = dominoEl.getBoundingClientRect();
    if (domino.isHorizontal) {
      return (clientX - rect.left < rect.width / 2) ? 0 : 1;
    } else {
      return (clientY - rect.top < rect.height / 2) ? 0 : 1;
    }
  }

  // Find best anchor position based on which half the user grabbed
  _findBestAnchor(domino, row, col, grabbedHalf = 0) {
    if (grabbedHalf === 1) {
      // Grabbed second half - offset so second half lands on hovered cell
      if (domino.isHorizontal) {
        if (this._canPlace(domino, row, col - 1)) return { row, col: col - 1 };
      } else {
        if (this._canPlace(domino, row - 1, col)) return { row: row - 1, col };
      }
      // Fallback: try hovered cell as anchor
      if (this._canPlace(domino, row, col)) return { row, col };
    } else {
      // Grabbed first half - hovered cell is the anchor
      if (this._canPlace(domino, row, col)) return { row, col };
      // Fallback: offset so second half lands on hovered cell
      if (domino.isHorizontal) {
        if (this._canPlace(domino, row, col - 1)) return { row, col: col - 1 };
      } else {
        if (this._canPlace(domino, row - 1, col)) return { row: row - 1, col };
      }
    }
    return null;
  }

  _canPlace(domino, row, col) {
    const cells = domino.getPlacementCells(row, col);
    const cellA = this.puzzle.board.getCell(cells[0].row, cells[0].col);
    const cellB = this.puzzle.board.getCell(cells[1].row, cells[1].col);
    if (!cellA || !cellB) return false;
    if (!cellA.active || !cellB.active) return false;
    if (cellA.dominoId !== null || cellB.dominoId !== null) return false;
    return true;
  }

  _getDomino(id) {
    return this.puzzle.dominoes.find(d => d.id === id);
  }

  _tryPlace(domino, row, col) {
    const cells = domino.getPlacementCells(row, col);
    const cellA = this.puzzle.board.getCell(cells[0].row, cells[0].col);
    const cellB = this.puzzle.board.getCell(cells[1].row, cells[1].col);

    if (!cellA || !cellB) return false;
    if (!cellA.active || !cellB.active) return false;
    if (cellA.dominoId !== null || cellB.dominoId !== null) return false;

    const success = this.puzzle.placeDomino(domino, cells[0], cells[1]);
    if (success) {
      renderPlacedDomino(domino, this.puzzle.board);
      this.onPlacement(domino);
    }
    return success;
  }

  _rerenderTrayDomino(oldEl, domino) {
    const newEl = createDominoElement(domino);
    oldEl.replaceWith(newEl);
  }

  _createGhost(sourceEl, x, y) {
    if (this.ghostElement) this.ghostElement.remove();
    const rect = sourceEl.getBoundingClientRect();
    this.ghostElement = sourceEl.cloneNode(true);
    this.ghostElement.classList.add('domino-ghost');
    // Clear inline styles that shouldn't carry over to the ghost
    this.ghostElement.style.opacity = '';
    this.ghostElement.style.gridRow = '';
    this.ghostElement.style.gridColumn = '';
    // Preserve dimensions (placed dominoes lose size outside grid context)
    this.ghostElement.style.width = `${rect.width}px`;
    this.ghostElement.style.height = `${rect.height}px`;
    document.body.appendChild(this.ghostElement);
    this._updateGhostPosition(x, y);
  }

  _updateGhostPosition(x, y) {
    if (!this.ghostElement) return;
    const rect = this.ghostElement.getBoundingClientRect();
    this.ghostElement.style.left = `${x - rect.width / 2}px`;
    this.ghostElement.style.top = `${y - rect.height / 2}px`;
  }
}
