// ── Lines 97 — Hint System ──
import { SIZE } from './constants.js';
import { state } from './state.js';
import { findPath, checkLines } from './logic.js';
import { getCell, $, delay } from './render.js';

let hintTimeout = null;

/**
 * Brute-force scan: try every ball → every empty cell → pick best line.
 * Board is 9×9 so this is fast enough (<50ms).
 */
export function findBestHint() {
  let best = null;
  let bestLen = 0;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const color = state.board[r][c];
      if (!color) continue;

      for (let tr = 0; tr < SIZE; tr++) {
        for (let tc = 0; tc < SIZE; tc++) {
          if (state.board[tr][tc] !== 0) continue;
          if (!findPath(r, c, tr, tc)) continue;

          // Simulate move
          state.board[r][c] = 0;
          state.board[tr][tc] = color;
          const removed = checkLines(tr, tc);
          // Undo simulation
          state.board[r][c] = color;
          state.board[tr][tc] = 0;

          if (removed.length > bestLen) {
            bestLen = removed.length;
            best = { fromRow: r, fromCol: c, toRow: tr, toCol: tc, count: removed.length };
          }
        }
      }
    }
  }
  return best;
}

/** Highlight hint source & destination on board for 2.5s */
export function showHint(hint) {
  clearHint();
  if (!hint) return;
  const src = getCell(hint.fromRow, hint.fromCol);
  const dst = getCell(hint.toRow, hint.toCol);
  if (src) src.classList.add('hint-src');
  if (dst) dst.classList.add('hint-dst');
  hintTimeout = setTimeout(clearHint, 2500);
}

export function clearHint() {
  if (hintTimeout) { clearTimeout(hintTimeout); hintTimeout = null; }
  document.querySelectorAll('.hint-src, .hint-dst').forEach(el => {
    el.classList.remove('hint-src', 'hint-dst');
  });
}
