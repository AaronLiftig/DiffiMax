/**
 * DiffiMax
 *
 * Minimax-based search with opponent-response analysis.
 *
 * Evaluations are from YOUR perspective:
 *   positive = good for you
 *   negative = good for opponent
 */

export const DEFAULT_CONFIG = {
    responseScope: 2,              // 2, 3, 4, 5, or "all"
    reasonablePlayerDip: 2.0,
    trapDipThreshold: 1.0,
    minimumMeaningfulResponses: 2,
    excludeChecks: true,
    excludeCaptures: true
};


/**
 * Run DiffiMax.
 *
 * @param {Object} root Search tree root
 * @param {Object} options Configuration
 * @returns {Object} Search result
 */
export function analyzeDiffiMax(root, options = {}) {
    const config = {
        ...DEFAULT_CONFIG,
        ...options
    };

    const traps = [];

    const evaluation = search(root, config, traps);

    return {
        evaluation,
        traps
    };
}


/**
 * Recursively search the tree.
 *
 * The important distinction from ordinary minimax is that
 * opponent nodes perform additional response analysis.
 */
function search(node, config, traps) {
    if (!node.children || node.children.length === 0) {
        return node.value ?? 0;
    }

    for (const child of node.children) {
        child.value = search(child, config, traps);
    }

    if (node.player === node.yourPlayer) {
        return chooseBestForYou(
            node.children,
            node.yourPlayer
        ).value;
    }

    return analyzeOpponentNode(node, config, traps);
}


/**
 * Analyze an opponent decision.
 */
function analyzeOpponentNode(node, config, traps) {
    const responses = getMeaningfulResponses(node, config);

    if (responses.length < config.minimumMeaningfulResponses) {
        return chooseBestForOpponent(
            node.children,
            node.yourPlayer
        ).value;
    }

    const ordered = [...responses].sort((a, b) => {
        return opponentScore(a.value, node.yourPlayer)
             - opponentScore(b.value, node.yourPlayer);
    });

    const best = ordered[0];

    const considered = selectResponses(
        ordered,
        config.responseScope
    );

    const trap = findTrap(
        best,
        considered,
        config
    );

    if (trap) {
        const record = {
            node,
            bestResponse: best,
            trapResponse: trap.response,
            bestEvaluation: best.value,
            trapEvaluation: trap.response.value,
            evaluationDip: trap.dip,
            responseCount: responses.length,
            consideredResponses: considered,
            responseScope: config.responseScope
        };

        traps.push(record);

        /*
         * DiffiMax follows the trap response for this branch.
         *
         * The overall search does not terminate here.
         */
        return trap.response.value;
    }

    /*
     * No trap at this node.
     *
     * Continue with ordinary minimax.
     */
    return best.value;
}


/**
 * Remove responses that should not participate in trap analysis.
 *
 * This prevents forced tactical moves from being treated as
 * ordinary "mistakes".
 */
function getMeaningfulResponses(node, config) {
    return node.children.filter(child => {
        if (config.excludeChecks) {
            if (node.isCheck || child.isCheck) {
                return false;
            }
        }

        if (config.excludeCaptures) {
            if (node.isCapture || child.isCapture) {
                return false;
            }

            if (child.isCapture) {
                return false;
            }
        }

        return true;
    });
}


/**
 * Select the requested response scope.
 */
function selectResponses(responses, scope) {
    if (scope === "all") {
        return [...responses];
    }

    const k = Number(scope);

    if (![2, 3, 4, 5].includes(k)) {
        throw new Error(
            'responseScope must be 2, 3, 4, 5, or "all".'
        );
    }

    return responses.slice(0, k);
}


/**
 * Find a response that:
 *
 *   1. Is within the reasonable-player range.
 *   2. Has at least the required trap dip.
 */
function findTrap(best, responses, config) {
    const candidates = [];

    for (const response of responses) {
        if (response === best) {
            continue;
        }

        const dip = response.value - best.value;

        const isReasonable =
            dip <= config.reasonablePlayerDip;

        const isLargeEnough =
            dip >= config.trapDipThreshold;

        if (isReasonable && isLargeEnough) {
            candidates.push({
                response,
                dip
            });
        }
    }

    if (candidates.length === 0) {
        return null;
    }

    /*
     * The largest meaningful dip is the strongest trap candidate.
     */
    candidates.sort((a, b) => b.dip - a.dip);

    return candidates[0];
}


/**
 * Choose the best move for us.
 *
 * Evaluations are from our perspective.
 */
function chooseBestForYou(children, yourPlayer) {
    return children.reduce((best, child) => {
        if (yourPlayer === 1) {
            return child.value > best.value
                ? child
                : best;
        }

        return child.value < best.value
            ? child
            : best;
    });
}


/**
 * Choose the best move for the opponent.
 */
function chooseBestForOpponent(children, yourPlayer) {
    return children.reduce((best, child) => {
        if (yourPlayer === 1) {
            return child.value < best.value
                ? child
                : best;
        }

        return child.value > best.value
            ? child
            : best;
    });
}


/**
 * Score from the opponent's perspective.
 *
 * Our evaluations:
 *
 *   + = good for us
 *   - = good for opponent
 *
 * Therefore the opponent wants the lowest value when
 * we are White and the highest value when we are Black.
 */
function opponentScore(value, yourPlayer) {
    return yourPlayer === 1
        ? value
        : -value;
}