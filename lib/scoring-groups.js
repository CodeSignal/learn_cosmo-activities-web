/**
 * All-or-nothing scoring groups, read from the __Scoring Groups__ section of
 * answer-key.md (grader-only, never sent to the browser):
 *
 *   __Scoring Groups__
 *
 *   - Questions 1-3
 *   - Question 5, Question 7
 *
 * Each list item is one group. Its members are questions (Multiple Choice, Text Input)
 * or rows (Matrix), numbered from 1 in the order of question.md: `Question 2`, a range
 * such as `Questions 1-3`, or several of these separated by commas. A member can be in
 * one group only. Questions in no group are scored on their own, as before.
 *
 * build-score-json.js turns each group into one breakout.
 */

const MEMBER_NOUNS = [
  { type: /^multiple choice$/i, noun: 'Question', count: a => a.mcq?.questions?.length },
  { type: /^text input$/i, noun: 'Question', count: a => a.textInput?.questions?.length },
  { type: /^matrix$/i, noun: 'Row', count: a => a.matrix?.rows?.length }
];

function memberNounFor(activity) {
  const type = String(activity?.type || '').trim();
  return MEMBER_NOUNS.find(entry => entry.type.test(type)) || null;
}

/**
 * @param {string[]} items list items of the __Scoring Groups__ section
 * @param {object} activity parsed question.md
 * @returns {Array<{ title: string, members: number[] }>} members are 0-based result indices
 * @throws when a group names a member the activity does not have, or names one twice
 */
function parseScoringGroups(items, activity) {
  const lines = (items || []).map(item => String(item).trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const entry = memberNounFor(activity);
  if (!entry) {
    throw new Error(
      `__Scoring Groups__ works with Text Input, Multiple Choice and Matrix, not ${activity?.type || 'this activity'}`
    );
  }
  const { noun } = entry;
  const count = entry.count(activity) || 0;
  const memberPattern = new RegExp(`^${noun}s?\\s+(\\d+)(?:\\s*[-–]\\s*(\\d+))?$`, 'i');
  const seen = new Set();

  return lines.map(title => {
    const members = [];
    const parts = title.split(',').map(part => part.trim()).filter(Boolean);
    if (parts.length === 0) {
      throw new Error(`Scoring group "${title}" lists no ${noun.toLowerCase()}s`);
    }
    for (const part of parts) {
      const match = part.match(memberPattern);
      if (!match) {
        throw new Error(
          `Scoring group "${title}": cannot read "${part}". Write "${noun} 2" or "${noun}s 1-3".`
        );
      }
      const from = parseInt(match[1], 10);
      const to = match[2] === undefined ? from : parseInt(match[2], 10);
      if (from > to) {
        throw new Error(`Scoring group "${title}": "${part}" counts down; write the smaller number first`);
      }
      if (from < 1 || to > count) {
        throw new Error(
          `Scoring group "${title}": "${part}" is outside ${noun.toLowerCase()}s 1-${count}`
        );
      }
      for (let n = from; n <= to; n++) {
        if (seen.has(n)) {
          throw new Error(`Scoring group "${title}": ${noun} ${n} is already in a group`);
        }
        seen.add(n);
        members.push(n - 1);
      }
    }
    members.sort((a, b) => a - b);
    return { title, members };
  });
}

/** "question" or "row", for report wording; null for activity types without groups. */
function scoringGroupMemberNoun(activity) {
  const entry = memberNounFor(activity);
  return entry ? entry.noun.toLowerCase() : null;
}

module.exports = { parseScoringGroups, scoringGroupMemberNoun };
