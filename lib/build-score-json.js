/**
 * Builds a score summary JSON object from activity results.
 */

const {
  evaluateActivityResultCorrect,
  isTextInputResultValidateLater
} = require('./activity-results-validation');

/**
 * A result is unscorable if it's a validate-later text input question,
 * or if it has no correct answer defined (e.g. explain-your-answer style).
 */
function isResultUnscorable(activity, result, index) {
  if (isTextInputResultValidateLater(activity, result, index)) return true;
  if (!result.correct || String(result.correct).trim() === '') return true;
  return false;
}

/**
 * @param {object|null} activity
 * @param {Array<{ text?: string, selected?: string, correct?: string }>} results
 * @returns {{ totalScore: number, maxScore: number, breakoutScores: Array<{ title: string, score: number, maxScore: number }> }}
 */
function buildScoreJson(activity, results) {
  const list = Array.isArray(results) ? results : [];

  const breakoutScores = list.map((result, index) => {
    const title = result.text || `Question ${index + 1}`;
    if (isResultUnscorable(activity, result, index)) {
      return { title, score: 0, maxScore: 0 };
    }
    const correct = evaluateActivityResultCorrect(activity, result, index);
    return { title, score: correct ? 1 : 0, maxScore: 1 };
  });

  const totalScore = breakoutScores.reduce((sum, q) => sum + q.score, 0);
  const maxScore = breakoutScores.reduce((sum, q) => sum + q.maxScore, 0);

  return { totalScore, maxScore, breakoutScores };
}

module.exports = { buildScoreJson };
