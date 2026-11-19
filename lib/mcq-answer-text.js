/**
 * MCQ answers in answer.md are written as option text, never as A/B/C/D: learners
 * never see the letters, and options are shuffled. Reload and grading still work in
 * letter space, so they map the text back with mcqLabelsFromAnswerValues.
 */

function mcqOptionText(opt) {
  return String(opt?.text || '').replace(/\s+/g, ' ').trim();
}

function mcqOptions(question) {
  return Array.isArray(question?.options) ? question.options : [];
}

/**
 * One line per option (never a comma list, since option text can contain commas).
 *
 * @param {object|undefined} question MCQ question with `options: [{ label, text }]`
 * @param {string} labelsCsv persisted labels, e.g. "A, C"
 * @param {string} title line title, e.g. "Selected Answer"
 * @param {string} indent detail-line indent for this response
 * @param {string} emptyText value written when there are no labels
 */
function mcqAnswerLines(question, labelsCsv, title, indent, emptyText) {
  const labels = String(labelsCsv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (labels.length === 0) {
    return `${indent}- ${title}: ${emptyText}\n`;
  }
  const options = mcqOptions(question);
  return labels
    .map((label) => {
      const opt = options.find((o) => String(o.label || '').trim() === label);
      return `${indent}- ${title}: ${mcqOptionText(opt) || label}\n`;
    })
    .join('');
}

/**
 * Maps parsed "Selected Answer" values back to option labels. Each value is an
 * option's text, or, in answer.md files written before option text was used, a
 * comma-separated list of labels.
 *
 * @param {object|undefined} question
 * @param {string[]|undefined} values
 * @returns {string[]} labels in the order they were written
 */
function mcqLabelsFromAnswerValues(question, values) {
  const options = mcqOptions(question);
  const labels = new Set(options.map((o) => String(o.label || '').trim()));
  const result = [];
  for (const value of values || []) {
    const v = String(value).trim();
    const byText = options.find((o) => mcqOptionText(o) === v);
    if (byText) {
      result.push(String(byText.label).trim());
      continue;
    }
    const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0 && parts.every((p) => labels.has(p))) {
      result.push(...parts);
    }
  }
  return result;
}

module.exports = { mcqOptionText, mcqAnswerLines, mcqLabelsFromAnswerValues };
