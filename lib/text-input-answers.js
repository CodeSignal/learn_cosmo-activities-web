/**
 * Reads Text Input answers back from the __Responses__ section of data/answer.md.
 *
 * Each response is written as:
 *   1. **Question name**
 *      - Selected Answer: <answer, which may span several lines>
 *      - Correct Answer: <...>
 *      - Result: <...>
 *
 * A response starts at a "N. **name**" line that is immediately followed by its
 * "- Selected Answer:" line, and runs to the next such header. Within it, the answer
 * ends at the last "- Correct Answer:" line, so learner text that happens to contain
 * a "- Correct Answer:" line is kept instead of cutting the answer short.
 */
const RESPONSE_HEADER_REGEX = /^(\d+)\.\s*\*\*[^*\n]+\*\*[ \t]*\r?\n[ \t]*- Selected Answer:[ \t]?/gm;
const CORRECT_ANSWER_LINE_REGEX = /\r?\n[ \t]*- Correct Answer:/g;

function lastMatchIndex(regex, text) {
  let index = -1;
  const pattern = new RegExp(regex.source, 'g');
  let match;
  while ((match = pattern.exec(text)) !== null) {
    index = match.index;
  }
  return index;
}

function parseTextInputAnswers(responsesText) {
  const headers = [...String(responsesText || '').matchAll(new RegExp(RESPONSE_HEADER_REGEX.source, 'gm'))];
  const answers = {};
  headers.forEach((header, i) => {
    const start = header.index + header[0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index : responsesText.length;
    const block = responsesText.slice(start, end);
    const cut = lastMatchIndex(CORRECT_ANSWER_LINE_REGEX, block);
    const selectedAnswer = (cut >= 0 ? block.slice(0, cut) : block).trim();
    if (selectedAnswer && selectedAnswer !== 'No answer selected') {
      answers[parseInt(header[1], 10) - 1] = selectedAnswer;
    }
  });
  return answers;
}

module.exports = { parseTextInputAnswers };
