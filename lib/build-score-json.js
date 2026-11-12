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
 * Scores the all-or-nothing groups in activity.scoringGroups (see lib/scoring-groups.js).
 * A group is worth one point per scorable member, as those questions would be ungrouped,
 * and earns all of them only when every scorable member is correct. Unscorable members
 * are skipped, as they are outside groups. A group with no scorable member is worth 0.
 *
 * @returns {Array<{ group: { title: string, members: number[] }, scorable: number[], correct: number[], score: number, maxScore: number }>}
 */
function scoreScoringGroups(activity, results) {
  const list = Array.isArray(results) ? results : [];
  const groups = activity && Array.isArray(activity.scoringGroups) ? activity.scoringGroups : [];
  return groups.map(group => {
    const scorable = group.members.filter(i => list[i] && !isResultUnscorable(activity, list[i], i));
    const correct = scorable.filter(i => evaluateActivityResultCorrect(activity, list[i], i));
    const maxScore = scorable.length;
    const score = maxScore > 0 && correct.length === maxScore ? maxScore : 0;
    return { group, scorable, correct, score, maxScore };
  });
}

/**
 * Unscorable results are left out of breakoutScores: session-server's POST /score
 * rejects any score whose maxScore is not positive, at the top level or in a
 * breakout. They still appear in report.md for the reviewer.
 *
 * Each scoring group is one breakout, titled as written in answer-key.md and placed
 * where its first member would be. A group with no scorable member is left out.
 *
 * When nothing is scorable, the result is 0/0. /score rejects that too, which is
 * intended: the platform then asks a reviewer for a manual score rather than
 * recording one the grader made up.
 *
 * @param {object|null} activity
 * @param {Array<{ text?: string, selected?: string, correct?: string }>} results
 * @returns {{ totalScore: number, maxScore: number, breakoutScores: Array<{ title: string, score: number, maxScore: number }> }}
 */
function buildScoreJson(activity, results) {
  const list = Array.isArray(results) ? results : [];

  const groupScoreByIndex = new Map();
  scoreScoringGroups(activity, list).forEach(groupScore => {
    groupScore.group.members.forEach(i => groupScoreByIndex.set(i, groupScore));
  });

  const breakoutScores = [];
  list.forEach((result, index) => {
    const groupScore = groupScoreByIndex.get(index);
    if (groupScore) {
      if (index === groupScore.group.members[0] && groupScore.maxScore > 0) {
        const { group, score, maxScore } = groupScore;
        breakoutScores.push({ title: group.title, score, maxScore });
      }
      return;
    }
    if (isResultUnscorable(activity, result, index)) return;
    const title = result.text || `Question ${index + 1}`;
    const correct = evaluateActivityResultCorrect(activity, result, index);
    breakoutScores.push({ title, score: correct ? 1 : 0, maxScore: 1 });
  });

  const totalScore = breakoutScores.reduce((sum, q) => sum + q.score, 0);
  const maxScore = breakoutScores.reduce((sum, q) => sum + q.maxScore, 0);

  return { totalScore, maxScore, breakoutScores };
}

module.exports = { buildScoreJson, scoreScoringGroups };
