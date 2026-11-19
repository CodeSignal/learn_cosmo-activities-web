/**
 * answer.md stores MCQ answers as option text: learners see shuffled display
 * letters, never the authored A/B/C/D. Grading and reload still work in label space.
 */

function mcqOptionText(opt) {
  return String(opt?.text || '').replace(/\s+/g, ' ').trim();
}

function mcqOptions(question) {
  return Array.isArray(question?.options) ? question.options : [];
}

/** One line per label in `labelsCsv` ("A, C"), not a comma list: option text can contain commas. */
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

/** Each value is an option's text or, in older answer.md files, a comma-separated list of labels. */
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
