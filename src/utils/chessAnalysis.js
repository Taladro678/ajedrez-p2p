/**
 * Chess Analysis Utility
 * Handles move classification, accuracy calculation, and anti-cheat heuristics.
 */

export const MOVE_TYPES = {
    BRILLIANT: { label: '!!', name: 'Brillante', color: '#1baca6', weight: 1.0 },
    GREAT: { label: '!', name: 'Gran Jugada', color: '#5c8bb0', weight: 0.95 },
    BEST: { label: '★', name: 'La Mejor', color: '#95bb4a', weight: 0.9 },
    EXCELLENT: { label: '', name: 'Excelente', color: '#95bb4a', weight: 0.8 },
    GOOD: { label: '', name: 'Buena', color: '#96bc4b', weight: 0.7 },
    INACCURACY: { label: '?!', name: 'Imprecisión', color: '#f0c15c', weight: 0.4 },
    MISTAKE: { label: '?', name: 'Error', color: '#e6912c', weight: 0.1 },
    BLUNDER: { label: '??', name: 'Error Grave', color: '#b33430', weight: 0 },
    FORCED: { label: '', name: 'Forzada', color: '#94a3b8', weight: 0.8 }
};

/**
 * Classifies a move based on centipawn evaluation changes.
 * @param {number} scoreBefore - Evaluation before the move (from white's perspective).
 * @param {number} scoreAfter - Evaluation after the move (from white's perspective).
 * @param {string} turn - Side that just moved ('w' or 'b').
 * @param {boolean} isBestMove - Whether this was the top engine choice.
 * @param {boolean} isForced - Whether it was the only legal move.
 */
export const classifyMove = (scoreBefore, scoreAfter, turn, isBestMove, isForced) => {
    if (isForced) return MOVE_TYPES.FORCED;

    // Normalize evaluation: positive is good for the side that just moved
    let winChanceBefore = 50 + 50 * (2 / (1 + Math.exp(-0.00368224 * (turn === 'w' ? scoreBefore : -scoreBefore) * 100)) - 1);
    let winChanceAfter = 50 + 50 * (2 / (1 + Math.exp(-0.00368224 * (turn === 'w' ? scoreAfter : -scoreAfter) * 100)) - 1);

    // Difference in win percentage (loss of equity)
    const diff = winChanceAfter - winChanceBefore;
    const loss = -diff; // Positive if we lost equity

    if (isBestMove) {
        // Check for brilliant/great
        // Simplified: if best move and was hard to find or high evaluation gain (due to depth discovery)
        if (diff > 5 && winChanceBefore < 40) return MOVE_TYPES.BRILLIANT;
        if (diff > 2 && winChanceBefore < 50) return MOVE_TYPES.GREAT;
        return MOVE_TYPES.BEST;
    }

    if (loss < 2) return MOVE_TYPES.EXCELLENT;
    if (loss < 5) return MOVE_TYPES.GOOD;
    if (loss < 10) return MOVE_TYPES.INACCURACY;
    if (loss < 20) return MOVE_TYPES.MISTAKE;
    return MOVE_TYPES.BLUNDER;
};

/**
 * Calculates game accuracy based on move weights.
 * @param {Array} moveResults - Array of MOVE_TYPES results.
 */
export const calculateAccuracy = (moveResults) => {
    if (!moveResults || moveResults.length === 0) return 0;

    const sum = moveResults.reduce((acc, move) => acc + (move?.weight || 0.5), 0);
    const raw = (sum / moveResults.length) * 100;

    // Soft scale to match common platform feel (90+ is very good)
    return Math.round(Math.pow(raw / 100, 0.6) * 100);
};

/**
 * Heuristic anti-cheat: Checks similarity with top engine choices.
 * @param {Array} moves - Array of { isBestMove, isCritical }
 */
export const detectEngineSimilarity = (moves) => {
    if (moves.length < 10) return 0;

    const bestMovesCount = moves.filter(m => m.isBestMove).length;
    return Math.round((bestMovesCount / moves.length) * 100);
};
