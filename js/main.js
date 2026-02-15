import { generatePuzzle } from './generator.js';
import { generateSplitPuzzle } from './split-generator.js';
import { InteractionManager } from './interaction.js';
import { ValidationManager } from './validation.js';
import {
  renderBoard, renderTray, showLoading, hideLoading,
  showWinModal, hideWinModal, removePlacedDomino, addDominoToTray,
  clearErrorHighlights,
} from './ui.js';

let currentPuzzle = null;
let interactionManager = null;
let validationManager = null;
let timerInterval = null;
let startTime = null;
let splitMode = false;
let noRectangles = false;

function setupDifficultyButtons() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.diff-btn.active').classList.remove('active');
      btn.classList.add('active');
      startGame(btn.dataset.difficulty);
    });
  });
}

function setupSplitToggle() {
  const btn = document.getElementById('split-toggle');
  btn.addEventListener('click', () => {
    splitMode = !splitMode;
    btn.classList.toggle('active', splitMode);
    document.body.classList.toggle('split-mode', splitMode);
    const difficulty = document.querySelector('.diff-btn.active').dataset.difficulty;
    startGame(difficulty);
  });
}

function setupIrregularToggle() {
  const btn = document.getElementById('irregular-toggle');
  btn.addEventListener('click', () => {
    noRectangles = !noRectangles;
    btn.classList.toggle('active', noRectangles);
    const difficulty = document.querySelector('.diff-btn.active').dataset.difficulty;
    startGame(difficulty);
  });
}

function setupNewPuzzleButton() {
  document.getElementById('new-puzzle-btn').addEventListener('click', () => {
    const difficulty = document.querySelector('.diff-btn.active').dataset.difficulty;
    startGame(difficulty);
  });
}

function setupClearAllButton() {
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (!currentPuzzle) return;
    const placedDominoes = currentPuzzle.dominoes.filter(d => d.placed);

    if (splitMode) {
      const boardA = document.getElementById('board-container');
      const boardB = document.getElementById('board-b-container');
      for (const domino of placedDominoes) {
        const bi = currentPuzzle.getBoardIndexForDomino(domino);
        const container = bi === 1 ? boardB : boardA;
        currentPuzzle.removeDomino(domino);
        removePlacedDomino(domino, container);
        addDominoToTray(domino);
      }
      clearErrorHighlights(boardA);
      clearErrorHighlights(boardB);
    } else {
      for (const domino of placedDominoes) {
        currentPuzzle.removeDomino(domino);
        removePlacedDomino(domino);
        addDominoToTray(domino);
      }
      clearErrorHighlights();
    }
  });
}

function setupPlayAgainButton() {
  document.getElementById('play-again-btn').addEventListener('click', () => {
    hideWinModal();
    const difficulty = document.querySelector('.diff-btn.active').dataset.difficulty;
    startGame(difficulty);
  });

  // Also close modal on overlay click
  document.querySelector('.modal-overlay')?.addEventListener('click', () => {
    hideWinModal();
  });
}

async function startGame(difficulty) {
  // Clean up previous game
  if (interactionManager) {
    interactionManager.destroy();
    interactionManager = null;
  }
  stopTimer();
  hideWinModal();
  showLoading();

  // Yield to let loading overlay render
  await new Promise(r => setTimeout(r, 50));

  const boardA = document.getElementById('board-container');
  const boardB = document.getElementById('board-b-container');

  try {
    if (splitMode) {
      currentPuzzle = generateSplitPuzzle(difficulty, { noRectangles });
    } else {
      currentPuzzle = generatePuzzle(difficulty, { noRectangles });
    }
  } catch (err) {
    console.error('Puzzle generation failed:', err);
    hideLoading();
    boardA.innerHTML =
      '<p style="padding:20px;color:var(--color-error)">Failed to generate puzzle. Try again.</p>';
    return;
  }

  hideLoading();

  if (splitMode) {
    // Show both board containers
    boardB.classList.remove('hidden');

    // Render both boards
    renderBoard(currentPuzzle.boards[0], currentPuzzle.regions[0], boardA);
    renderBoard(currentPuzzle.boards[1], currentPuzzle.regions[1], boardB);
    renderTray(currentPuzzle.dominoes);

    const boardContainers = [boardA, boardB];

    // Setup validation
    validationManager = new ValidationManager(currentPuzzle, boardContainers);

    // Setup interaction
    interactionManager = new InteractionManager(
      currentPuzzle,
      onDominoPlaced,
      onDominoRemoved,
      boardContainers,
    );
  } else {
    // Hide second board container
    boardB.classList.add('hidden');
    boardB.innerHTML = '';

    // Render single board
    renderBoard(currentPuzzle.board, currentPuzzle.regions, boardA);
    renderTray(currentPuzzle.dominoes);

    // Setup validation
    validationManager = new ValidationManager(currentPuzzle);

    // Setup interaction
    interactionManager = new InteractionManager(
      currentPuzzle,
      onDominoPlaced,
      onDominoRemoved,
    );
  }

  // Start timer
  startTimer();
}

function onDominoPlaced(_domino) {
  const violations = validationManager.validate();

  if (validationManager.checkWin()) {
    stopTimer();
    const elapsed = getElapsedSeconds();
    showWinModal(elapsed);
  }
}

function onDominoRemoved(_domino) {
  validationManager.validate();
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const elapsed = getElapsedSeconds();
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  document.getElementById('timer').textContent =
    `${min}:${sec.toString().padStart(2, '0')}`;
}

function getElapsedSeconds() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupDifficultyButtons();
  setupSplitToggle();
  setupIrregularToggle();
  setupNewPuzzleButton();
  setupClearAllButton();
  setupPlayAgainButton();
  startGame('easy');
});
