// ── Lines 98 Remastered — Entry Point ──
import { state, resetState } from './core/state.js';
import { generateNextBalls, spawnBalls } from './core/logic.js';
import { clearHistory, logEvent } from './core/replay.js';

console.log("Lines 98 Remastered Core Initialized!");

function initGame() {
  const seed = Math.floor(Math.random() * 2147483647);
  resetState(seed);
  clearHistory();

  // Log game start event
  logEvent({ type: 'START', seed });

  console.log(`New Game Started. Seed: ${seed}`);
  
  // Initial spawn
  const spawned = spawnBalls(5);
  logEvent({ type: 'SPAWN', balls: spawned });

  // Generate next 3 preview balls
  generateNextBalls();

  console.log("Initial Board State:", state.board.map(r => r.join(' ')));
  console.log("Next Preview Balls:", state.nextBalls);
}

// Start game automatically for diagnostic check
initGame();
