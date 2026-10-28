/**
 * Split combined (practice) activity markdown into a stripped question.md and
 * a companion answer-key.md, and merge those files back for the editor.
 */

const { Lexer } = require('marked');
const {
  parseSectionsFromTokens,
  extractQuestionTypeFromMarkdown,
  readListItems,
} = require('./parse-question');
const { parseSortItemEntry, escapeSortItemText } = require('./sort-item-entry');

function blankPattern() {
  return /\[\[blank(?::([^\]]*))?\]\]/gi;
}

function parseSectionBlocks(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const blocks = [];
  let current = { name: null, lines: [] };
  for (const line of lines) {
    const m = line.match(/^__([^_]+)__\s*$/);
    if (m) {
      blocks.push(current);
      current = { name: m[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  blocks.push(current);
  return blocks;
}

function serializeSectionBlocks(blocks) {
  const chunks = [];
  for (const block of blocks) {
    if (block.name == null) {
      const preamble = (block.lines || []).join('\n').trim();
      if (preamble) chunks.push(preamble);
      continue;
    }
    const body = (block.lines || []).join('\n').trim();
    chunks.push(body ? `__${block.name}__\n\n${body}` : `__${block.name}__`);
  }
  let out = chunks.join('\n\n');
  if (out && !out.endsWith('\n')) out += '\n';
  return out;
}

function sectionBody(block) {
  return (block && block.lines ? block.lines : []).join('\n');
}

function listItemsFromBlock(block) {
  return (block.lines || [])
    .map(line => {
      const m = String(line).match(/^\s*[-*]\s+(.*)$/);
      return m ? m[1].trim() : null;
    })
    .filter(item => item !== null);
}

function replaceListItems(block, items) {
  const lines = block.lines || [];
  const leading = [];
  const trailing = [];
  let seenItem = false;
  for (const line of lines) {
    if (/^\s*[-*]\s+/.test(line)) {
      seenItem = true;
    } else if (!seenItem) {
      leading.push(line);
    } else {
      trailing.push(line);
    }
  }
  const itemLines = items.map(item => `- ${item}`);
  if (!seenItem && itemLines.length > 0 && leading.length === 0 && trailing.length === 0) {
    block.lines = ['', ...itemLines, ''];
    return;
  }
  block.lines = [...leading, ...itemLines, ...trailing];
}

function formatAnswerKeyMarkdown(type, entries) {
  const lines = ['__Type__', '', String(type || '').trim(), '', '__Answer Key__', ''];
  for (const { key, value } of entries) {
    if (!key) continue;
    const suffix = value == null || value === '' ? '' : ` ${value}`;
    lines.push(`- ${key}:${suffix}`);
  }
  lines.push('');
  return lines.join('\n');
}

function parseAnswerKey(markdown) {
  const tokens = Lexer.lex(String(markdown || ''));
  const sections = parseSectionsFromTokens(tokens);
  const type = ((sections.get('Type') || []).map(t => t.raw || t.text).join('\n') || '').trim();
  const keyItems = readListItems(sections.get('Answer Key'));
  const answers = keyItems.map(item => {
    const { text, correct, sepFound } = parseSortItemEntry(item);
    if (!sepFound) {
      throw new Error('Answer key entry is missing a separator');
    }
    return { key: text, value: correct };
  });
  return { type, answers };
}

function answersGroupedByNumber(answers, pattern) {
  const map = new Map();
  for (const { key, value } of answers) {
    const m = String(key || '').match(pattern);
    if (!m) continue;
    const idx = parseInt(m[1], 10) - 1;
    if (!map.has(idx)) map.set(idx, []);
    map.get(idx).push(value);
  }
  return map;
}

function extractBracketAnnotations(line) {
  const parts = [];
  const kind = String(line).match(/\[kind:\s*[^\]]*\]/i);
  const options = String(line).match(/\[options:\s*[^\]]*\]/i);
  if (kind) parts.push(kind[0]);
  if (options) parts.push(options[0]);
  return parts.join(' ');
}

function collectBlanks(text, answersOut) {
  return String(text || '').replace(blankPattern(), (_, token) => {
    const answer = token != null ? String(token).trim() : '';
    answersOut.push(answer);
    return '[[blank]]';
  });
}

function fillBlanks(text, answers) {
  let i = 0;
  return String(text || '').replace(blankPattern(), () => {
    const answer = answers[i++];
    if (answer == null || answer === '') return '[[blank]]';
    return `[[blank:${answer}]]`;
  });
}

function parseSwipeLabels(block) {
  let left = 'Left';
  let right = 'Right';
  for (const item of listItemsFromBlock(block || { lines: [] })) {
    const { text, correct } = parseSortItemEntry(item);
    const name = text.toLowerCase();
    if (name.includes('left')) left = correct || left;
    if (name.includes('right')) right = correct || right;
  }
  return { left, right };
}

function isName(block, name) {
  return block && typeof block.name === 'string' && block.name.toLowerCase() === name.toLowerCase();
}

function stripMcqCorrectMarker(item) {
  const trimmed = String(item || '').trim();
  const match = trimmed.match(/^([A-Z])\s*(?:-?\s*(?:Correct)?)?$/i);
  return match ? match[1].toUpperCase() : trimmed;
}

function mcqCorrectLabels(items) {
  const labels = [];
  for (const item of items) {
    const trimmed = String(item || '').trim();
    const match = trimmed.match(/^([A-Z])\s*(?:-?\s*(?:Correct)?)?$/i);
    if (match && trimmed.toLowerCase().includes('correct')) {
      labels.push(match[1].toUpperCase());
    }
  }
  return labels;
}

function ensureMcqMultiSelect(blocks, suggestedIndex) {
  const prev = blocks[suggestedIndex - 1];
  if (prev && isName(prev, 'Question Options')) {
    const body = sectionBody(prev);
    if (!/multi-select/i.test(body)) {
      const lines = prev.lines.slice();
      const insertAt = lines.findIndex(line => line.trim());
      if (insertAt === -1) {
        prev.lines = ['', 'multi-select', ''];
      } else {
        lines.splice(insertAt, 0, 'multi-select');
        prev.lines = lines;
      }
    }
    return;
  }
  blocks.splice(suggestedIndex, 0, { name: 'Question Options', lines: ['', 'multi-select', ''] });
}

function splitTextInput(blocks) {
  const entries = [];
  let questionIndex = 0;
  for (const block of blocks) {
    if (!isName(block, 'Correct Answers') && !isName(block, 'Suggested Answers')) continue;
    questionIndex += 1;
    const items = listItemsFromBlock(block);
    const stripped = [];
    for (const item of items) {
      entries.push({ key: `Question ${questionIndex}`, value: item });
      const annotations = extractBracketAnnotations(item);
      if (annotations) stripped.push(annotations);
    }
    replaceListItems(block, stripped);
  }
  return entries;
}

function mergeTextInput(blocks, answers) {
  const byQuestion = answersGroupedByNumber(answers, /^Question\s+(\d+)$/i);
  let questionIndex = 0;
  for (const block of blocks) {
    if (!isName(block, 'Correct Answers') && !isName(block, 'Suggested Answers')) continue;
    const values = byQuestion.get(questionIndex) || [];
    questionIndex += 1;
    if (!values.some(Boolean)) continue;
    replaceListItems(block, values);
  }
}

function splitMcq(blocks) {
  const entries = [];
  let questionIndex = 0;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isName(block, 'Suggested Answers')) continue;
    questionIndex += 1;
    const items = listItemsFromBlock(block);
    const correct = mcqCorrectLabels(items);
    if (correct.length > 0) {
      entries.push({ key: `Question ${questionIndex}`, value: correct.join(', ') });
    }
    replaceListItems(block, items.map(stripMcqCorrectMarker));
    if (correct.length > 1) {
      ensureMcqMultiSelect(blocks, i);
      i = blocks.indexOf(block);
    }
  }
  return entries;
}

