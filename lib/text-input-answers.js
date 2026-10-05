/**
 * Reads Text Input answers back from the __Responses__ section of data/answer.md.
 *
 * Each response is written as:
 *   1. **Question name**
 *      - Selected Answer: <answer, which may span several lines>
 *      - Correct Answer: <...>
 *
 * The answer runs up to the "- Correct Answer:" line that always follows it, so
 * multi-line and repeatable answers come back whole instead of only their first line.
 */
const TEXT_INPUT_RESPONSE_REGEX =
  /(\d+)\.\s*\*\*[^*]+\*\*[\s\S]*?Selected Answer:[ \t]*([\s\S]*?)\n[ \t]*- Correct Answer:/g;

function parseTextInputAnswers(responsesText) {
  const answers = {};
  const regex = new RegExp(TEXT_INPUT_RESPONSE_REGEX.source, 'g');
  let match;
  while ((match = regex.exec(responsesText)) !== null) {
    const questionIndex = parseInt(match[1], 10) - 1;
    const selectedAnswer = match[2].trim();
    if (selectedAnswer && selectedAnswer !== 'No answer selected') {
      answers[questionIndex] = selectedAnswer;
    }
  }
  return answers;
}

module.exports = { parseTextInputAnswers };
