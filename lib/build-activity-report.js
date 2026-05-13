/**
 * Human-readable markdown report co-locating prompts with learner answers.
 * Written alongside answer.md when POST /api/results succeeds.
 */

const {
  questionIndexFromOrderedResult,
  evaluateActivityResultCorrect,
  isTextInputResultValidateLater,
  countValidateLaterTextInputResults
} = require('./activity-results-validation');

const MAX_PROMPT_CHARS = 600;

function stripHtmlToPlain(html) {
  if (!html) return '';
  let s = String(html).replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > MAX_PROMPT_CHARS) {
    s = `${s.slice(0, MAX_PROMPT_CHARS)}…`;
  }
  return s;
}

function formatSelected(value) {
  const v = value === undefined || value === null ? '' : String(value);
  return v.trim() ? v : '_No answer_';
}

/** Labels from comma-separated MCQ persisted value (letters only). */
function expandMcqLetterParts(labelsCsv) {
  if (!labelsCsv || !String(labelsCsv).trim()) {
    return [];
  }
  return String(labelsCsv)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** List choices so the stem is readable with full option text (letters appear again only in answers). */
function pushMcqOptionsList(lines, q) {
  if (!q || !Array.isArray(q.options) || q.options.length === 0) {
    return;
  }
  const sorted = q.options.slice().sort((a, b) =>
    String(a.label || '').localeCompare(String(b.label || ''))
  );
  lines.push('**Options**');
  lines.push('');
  for (const opt of sorted) {
    const lab = String(opt.label || '').trim() || '?';
    const body =
      stripHtmlToPlain(opt.textHtml) || String(opt.text || '').trim();
    lines.push(body ? `- **${lab}.** ${body}` : `- **${lab}.**`);
  }
  lines.push('');
}

/** Comma-separated letters for Candidate / Correct lines (no duplication with Options). */
function formatMcqLettersForReport(labelsCsv) {
  const parts = expandMcqLetterParts(labelsCsv);
  return parts.length === 0 ? '_No answer_' : parts.join(', ');
}

/** Strip blockquote markers; keep newlines for readable report text. */
function stripFibBlockquoteLines(content) {
  return String(content || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*>\s?/, '').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Full FIB passage with each `[[blank:…]]` replaced by `[Blank 1]`, `[Blank 2]`, …
 * (order follows source markdown).
 */
function fibFullQuestionWithBlankLabels(content) {
  if (!content || !/\[\[blank:[^\]]+\]\]/i.test(content)) return null;
  let n = 0;
  const replaced = content.replace(/\[\[blank:[^\]]+\]\]/gi, () => {
    n += 1;
    return `[Blank ${n}]`;
  });
  return stripFibBlockquoteLines(replaced);
}

function resultStatusLine(activity, result, index) {
  if (isTextInputResultValidateLater(activity, result, index)) {
    return '**Result:** Not scored (submitted for later review)';
  }
  const ok = evaluateActivityResultCorrect(activity, result, index);
  return ok ? '**Result:** Correct' : '**Result:** Incorrect';
}

/**
 * @param {object|null} activity
 * @param {Array<{ text?: string, selected?: string, correct?: string, explanation?: string }>} results
 */