function mergeMcq(blocks, answers) {
  const byQuestion = answersGroupedByNumber(answers, /^Question\s+(\d+)$/i);
  let questionIndex = 0;
  for (const block of blocks) {
    if (!isName(block, 'Suggested Answers')) continue;
    const values = byQuestion.get(questionIndex) || [];
    questionIndex += 1;
    const correct = new Set();
    values.forEach(value => {
      String(value || '')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean)
        .forEach(label => correct.add(label));
    });
    const items = listItemsFromBlock(block).map(stripMcqCorrectMarker);
    const marked = items.map(label => (correct.has(label.toUpperCase()) ? `${label} - Correct` : label));
    replaceListItems(block, marked);
  }
}

function splitFibOrMatching(blocks, keyPrefix) {
  const entries = [];
  let index = 0;
  for (const block of blocks) {
    if (!isName(block, 'Markdown With Blanks')) continue;
    const collected = [];
    const stripped = collectBlanks(sectionBody(block), collected);
    collected.forEach(answer => {
      index += 1;
      if (answer) entries.push({ key: `${keyPrefix} ${index}`, value: answer });
    });
    block.lines = stripped.split('\n');
  }
  return entries;
}

function mergeFibOrMatching(blocks, answers, pattern) {
  const byIndex = answersGroupedByNumber(answers, pattern);
  let index = 0;
  for (const block of blocks) {
    if (!isName(block, 'Markdown With Blanks')) continue;
    const ordered = [];
    String(sectionBody(block)).replace(blankPattern(), () => {
      const values = byIndex.get(index) || [];
      ordered.push(values[0] || '');
      index += 1;
      return '';
    });
    block.lines = fillBlanks(sectionBody(block), ordered).split('\n');
  }
}

