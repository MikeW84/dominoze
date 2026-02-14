import { generatePuzzle } from './generator.js';
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

function setupDifficultyButtons() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.diff-btn.active').classList.remove('active');
      btn.classList.add('active');
      startGame(btn.dataset.difficulty);
    });
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
    for (const domino of placedDominoes) {
      currentPuzzle.removeDomino(domino);
      removePlacedDomino(domino);
      addDominoToTray(domino);
    }
    clearErrorHighlights();
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

  try {
    currentPuzzle = generatePuzzle(difficulty);
  } catch (err) {
    console.error('Puzzle generation failed:', err);
    hideLoading();
    document.getElementById('board-container').innerHTML =
      '<p style="padding:20px;color:var(--color-error)">Failed to generate puzzle. Try again.</p>';
    return;
  }

  hideLoading();

  // Render
  renderBoard(currentPuzzle.board, currentPuzzle.regions);
  renderTray(currentPuzzle.dominoes);

  // Setup validation
  validationManager = new ValidationManager(currentPuzzle);

  // Setup interaction
  interactionManager = new InteractionManager(
    currentPuzzle,
    onDominoPlaced,
    onDominoRemoved,
  );

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
  setupNewPuzzleButton();
  setupClearAllButton();
  setupPlayAgainButton();
  startGame('easy');
});
