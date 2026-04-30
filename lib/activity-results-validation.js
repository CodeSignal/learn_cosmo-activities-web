/**
 * Result-row scoring used by POST /api/results and mirrored by client modules
 * where applicable (e.g. MCQ uses the same multi-select rules).
 */

const { validateTextInputAnswer } = require('./text-input-validation');

/** Client posts one result per question in order; label may be a custom name or legacy "Question N". */
function questionIndexFromOrderedResult(result, resultIndex, numQuestions) {
  const n = numQuestions | 0;
  if (typeof resultIndex === 'number' && resultIndex >= 0 && resultIndex < n) return resultIndex;
  const m = /^Question\s+(\d+)\s*$/i.exec(String(result?.text || '').trim());
  if (m) {
    const i = parseInt(m[1], 10) - 1;
    if (i >= 0 && i < n) return i;
  }
  return -1;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

function parseCommaSeparatedLabels(str) {
  return String(str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * @param {string[]} selectedLabels
 * @param {string[]} correctLabels
 * @param {{ isMultiSelect?: boolean, multiSelectMode?: string } | null} question
 */
function evaluateMcqSelection(selectedLabels, correctLabels, question) {
  const selected = selectedLabels.map(String);
  const correct = correctLabels.map(String);
  if (question && question.isMultiSelect && question.multiSelectMode === 'any') {
    const hasCorrectAnswer = selected.some(sel => correct.includes(sel));
    const hasIncorrectAnswer = selected.some(sel => !correct.includes(sel));
    return hasCorrectAnswer && !hasIncorrectAnswer && selected.length > 0;
  }
  return arraysEqual([...selected].sort(), [...correct].sort());
}

function evaluateMatrixResult(selected, correct) {
  const sel = String(selected || '').trim();
  const cor = String(correct || '').trim();
  return Boolean(sel) && sel === cor;
}

function evaluateExactMatchResult(selected, correct) {
  return selected === correct;
}

/**
 * Whether this result row counts as correct for summary scoring.
 * @param {object} activity
 * @param {{ text?: string, selected?: string, correct?: string }} result
 * @param {number} resultIndex
 */
function evaluateActivityResultCorrect(activity, result, resultIndex) {
  if (!activity || !activity.type) {
    return evaluateExactMatchResult(result?.selected, result?.correct);
  }

  const type = String(activity.type);

  if (/^multiple choice$/i.test(type)) {
    const n = activity.mcq?.questions?.length ?? 0;
    const questionIndex = questionIndexFromOrderedResult(result, resultIndex, n);
    const question = activity.mcq?.questions?.[questionIndex];
    const selected = parseCommaSeparatedLabels(result.selected);
    const correct = parseCommaSeparatedLabels(result.correct);
    if (question) {
      return evaluateMcqSelection(selected, correct, question);
    }
    const selectedSorted = [...selected].sort().join(', ');
    const correctSorted = [...correct].sort().join(', ');
    return selectedSorted === correctSorted;
  }

  if (/^text input$/i.test(type)) {
    const n = activity.textInput?.questions?.length ?? 0;
    const questionIndex = questionIndexFromOrderedResult(result, resultIndex, n);
    const question = activity.textInput?.questions?.[questionIndex];
    if (question) {
      return validateTextInputAnswer(question, result.selected) === true;
    }
    return evaluateExactMatchResult(result.selected, result.correct);
  }

  if (/^matrix$/i.test(type)) {
    return evaluateMatrixResult(result.selected, result.correct);
  }

  return evaluateExactMatchResult(result.selected, result.correct);
}

function isTextInputResultValidateLater(activity, result, resultIndex) {
  if (!activity || !/^text input$/i.test(activity.type)) return false;
  const n = activity.textInput?.questions?.length ?? 0;
  const questionIndex = questionIndexFromOrderedResult(result, resultIndex, n);
  const question = activity.textInput?.questions?.[questionIndex];
  return Boolean(question && question.validation && question.validation.kind === 'validate-later');
}

function countValidateLaterTextInputResults(activity, results) {
  if (!activity || !/^text input$/i.test(activity.type) || !Array.isArray(results)) return 0;
  return results.filter((r, i) => isTextInputResultValidateLater(activity, r, i)).length;
}

module.exports = {
  questionIndexFromOrderedResult,
  arraysEqual,
  parseCommaSeparatedLabels,
  evaluateMcqSelection,
  evaluateMatrixResult,
  evaluateExactMatchResult,
  evaluateActivityResultCorrect,
  isTextInputResultValidateLater,
  countValidateLaterTextInputResults
};