function buildActivityReportMarkdown(activity, results) {
  const lines = [];
  const type = activity && activity.type ? String(activity.type) : 'Unknown';
  const list = Array.isArray(results) ? results : [];

  lines.push('# Activity report');
  lines.push('');
  lines.push(`**Activity type:** ${type}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  const validateLaterCount = countValidateLaterTextInputResults(activity, list);
  const correctCount = list.filter((r, i) => evaluateActivityResultCorrect(activity, r, i)).length;
  const totalCount = Math.max(0, list.length - validateLaterCount);

  lines.push('## Summary');
  lines.push('');
  if (list.length === 0) {
    lines.push('_No responses recorded._');
  } else {
    let scoreLine = `**Score:** ${correctCount} / ${totalCount} correct`;
    if (validateLaterCount > 0) {
      scoreLine += ` (${validateLaterCount} ${validateLaterCount === 1 ? 'response' : 'responses'} not included in score)`;
    }
    lines.push(scoreLine);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  if (list.length === 0) {
    return lines.join('\n');
  }

  if (/^multiple choice$/i.test(type)) {
    lines.push('## Candidate Response');
    lines.push('');
    list.forEach((result, index) => {
      const n = activity.mcq?.questions?.length ?? 0;
      const qi = questionIndexFromOrderedResult(result, index, n);
      const q = activity.mcq?.questions?.[qi];
      const heading = result.text || `Question ${index + 1}`;
      const prompt = stripHtmlToPlain(q?.textHtml) || (q?.text ? String(q.text).trim() : '');
      lines.push(`### ${heading}`);
      lines.push('');
      if (prompt) {
        lines.push(prompt);
        lines.push('');
      }
      pushMcqOptionsList(lines, q);
      lines.push(`- **Candidate's Answer:** ${formatMcqLettersForReport(result.selected)}`);
      lines.push(`- **Correct answer(s):** ${formatMcqLettersForReport(result.correct)}`);
      lines.push(`- ${resultStatusLine(activity, result, index)}`);
      if (result.explanation && String(result.explanation).trim()) {
        lines.push(`- **Your explanation:** ${String(result.explanation).trim()}`);
      }
      lines.push('');
    });
  } else if (/^text input$/i.test(type)) {
    lines.push('## Candidate Response');
    lines.push('');
    list.forEach((result, index) => {
      const n = activity.textInput?.questions?.length ?? 0;
      const qi = questionIndexFromOrderedResult(result, index, n);
      const q = activity.textInput?.questions?.[qi];
      const heading = result.text || `Question ${index + 1}`;
      const prompt = stripHtmlToPlain(q?.textHtml) || (q?.text ? String(q.text).trim() : '');
      lines.push(`### ${heading}`);
      lines.push('');
      if (prompt) {
        lines.push(prompt);
        lines.push('');
      }
      lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
      lines.push(`- **Accepted answer(s):** ${formatSelected(result.correct)}`);
      lines.push(`- ${resultStatusLine(activity, result, index)}`);
      lines.push('');
    });
  } else if (/^matrix$/i.test(type)) {
    lines.push('## Candidate Response');
    lines.push('');
    const matrixHeadingMeta = activity.matrix?.heading;
    if (matrixHeadingMeta) {
      const headerPlain =
        stripHtmlToPlain(matrixHeadingMeta.html) ||
        String(matrixHeadingMeta.markdown || '').trim();
      if (headerPlain) {
        lines.push('### Heading');
        lines.push('');
        lines.push(headerPlain);
        lines.push('');
      }
    }
    const matrixQuestionPrompt =
      activity && activity.question
        ? activity.questionHtml
          ? stripHtmlToPlain(activity.questionHtml)
          : String(activity.question).trim()
        : '';
    if (matrixQuestionPrompt) {
      lines.push('### Question');
      lines.push('');
      lines.push(matrixQuestionPrompt);
      lines.push('');
    }
    const rows = activity.matrix?.rows || [];
    list.forEach((result, index) => {
      const rowLabel =
        rows[index] !== undefined
          ? String(rows[index])
          : result.text || `Row ${index + 1}`;
      lines.push(`### ${rowLabel}`);
      lines.push('');
      lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
      lines.push(`- **Expected Column:** ${formatSelected(result.correct)}`);
      lines.push(`- ${resultStatusLine(activity, result, index)}`);
      if (result.explanation && String(result.explanation).trim() && index === 0) {
        lines.push(`- **Your explanation:** ${String(result.explanation).trim()}`);
      }
      lines.push('');
    });
  } else if (/^fill in the blanks$/i.test(type)) {
    lines.push('## Candidate Response');
    lines.push('');
    const prompt = activity.fib?.prompt
      ? stripHtmlToPlain(activity.fib.promptHtml) || String(activity.fib.prompt).trim()
      : '';
    if (prompt) {
      lines.push('### Passage');
      lines.push('');
      lines.push(prompt);
      lines.push('');
    }
    const questionLabeled = fibFullQuestionWithBlankLabels(activity.fib?.content || '');
    if (questionLabeled) {
      lines.push('### Question');
      lines.push('');
      lines.push(questionLabeled);
      lines.push('');
    }
    list.forEach((result, index) => {
      lines.push(`### ${result.text || `Blank ${index + 1}`}`);
      lines.push('');
      lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
      lines.push(`- **Expected Answer:** ${formatSelected(result.correct)}`);
      lines.push(`- ${resultStatusLine(activity, result, index)}`);
      lines.push('');
    });
  } else if (/^matching$/i.test(type)) {
    lines.push('## Candidate Response');
    lines.push('');
    const items = activity.matching?.items || [];
    list.forEach((result, index) => {
      const item = items[index];
      const short = item
        ? stripHtmlToPlain(item.textHtml) || String(item.text || '').trim()
        : '';
      const heading = result.text || `Item ${index + 1}`;
      lines.push(`### ${heading}`);
      lines.push('');
      if (short) {
        lines.push(short);
        lines.push('');
      }
      lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
      lines.push(`- **Expected match:** ${formatSelected(result.correct)}`);
      lines.push(`- ${resultStatusLine(activity, result, index)}`);
      lines.push('');
    });
  } else {
    lines.push('## Candidate Response');
    lines.push('');
    if (/^sort into boxes$/i.test(type)) {
      lines.push(
        '_Sort-into-boxes: when this activity records responses, each choice will be listed below._'
      );
      lines.push('');
    }
    const pq =
      activity && activity.question
        ? (activity.questionHtml
          ? stripHtmlToPlain(activity.questionHtml)
          : String(activity.question).trim())
        : '';
    list.forEach((result, index) => {
      lines.push(`### ${result.text || `Item ${index + 1}`}`);
      lines.push('');
      if (pq && index === 0) {
        lines.push(pq);
        lines.push('');
      }
      lines.push(`- **Candidate's Answer:** ${formatSelected(result.selected)}`);
      lines.push(`- **Expected:** ${formatSelected(result.correct)}`);
      lines.push(`- ${resultStatusLine(activity, result, index)}`);
      lines.push('');
    });
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

module.exports = {
  buildActivityReportMarkdown,
  stripHtmlToPlain,
  fibFullQuestionWithBlankLabels,
  stripFibBlockquoteLines
};