function splitMatrix(blocks) {
  const entries = [];
  const next = [];
  for (const block of blocks) {
    if (isName(block, 'Suggested Answers')) {
      for (const item of listItemsFromBlock(block)) {
        const { text, correct } = parseSortItemEntry(item);
        if (text) entries.push({ key: text, value: correct });
      }
      continue;
    }
    next.push(block);
  }
  blocks.length = 0;
  blocks.push(...next);
  return entries;
}

function mergeMatrix(blocks, answers) {
  if (blocks.some(block => isName(block, 'Suggested Answers'))) {
    const existing = blocks.find(block => isName(block, 'Suggested Answers'));
    replaceListItems(
      existing,
      answers.filter(a => a.key).map(a => `${a.key}: ${a.value}`)
    );
    return;
  }
  const rowsBlock = blocks.find(block => isName(block, 'Matrix Rows'));
  const insertAt = rowsBlock ? blocks.indexOf(rowsBlock) + 1 : blocks.length;
  const items = answers.filter(a => a.key).map(a => `${a.key}: ${a.value}`);
  blocks.splice(insertAt, 0, {
    name: 'Suggested Answers',
    lines: ['', ...items.map(item => `- ${item}`), '']
  });
}

function splitSort(blocks) {
  const entries = [];
  for (const block of blocks) {
    if (!isName(block, 'Items')) continue;
    const stripped = [];
    for (const item of listItemsFromBlock(block)) {
      const { text, correct } = parseSortItemEntry(item);
      if (!text) continue;
      const escaped = escapeSortItemText(text);
      stripped.push(escaped);
      if (correct) entries.push({ key: escaped, value: correct });
    }
    replaceListItems(block, stripped);
  }
  return entries;
}

function mergeSort(blocks, answers) {
  const byText = new Map(answers.map(a => [a.key, a.value]));
  for (const block of blocks) {
    if (!isName(block, 'Items')) continue;
    const merged = listItemsFromBlock(block).map(item => {
      const { text } = parseSortItemEntry(item);
      const correct = byText.get(text);
      const escaped = escapeSortItemText(text);
      return correct ? `${escaped}: ${correct}` : escaped;
    });
    replaceListItems(block, merged);
  }
}

function splitSwipe(blocks) {
  const labelsBlock = blocks.find(block => isName(block, 'Labels'));
  const { left, right } = parseSwipeLabels(labelsBlock);
  const leftBlock = blocks.find(block => isName(block, 'Left Label Items'));
  const rightBlock = blocks.find(block => isName(block, 'Right Label Items'));
  if (!leftBlock && !rightBlock) return [];

  const leftItems = leftBlock ? listItemsFromBlock(leftBlock) : [];
  const rightItems = rightBlock ? listItemsFromBlock(rightBlock) : [];
  const entries = [
    ...leftItems.map(text => ({ key: text, value: left })),
    ...rightItems.map(text => ({ key: text, value: right }))
  ];
  const allItems = [...leftItems, ...rightItems];

  const next = [];
  let inserted = false;
  for (const block of blocks) {
    if (isName(block, 'Left Label Items') || isName(block, 'Right Label Items')) {
      if (!inserted) {
        next.push({
          name: 'Items',
          lines: ['', ...allItems.map(item => `- ${item}`), '']
        });
        inserted = true;
      }
      continue;
    }
    next.push(block);
  }
  blocks.length = 0;
  blocks.push(...next);
  return entries;
}

function mergeSwipe(blocks, answers) {
  const labelsBlock = blocks.find(block => isName(block, 'Labels'));
  const { left, right } = parseSwipeLabels(labelsBlock);
  const itemsBlock = blocks.find(block => isName(block, 'Items'));
  const leftBlock = blocks.find(block => isName(block, 'Left Label Items'));
  const rightBlock = blocks.find(block => isName(block, 'Right Label Items'));
  if (!itemsBlock || leftBlock || rightBlock) return;

  const byText = new Map(answers.map(a => [a.key, a.value]));
  const leftItems = [];
  const rightItems = [];
  for (const text of listItemsFromBlock(itemsBlock)) {
    const value = byText.get(text);
    if (value === right || /^right$/i.test(String(value || ''))) rightItems.push(text);
    else if (value === left || /^left$/i.test(String(value || '')) || !value) leftItems.push(text);
    else leftItems.push(text);
  }

  const next = [];
  for (const block of blocks) {
    if (isName(block, 'Items')) {
      next.push({
        name: 'Left Label Items',
        lines: ['', ...leftItems.map(item => `- ${item}`), '']
      });
      next.push({
        name: 'Right Label Items',
        lines: ['', ...rightItems.map(item => `- ${item}`), '']
      });
      continue;
    }
    next.push(block);
  }
  blocks.length = 0;
  blocks.push(...next);
}

