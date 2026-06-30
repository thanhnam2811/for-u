/**
 * Golden Replay Test — Lines 98 Determinism Verification
 *
 * Validates that the headless simulator and core game logic
 * produce deterministic, reproducible results.
 *
 * Usage: node tests/golden-test.mjs
 */

import { simulateGame } from '../src/lines98/js/core/simulator.js';
import { SeededRNG } from '../src/lines98/js/core/rng.js';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
	if (condition) {
		passed++;
	} else {
		failed++;
		console.error(`  FAIL: ${msg}`);
	}
}

// ── Test 1: SeededRNG Determinism ──
{
	console.log('Test 1: SeededRNG determinism');
	const rng1 = new SeededRNG(12345);
	const rng2 = new SeededRNG(12345);
	const seq1 = [rng1.next(), rng1.next(), rng1.next()];
	const seq2 = [rng2.next(), rng2.next(), rng2.next()];

	assert(seq1[0] === seq2[0], `First value should match (${seq1[0]} === ${seq2[0]})`);
	assert(seq1[1] === seq2[1], `Second value should match (${seq1[1]} === ${seq2[1]})`);
	assert(seq1[2] === seq2[2], `Third value should match (${seq1[2]} === ${seq2[2]})`);

	// Test save/restore
	const saved = rng1.saveState();
	const valBefore = rng1.next();
	rng1.loadState(saved);
	const valAfter = rng1.next();
	assert(valBefore === valAfter, `Save/restore should produce same next value`);
}

// ── Test 2: Simulator — Simple line clear ──
{
	console.log('Test 2: Simulator — simple line clear');
	const events = [
		{ type: 'START' },
		{ type: 'SPAWN', balls: [[0,0,1], [0,1,1], [0,2,1], [0,3,1], [0,4,1]] },
		{ type: 'CLEAR', cells: [[0,0], [0,1], [0,2], [0,3], [0,4]], scoreDelta: 10 },
	];

	const result = simulateGame(0, events);

	assert(result.valid, 'Should have no errors');
	assert(result.score === 10, `Score should be 10, got ${result.score}`);
	assert(result.errors.length === 0, `Error count should be 0, got ${result.errors.length}`);

	// Verify board is empty after clear
	const remaining = result.board.flat().filter(c => c !== 0).length;
	assert(remaining === 0, `Board should be empty, found ${remaining} balls`);
}

// ── Test 3: Simulator — Multi-line clear ──
{
	console.log('Test 3: Simulator — multi-line clear');
	const events = [
		{ type: 'START' },
		// Horizontal line of 5 (color 1)
		{ type: 'SPAWN', balls: [[0,0,1], [0,1,1], [0,2,1], [0,3,1], [0,4,1]] },
		// Vertical line of 5 (color 2)
		{ type: 'SPAWN', balls: [[1,0,2], [2,0,2], [3,0,2], [4,0,2], [5,0,2]] },
		// CLEAR both lines
		{ type: 'CLEAR', cells: [[0,0], [0,1], [0,2], [0,3], [0,4]], scoreDelta: 10 },
		{ type: 'CLEAR', cells: [[1,0], [2,0], [3,0], [4,0], [5,0]], scoreDelta: 10 },
	];

	const result = simulateGame(0, events);

	assert(result.valid, 'Should have no errors');
	assert(result.score === 20, `Score should be 20, got ${result.score}`);
}

// ── Test 4: Simulator — Move event ──
{
	console.log('Test 4: Simulator — move event');
	const events = [
		{ type: 'START' },
		{ type: 'SPAWN', balls: [[0,0,1]] },
		{ type: 'MOVE', from: [0,0], to: [0,1] },
	];

	const result = simulateGame(0, events);

	assert(result.valid, 'Should have no errors');
	assert(result.board[0][0] === 0, 'Source should be empty after move');
	assert(result.board[0][1] === 1, 'Dest should contain ball after move');
}

// ── Test 5: Simulator — Invalid event detection ──
{
	console.log('Test 5: Simulator — invalid event detection');
	const events = [
		{ type: 'START' },
		{ type: 'CLEAR', cells: [[0,0]], scoreDelta: 0 },
	];

	const result = simulateGame(0, events);
	assert(!result.valid, 'Should detect invalid CLEAR on empty cell');
	assert(result.errors.length > 0, 'Should have errors');
}

// ── Test 6: Simulator — Replay determinism ──
{
	console.log('Test 6: Simulator — replay determinism');
	const events = [
		{ type: 'START' },
		{ type: 'SPAWN', balls: [[2,2,3], [2,3,3], [2,4,3], [2,5,3], [2,6,3]] },
		{ type: 'CLEAR', cells: [[2,2], [2,3], [2,4], [2,5], [2,6]], scoreDelta: 10 },
	];

	const result1 = simulateGame(42, events);
	const result2 = simulateGame(42, events);

	assert(result1.score === result2.score, 'Score should be identical across runs');
	assert(result1.boardHash === result2.boardHash, 'Board hash should be identical across runs');
}

// ── Test 7: Simulator — Complex scenario (move + spawn + clear) ──
{
	console.log('Test 7: Simulator — complex scenario');
	const events = [
		{ type: 'START' },
		{ type: 'SPAWN', balls: [[3,3,4], [3,4,4], [3,5,4]] },
		// Move the last ball in line to extend right
		{ type: 'MOVE', from: [3,5], to: [3,6] },
		// Fill the gap + extend to complete line of 5
		{ type: 'SPAWN', balls: [[3,5,4], [3,7,4]] },
		// Now [3,3]..[3,7] is a line of 5
		{ type: 'CLEAR', cells: [[3,3], [3,4], [3,5], [3,6], [3,7]], scoreDelta: 10 },
	];

	const result = simulateGame(0, events);
	assert(result.valid, `Complex scenario should be valid, errors: ${result.errors.join(', ')}`);
	assert(result.score === 10, `Score should be 10, got ${result.score}`);
}

// ── Summary ──
console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
	console.error('Golden Replay Test FAILED');
	process.exit(1);
} else {
	console.log('Golden Replay Test PASSED');
}
