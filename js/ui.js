import { PIP_LAYOUTS } from './constants.js';

// Render the board grid
export function renderBoard(board, regions) {
  const container = document.getElementById('board-container');
  container.innerHTML = '';

  container.style.gridTemplateColumns = `repeat(${board.cols}, var(--cell-size))`;
  container.style.gridTemplateRows = `repeat(${board.rows}, var(--cell-size))`;

  // Track which regions have had their label placed
  const labeledRegions = new Set();

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = board.getCell(r, c);
      const div = document.createElement('div');
      div.classList.add('cell');
      div.dataset.row = r;
      div.dataset.col = c;
      // Explicit grid position so placed dominoes don't displace cells
      div.style.gridRow = r + 1;
      div.style.gridColumn = c + 1;

      if (!cell.active) {
        div.classList.add('cell-inactive');
      } else {
        const region = regions.find(reg => reg.cellKeys.has(cell.key));
        if (region) {
          div.style.backgroundColor = region.color;
          applyRegionBorders(div, cell, board, regions);

          // Add constraint label to first cell in region
          if (!labeledRegions.has(region.id) && region.label) {
            labeledRegions.add(region.id);
            const label = document.createElement('span');
            label.classList.add('constraint-label');
            label.textContent = region.label;
            div.appendChild(label);
          }
        }

        div.classList.add('drop-target');
      }

      container.appendChild(div);
    }
  }
}

function applyRegionBorders(div, cell, board, regions) {
  const directions = [
    { dr: -1, dc: 0, side: 'Top' },
    { dr: 0, dc: 1, side: 'Right' },
    { dr: 1, dc: 0, side: 'Bottom' },
    { dr: 0, dc: -1, side: 'Left' },
  ];

  for (const { dr, dc, side } of directions) {
    const neighbor = board.getCell(cell.row + dr, cell.col + dc);

    if (!neighbor || !neighbor.active || neighbor.regionId !== cell.regionId) {
      div.style[`border${side}`] = '2.5px solid var(--color-region-border)';
    } else {
      div.style[`border${side}`] = '0.5px solid var(--color-cell-inner-border)';
    }
  }
}

// Render domino tray
export function renderTray(dominoes) {
  const container = document.getElementById('tray-container');
  container.innerHTML = '';

  for (const domino of dominoes) {
    if (domino.placed) continue;
    const el = createDominoElement(domino);
    container.appendChild(el);
  }
}

export function createDominoElement(domino) {
  const el = document.createElement('div');
  el.classList.add('domino');
  el.classList.add(domino.isHorizontal ? 'domino-horizontal' : 'domino-vertical');
  el.dataset.dominoId = domino.id;
  el.draggable = true;

  const halfA = createDominoHalf(domino.getPipAt(0));
  const halfB = createDominoHalf(domino.getPipAt(1));

  el.appendChild(halfA);
  el.appendChild(halfB);

  return el;
}

function createDominoHalf(pipCount) {
  const half = document.createElement('div');
  half.classList.add('domino-half');

  const positions = PIP_LAYOUTS[pipCount] || [];
  for (const pos of positions) {
    const dot = document.createElement('div');
    dot.classList.add('pip-dot');
    dot.style.gridRow = pos.row;
    dot.style.gridColumn = pos.col;
    half.appendChild(dot);
  }

  return half;
}

// Render a placed domino on the board
export function renderPlacedDomino(domino, board) {
  // Remove from tray
  const trayEl = document.querySelector(`#tray-container .domino[data-domino-id="${domino.id}"]`);
  if (trayEl) trayEl.remove();

  const container = document.getElementById('board-container');

  const isHorizontal = domino.cellA.row === domino.cellB.row;
  const minRow = Math.min(domino.cellA.row, domino.cellB.row);
  const minCol = Math.min(domino.cellA.col, domino.cellB.col);

  const el = document.createElement('div');
  el.classList.add('domino', 'domino-placed');
  el.classList.add(isHorizontal ? 'domino-horizontal' : 'domino-vertical');
  el.dataset.dominoId = domino.id;

  el.style.gridRow = `${minRow + 1} / span ${isHorizontal ? 1 : 2}`;
  el.style.gridColumn = `${minCol + 1} / span ${isHorizontal ? 2 : 1}`;

  // Determine pip values based on position
  const cellA = board.getCell(domino.cellA.row, domino.cellA.col);
  const cellB = board.getCell(domino.cellB.row, domino.cellB.col);

  // First half in visual order (top/left), second half (bottom/right)
  let firstPip, secondPip;
  if (isHorizontal) {
    if (domino.cellA.col <= domino.cellB.col) {
      firstPip = cellA.pipValue;
      secondPip = cellB.pipValue;
    } else {
      firstPip = cellB.pipValue;
      secondPip = cellA.pipValue;
    }
  } else {
    if (domino.cellA.row <= domino.cellB.row) {
      firstPip = cellA.pipValue;
      secondPip = cellB.pipValue;
    } else {
      firstPip = cellB.pipValue;
      secondPip = cellA.pipValue;
    }
  }

  const halfA = createDominoHalf(firstPip);
  const halfB = createDominoHalf(secondPip);
  el.appendChild(halfA);
  el.appendChild(halfB);

  el.classList.add('pop-in');
  container.appendChild(el);
}

// Remove placed domino from board and return to tray
export function removePlacedDomino(domino) {
  const placedEl = document.querySelector(`#board-container .domino-placed[data-domino-id="${domino.id}"]`);
  if (placedEl) placedEl.remove();
}

// Re-add domino to tray
export function addDominoToTray(domino) {
  const container = document.getElementById('tray-container');
  const el = createDominoElement(domino);
  el.classList.add('pop-in');
  container.appendChild(el);
}

// Apply error highlights to cells
export function applyErrorHighlights(violations) {
  // Clear all errors
  document.querySelectorAll('.cell.error-cell').forEach(c => c.classList.remove('error-cell'));

  for (const v of violations) {
    for (const cellKey of v.cellKeys) {
      const [r, c] = cellKey.split(',').map(Number);
      const cellDiv = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (cellDiv && !cellDiv.classList.contains('cell-inactive')) {
        cellDiv.classList.add('error-cell');
      }
    }
  }
}

// Clear all error highlights
export function clearErrorHighlights() {
  document.querySelectorAll('.cell.error-cell').forEach(c => c.classList.remove('error-cell'));
}

// Show/hide loading
export function showLoading() {
  document.getElementById('loading-overlay').classList.remove('hidden');
}

export function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

// Show win modal
export function showWinModal(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const timeStr = min > 0
    ? `${min}:${sec.toString().padStart(2, '0')}`
    : `${sec} seconds`;

  document.getElementById('win-time').textContent = `Time: ${timeStr}`;
  document.getElementById('win-modal').classList.remove('hidden');
}

// Hide win modal
export function hideWinModal() {
  document.getElementById('win-modal').classList.add('hidden');
}

// Highlight drop zone cells
export function highlightDropZone(cells, board) {
  clearDropHighlights();

  for (const { row, col } of cells) {
    const cell = board.getCell(row, col);
    const cellDiv = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!cellDiv) continue;

    if (!cell || !cell.active || cell.dominoId !== null) {
      cellDiv.classList.add('drop-invalid');
    } else {
      cellDiv.classList.add('drop-hover');
    }
  }
}

export function clearDropHighlights() {
  document.querySelectorAll('.cell.drop-hover, .cell.drop-invalid').forEach(c => {
    c.classList.remove('drop-hover', 'drop-invalid');
  });
}