function splitEntriesForType(type, blocks) {
  if (/^text input$/i.test(type)) return splitTextInput(blocks);
  if (/^multiple choice$/i.test(type)) return splitMcq(blocks);
  if (/^fill in the blanks$/i.test(type)) return splitFibOrMatching(blocks, 'Blank');
  if (/^matching$/i.test(type)) return splitFibOrMatching(blocks, 'Item');
  if (/^matrix$/i.test(type)) return splitMatrix(blocks);
  if (/^sort into boxes$/i.test(type)) return splitSort(blocks);
  if (/^swipe left or right$/i.test(type)) return splitSwipe(blocks);
  return [];
}

function mergeEntriesForType(type, blocks, answers) {
  if (/^text input$/i.test(type)) return mergeTextInput(blocks, answers);
  if (/^multiple choice$/i.test(type)) return mergeMcq(blocks, answers);
  if (/^fill in the blanks$/i.test(type)) return mergeFibOrMatching(blocks, answers, /^Blank\s+(\d+)$/i);
  if (/^matching$/i.test(type)) return mergeFibOrMatching(blocks, answers, /^Item\s+(\d+)$/i);
  if (/^matrix$/i.test(type)) return mergeMatrix(blocks, answers);
  if (/^sort into boxes$/i.test(type)) return mergeSort(blocks, answers);
  if (/^swipe left or right$/i.test(type)) return mergeSwipe(blocks, answers);
}

/**
 * @param {string} combinedMarkdown
 * @returns {{ questionMarkdown: string, answerKeyMarkdown: string }}
 */
function splitCombinedMarkdown(combinedMarkdown) {
  const markdown = String(combinedMarkdown || '');
  const type = extractQuestionTypeFromMarkdown(markdown) || '';
  if (!markdown.trim() || !type) {
    return { questionMarkdown: markdown, answerKeyMarkdown: '' };
  }
  const blocks = parseSectionBlocks(markdown);
  const entries = splitEntriesForType(type, blocks);
  return {
    questionMarkdown: serializeSectionBlocks(blocks),
    answerKeyMarkdown: formatAnswerKeyMarkdown(type, entries)
  };
}

function typesConflict(questionType, keyType) {
  if (!questionType || !keyType) return false;
  return questionType.trim().toLowerCase() !== keyType.trim().toLowerCase();
}

function isEmptyAnswerKeyScaffold(keyMd) {
  const { type, answers } = parseAnswerKey(keyMd);
  if (!type || answers.length) return false;
  const blocks = parseSectionBlocks(keyMd);
  const preamble = blocks.find(block => block.name == null);
  if (preamble && sectionBody(preamble).trim()) return false;
  const names = blocks.filter(block => block.name).map(block => block.name);
  if (!names.includes('Answer Key')) return false;
  if (names.some(name => name !== 'Type' && name !== 'Answer Key')) return false;
  const keyBlock = blocks.find(block => block.name === 'Answer Key');
  return !sectionBody(keyBlock).trim();
}

/**
 * @param {string} questionMarkdown
 * @param {string} answerKeyMarkdown
 * @returns {string}
 */
function mergeQuestionAndAnswerKey(questionMarkdown, answerKeyMarkdown) {
  const question = String(questionMarkdown || '');
  const keyMd = String(answerKeyMarkdown || '');
  if (!keyMd.trim()) return question;
  const questionType = extractQuestionTypeFromMarkdown(question);
  if (!questionType) {
    throw new Error('Question file is missing a type');
  }
  const parsed = parseAnswerKey(keyMd);
  if (typesConflict(questionType, parsed.type)) {
    throw new Error('Answer key type does not match the question');
  }
  if (!parsed.answers.length) {
    if (isEmptyAnswerKeyScaffold(keyMd)) return question;
    throw new Error('Answer key has no parseable entries');
  }
  const blocks = parseSectionBlocks(question);
  mergeEntriesForType(questionType, blocks, parsed.answers);
  return serializeSectionBlocks(blocks);
}

module.exports = {
  parseAnswerKey,
  splitCombinedMarkdown,
  mergeQuestionAndAnswerKey,
};
