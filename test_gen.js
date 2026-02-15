import { generatePuzzle } from './js/generator.js';

const TRIALS = 20;
for (const diff of ['easy', 'medium', 'hard']) {
  console.log(`\n=== ${diff.toUpperCase()} (${TRIALS} trials) ===`);
  let pass = 0, fail = 0, totalMs = 0;
  const shapes = {};
  for (let i = 0; i < TRIALS; i++) {
    const start = Date.now();
    try {
      const puzzle = generatePuzzle(diff);
      const ms = Date.now() - start;
      totalMs += ms;
      pass++;
      const activeCells = puzzle.board.getActiveCells().length;
      const shape = `${puzzle.board.rows}x${puzzle.board.cols}(${activeCells})`;
      shapes[shape] = (shapes[shape] || 0) + 1;
      if (ms > 2000) console.log(`  #${i+1}: ${shape} ${puzzle.dominoes.length}dom ${puzzle.regions.length}reg ${ms}ms (slow)`);
    } catch (e) {
      const ms = Date.now() - start;
      totalMs += ms;
      fail++;
      console.log(`  #${i+1}: FAIL ${ms}ms`);
    }
  }
  console.log(`  Results: ${pass}/${TRIALS} pass, avg ${Math.round(totalMs/TRIALS)}ms`);
  console.log(`  Shapes:`, shapes);
}
