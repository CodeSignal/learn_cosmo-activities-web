const { Lexer } = require('marked');
const { parseTextInputAnswerItems } = require('./text-input-validation');
const { parseTextInputAnswers } = require('./text-input-answers');
const { renderMarkdown } = require('./render-markdown');
const { parseSortItemEntry } = require('./sort-item-entry');

function parseSectionsFromTokens(tokens) {
  const sections = new Map();
  let current = null;
  let buffer = [];
  function flush() {
    if (current !== null) sections.set(current, buffer.slice());
    buffer = [];
  }
  for (const token of tokens) {
    if (token.type === 'paragraph') {
      const text = (token.text || '').trim();
      const m = text.match(/^__([^_]+)__\s*$/);
      const mWithContent = text.match(/^__([^_]+)__\s*\n([\s\S]*)$/);
      if (m) {
        flush();
        current = m[1].trim();
        continue;
      }
      if (mWithContent) {
        flush();
        current = mWithContent[1].trim();
        const rest = mWithContent[2].trim();
        if (rest) {
          buffer.push({ type: 'paragraph', raw: rest, text: rest });
        }
        continue;
      }
    }
    if (current !== null) buffer.push(token);
  }
  flush();
  return sections;
}

/** @returns {string|null} */
function extractQuestionTypeFromMarkdown(markdownText) {
  if (!markdownText || typeof markdownText !== 'string' || !markdownText.trim()) return null;
  try {
    const tokens = Lexer.lex(markdownText);
    const sections = parseSectionsFromTokens(tokens);
    const type = ((sections.get('Type') || []).map(t => t.raw || t.text).join('\n') || '').trim();
    return type || null;
  } catch (e) {
    return null;
  }
}

/**
 * Parse __Content__ section tokens into { url } or { markdown } plus optional contentWidth, openInNewTab.
 * URLs may be absolute (https://...) or site-relative paths (/sim/...) for split-screen simulations.
 */
function parseSideContentFromSectionTokens(sectionTokens) {
  if (!sectionTokens || sectionTokens.length === 0) return null;
  const contentText = sectionTokens.map(t => t.raw || t.text || '').join('\n').trim();
  if (!contentText) return null;
  const contentWidthMatch = contentText.match(/\[contentWidth:\s*([^\]]+)\]/i);
  const contentWidth = contentWidthMatch ? contentWidthMatch[1].trim() : null;
  const contentWithoutWidth = contentWidthMatch
    ? contentText.replace(/\s*\[contentWidth:\s*[^\]]+\]\s*/gi, '').trim()
    : contentText;

  if (/^https?:\/\//i.test(contentWithoutWidth)) {
    const lines = contentWithoutWidth.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || '';
    const openInNewTab = /\[openInNewTab\]/i.test(contentWithoutWidth);
    const url = firstLine.replace(/\s+\[openInNewTab\]\s*$/i, '').trim();
    const out = { url, openInNewTab: !!openInNewTab };
    if (contentWidth) out.contentWidth = contentWidth;
    return out;
  }

  const pathLines = contentWithoutWidth.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pathFirst = pathLines[0] || '';
  if (pathFirst.startsWith('/')) {
    const openInNewTab = /\[openInNewTab\]/i.test(contentWithoutWidth);
    const url = pathFirst.replace(/\s+\[openInNewTab\]\s*$/i, '').trim();
    const out = { url, openInNewTab: !!openInNewTab };
    if (contentWidth) out.contentWidth = contentWidth;
    return out;
  }

  const out = { markdown: contentWithoutWidth };
  if (contentWidth) out.contentWidth = contentWidth;
  return out;
}

function attachSideContent(activity, sections) {
  const side = parseSideContentFromSectionTokens(sections.get('Content') || []);
  if (side) activity.content = side;
  return activity;
}

/**
 * __Explain Your Answer__ body: first non-empty line must be true | yes | enabled;
 * optional following lines (case preserved) = custom prompt shown instead of "Explain your answer".
 * @returns {{ enabled: boolean, label: string | null }}
 */
function parseExplainYourAnswerSection(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw) return { enabled: false, label: null };
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { enabled: false, label: null };
  const first = lines[0].toLowerCase();
  const enabled = first === 'true' || first === 'yes' || first === 'enabled';
  if (!enabled) return { enabled: false, label: null };
  if (lines.length === 1) return { enabled: true, label: null };
  const label = lines.slice(1).join('\n').trim();
  return { enabled: true, label: label || null };
}

function readListItems(sectionTokens) {
  const items = [];
  for (const t of sectionTokens || []) {
    if (t.type === 'list' && Array.isArray(t.items)) {
      for (const li of t.items) {
        const text = (li.text || '').trim();
        if (text) items.push(text);
      }
    } else if (t.type === 'paragraph') {
      // Support loose list formatting lines starting with - or *
      const lines = (t.raw || t.text || '').split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*[-*]\s+(.*)$/);
        if (m) items.push(m[1].trim());
      }
    }
  }
  return items;
}

// Matches the marker line and the indented continuation lines written by server.js.
const EXPLANATION_PATTERN = /Explanation:\s*([^\n]*(?:\n {5}[^\n]*)*)/;

function unindentExplanation(text) {
  return String(text || '')
    .split('\n')
    .map((line, i) => (i === 0 ? line : line.replace(/^ {5}/, '')))
    .join('\n')
    .trim();
}

function parseAnswersFromMarkdown(markdownText) {
  const tokens = Lexer.lex(markdownText);
  const sections = parseSectionsFromTokens(tokens);
  const type = ((sections.get('Type') || []).map(t => t.raw || t.text).join('\n') || '').trim();
  const responsesSection = sections.get('Responses') || [];

  // Parse responses to extract selected answers
  const responsesText = responsesSection.map(t => t.raw || t.text || '').join('\n');
  const answers = {};

  if (/^multiple choice$/i.test(type)) {
    // Parse MCQ responses: "Selected Answer: D" or "Selected Answer: B, D"
    // Also parse explanations if present: "Explanation: ..." (comes after Result line)
    const explanations = {};
    // First, parse explanations separately since they come after the Result line
    // Use a more specific regex that matches each question block individually
    // Split by question number pattern, then check each block for explanation
    const questionBlocks = responsesText.split(/(?=\d+\.\s*\*\*[^*]+\*\*)/);
    questionBlocks.forEach(block => {
      const questionMatch = block.match(/^(\d+)\.\s*\*\*[^*]+\*\*/);
      if (questionMatch) {
        const questionNumber = parseInt(questionMatch[1], 10);
        const explanationMatch = block.match(EXPLANATION_PATTERN);
        if (explanationMatch) {
          const questionIndex = questionNumber - 1; // Convert to 0-indexed
          const explanationStr = unindentExplanation(explanationMatch[1]);
          if (explanationStr) {
            explanations[questionIndex] = explanationStr;
          }
        }
      }
    });

    // Then parse selected answers
    const responseRegex = /(\d+)\.\s*\*\*[^*]+\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
    let match;
    while ((match = responseRegex.exec(responsesText)) !== null) {
      const questionIndex = parseInt(match[1], 10) - 1; // Convert to 0-indexed
      const selectedAnswerStr = match[2].trim();
      // Parse comma-separated answers and trim whitespace
      const selectedAnswers = selectedAnswerStr
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (selectedAnswers.length > 0 && selectedAnswers[0] !== 'No answer selected') {
        answers[questionIndex] = selectedAnswers;
      }
    }
    // Return both answers and explanations
    return { answers, type, explanations };
  } else if (/^fill in the blanks$/i.test(type)) {
    // Parse FIB responses: "Selected Answer: [value]"
    const responseRegex = /(\d+)\.\s*\*\*Blank (\d+)\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
    let match;
    while ((match = responseRegex.exec(responsesText)) !== null) {
      const blankIndex = parseInt(match[2], 10) - 1; // Convert to 0-indexed
      const selectedAnswer = match[3].trim();
      if (selectedAnswer && selectedAnswer !== 'No answer selected') {
        answers[blankIndex] = selectedAnswer;
      }
    }
  } else if (/^matching$/i.test(type)) {
    // Parse Matching responses: "Selected Answer: [value]"
    const responseRegex = /(\d+)\.\s*\*\*[^*]+\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
    let match;
    while ((match = responseRegex.exec(responsesText)) !== null) {
      const itemIndex = parseInt(match[1], 10) - 1; // Convert to 0-indexed
      const selectedAnswer = match[2].trim();
      if (selectedAnswer && selectedAnswer !== 'No answer selected') {
        answers[itemIndex] = selectedAnswer;
      }
    }
  } else if (/^sort into boxes$/i.test(type)) {
    // Parse Sort/Categorization responses: index maps to the chosen category label.
    const responseRegex = /(\d+)\.\s*\*\*[\s\S]*?\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
    let match;
    while ((match = responseRegex.exec(responsesText)) !== null) {
      const itemIndex = parseInt(match[1], 10) - 1; // Convert to 0-indexed
      const selectedAnswer = match[2].trim();
      if (selectedAnswer && selectedAnswer !== 'No answer selected') {
        answers[itemIndex] = selectedAnswer;
      }
    }
  } else if (/^text input$/i.test(type)) {
    // Parse Text Input responses: "Selected Answer: [value]" (values may span several lines)
    Object.assign(answers, parseTextInputAnswers(responsesText));
  } else if (/^matrix$/i.test(type)) {
    const explanations = {};
    const questionBlocks = responsesText.split(/(?=\d+\.\s*\*\*[^*]+\*\*)/);
    questionBlocks.forEach(block => {
      const questionMatch = block.match(/^(\d+)\.\s*\*\*[^*]+\*\*/);
      if (questionMatch) {
        const questionNumber = parseInt(questionMatch[1], 10);
        const explanationMatch = block.match(EXPLANATION_PATTERN);
        if (explanationMatch) {
          const questionIndex = questionNumber - 1;
          const explanationStr = unindentExplanation(explanationMatch[1]);
          if (explanationStr) {
            explanations[questionIndex] = explanationStr;
          }
        }
      }
    });
    const responseRegex = /(\d+)\.\s*\*\*[^*]+\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
    let match;
    while ((match = responseRegex.exec(responsesText)) !== null) {
      const rowIndex = parseInt(match[1], 10) - 1;
      const selectedAnswer = match[2].trim();
      if (selectedAnswer && selectedAnswer !== 'No answer selected') {
        answers[rowIndex] = selectedAnswer;
      }
    }
    if (Object.keys(explanations).length > 0) {
      return { answers, type, explanations };
    }
  }

  return { answers, type };
}

function buildActivityFromMarkdown(markdownText) {
  const tokens = Lexer.lex(markdownText);
  const sections = parseSectionsFromTokens(tokens);
  const type = ((sections.get('Type') || []).map(t => t.raw || t.text).join('\n') || '').trim();
  const question = ((sections.get('Practice Question') || []).map(t => t.raw || t.text).join('\n') || '').trim();

  if (/^fill in the blanks$/i.test(type)) {
    const fibTokens = sections.get('Markdown With Blanks') || [];
    const fibMarkdown = fibTokens.map(t => t.raw || t.text || '').join('\n').trim();
    const suggested = readListItems(sections.get('Suggested Answers'));

    // Split the content into prompt and fill-in-the-blanks content
    const lines = fibMarkdown.split(/\r?\n/);
    let promptLines = [];
    let contentLines = [];
    let foundBlockquote = false;

    for (const line of lines) {
      if (/^\s*>/.test(line)) {
        foundBlockquote = true;
        // Remove the '> ' marker and add to content
        contentLines.push(line.replace(/^\s*>\s?/, ''));
      } else if (foundBlockquote) {
        // After finding blockquote, everything goes to content
        contentLines.push(line);
      } else {
        // Before blockquote, everything goes to prompt (unless it's empty)
        if (line.trim()) {
          promptLines.push(line);
        }
      }
    }

    const prompt = promptLines.join('\n').trim();
    const content = contentLines.join('\n').trim();

    const blanks = [];
    let idx = 0;
    // Replace blank tokens with actual HTML spans that will be preserved by the markdown renderer
    const contentWithBlankSpans = content.replace(/\[\[blank(?::([^\]]*))?\]\]/gi, (_, token) => {
      const answer = token != null ? String(token).trim() : null;
      const currentIndex = idx++;
      blanks.push({ index: currentIndex, answer });
      return `<span class="blank" data-blank="${currentIndex}" aria-label="blank ${currentIndex + 1}" tabindex="0"></span>`;
    });
    // Build choices preserving duplicates from Suggested Answers, and ensure
    // at least as many copies of each correct answer as there are blanks.
    const suggestedTrimmed = suggested.map(s => s.trim()).filter(Boolean);
    const requiredCounts = new Map();
    blanks.forEach(b => {
      const k = b.answer;
      if (k != null && k !== '') {
        requiredCounts.set(k, (requiredCounts.get(k) || 0) + 1);
      }
    });
    const suggestedCounts = new Map();
    suggestedTrimmed.forEach(s => {
      suggestedCounts.set(s, (suggestedCounts.get(s) || 0) + 1);
    });
    const choices = suggestedTrimmed.slice();
    requiredCounts.forEach((req, k) => {
      const have = suggestedCounts.get(k) || 0;
      for (let i = have; i < req; i++) choices.push(k);
    });
    // simple shuffle
    let s = (markdownText.length || 1337) % 2147483647 || 1337;
    function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    // Render markdown to HTML for prompt and content
    const promptHtml = prompt ? renderMarkdown(prompt) : '';
    const contentHtml = renderMarkdown(contentWithBlankSpans);
    // Parse QuestionStyle (e.g. "boxed", "bordered") from __QuestionStyle__ section
    const questionStyleTokens = sections.get('QuestionStyle') || [];
    const questionStyle = ((questionStyleTokens.map(t => t.raw || t.text).join('\n') || '').trim()).toLowerCase() || null;
    const fibHeadingTokens = sections.get('Heading') || [];
    const fibHeadingMd = fibHeadingTokens.map(t => t.raw || t.text).join('\n').trim();
    let fibHeading = null;
    if (fibHeadingMd) {
      fibHeading = { markdown: fibHeadingMd, html: renderMarkdown(fibHeadingMd) };
    }
    return attachSideContent(
      {
        type,
        question,
        fib: {
          raw: fibMarkdown,
          prompt,
          promptHtml,
          content,
          htmlWithPlaceholders: contentHtml,
          blanks,
          choices,
          questionStyle: questionStyle || undefined,
          ...(fibHeading ? { heading: fibHeading } : {})
        }
      },
      sections
    );
  }

  if (/^multiple choice$/i.test(type)) {
    // Parse MCQ with support for multiple questions
    const questions = [];
    const allTokens = Lexer.lex(markdownText);

    let currentQuestion = null;
    let currentSection = null;
    let questionBuffer = [];
    let answerBuffer = [];
    let explainAnswerBuffer = [];
    let questionOptionsBuffer = [];
    let questionNameBuffer = [];
    let headingBuffer = [];

    // Deterministic shuffle using text as seed
    function seededShuffle(array, seed) {
      // Simple seeded random number generator
      let s = seed;
      function seededRandom() {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      }

      // Fisher-Yates shuffle with seeded random
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    // Generate seed from question text and all option texts
    function generateSeed(questionText, options) {
      const allText = questionText + options.map(opt => opt.text + opt.label).join('');
      let hash = 0;
      for (let i = 0; i < allText.length; i++) {
        const char = allText.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    }

    function processQuestion() {
      if (!currentQuestion || questionBuffer.length === 0) return;

      // Parse options from question text
      const questionText = questionBuffer.map(t => t.raw || t.text || '').join('\n').trim();
      const options = [];

      // Extract options (A., B., C., etc.)
      const optionRegex = /^([A-Z])\.\s*(.+)$/gm;
      let match;
      const optionMap = new Map();
      while ((match = optionRegex.exec(questionText)) !== null) {
        const label = match[1];
        const text = match[2].trim();
        optionMap.set(label, text);

        // Parse markdown to HTML for rendering (supports images, bold, etc.)
        const textHtml = renderMarkdown(text);

        options.push({
          label: label,
          text: text, // Keep raw text for backward compatibility
          textHtml: textHtml, // Add HTML version for rendering
          correct: false // Will be set from Suggested Answers
        });
      }

      // Extract question text without options
      const questionTextOnly = questionText.replace(/^[A-Z]\.\s*.+$/gm, '').trim();

      // Store raw markdown text (for answer.md generation)
      currentQuestion.text = questionTextOnly || questionText;

      // Parse markdown to HTML for rendering (supports multiple paragraphs, blockquotes, etc.)
      if (currentQuestion.text) {
        currentQuestion.textHtml = renderMarkdown(currentQuestion.text);
      } else {
        currentQuestion.textHtml = '';
      }

      currentQuestion.options = options;
    }

    function processExplainAnswer() {
      if (!currentQuestion) return;
      const raw = explainAnswerBuffer.map(t => t.raw || t.text || '').join('\n').trim();
      const { enabled, label } = parseExplainYourAnswerSection(raw);
      currentQuestion.explainAnswer = enabled;
      if (enabled && label) {
        currentQuestion.explainAnswerLabel = label;
      } else {
        delete currentQuestion.explainAnswerLabel;
      }
    }

    function processQuestionOptions() {
      if (!currentQuestion) return;

      // Parse question options section
      const optionsText = questionOptionsBuffer.map(t => t.raw || t.text || '').join('\n').trim().toLowerCase();

      // Check for shuffle option
      if (optionsText.includes('shuffle=false') || optionsText.includes('don\'t shuffle') || optionsText.includes('dont shuffle') || optionsText === 'no shuffle') {
        currentQuestion.shuffleOptions = false;
      } else {
        currentQuestion.shuffleOptions = true; // Default to shuffling
      }

      // Check for explicit multi-select (needed in assessment mode where
      // correct-answer count can't be used to infer it)
      if (optionsText.includes('multi-select')) {
        currentQuestion.isMultiSelect = true;
      }

      // Check for multi-select mode (any vs all)
      // Default is 'all' - must select all correct answers
      // 'any' means any correct answer is sufficient
      if (optionsText.includes('any') || optionsText.includes('multi-select mode: any') || optionsText.includes('mode: any')) {
        currentQuestion.multiSelectMode = 'any';
      } else {
        currentQuestion.multiSelectMode = 'all'; // Default
      }
    }

    function processAnswers() {
      if (!currentQuestion) return;

      // Process explain answer first if buffer exists (even if no answers yet)
      if (explainAnswerBuffer.length > 0) {
        processExplainAnswer();
      } else {
        currentQuestion.explainAnswer = false;
        delete currentQuestion.explainAnswerLabel;
      }

      // Process question options if buffer exists
      if (questionOptionsBuffer.length > 0) {
        processQuestionOptions();
      } else {
        currentQuestion.shuffleOptions = true; // Default to shuffling
        currentQuestion.multiSelectMode = 'all'; // Default multi-select mode
      }

      // Process answers if buffer has content
      if (answerBuffer.length > 0) {
        const answerItems = readListItems(answerBuffer);
        const correctAnswers = new Set();

        answerItems.forEach(item => {
          const trimmed = item.trim();
          // Match patterns like "A", "A - Correct", "B - Correct", etc.
          const match = trimmed.match(/^([A-Z])\s*(?:-?\s*(?:Correct)?)?$/i);
          if (match) {
            const label = match[1].toUpperCase();
            if (trimmed.toLowerCase().includes('correct')) {
              correctAnswers.add(label);
            }
          }
        });

        // Mark correct options
        currentQuestion.options.forEach(opt => {
          opt.correct = correctAnswers.has(opt.label);
        });

        // Determine if multi-select from correct markers (only override
        // when markers are present; assessment mode uses __Question Options__)
        if (correctAnswers.size > 0) {
          currentQuestion.isMultiSelect = correctAnswers.size > 1;
        }
      }

      // Shuffle options only if shuffleOptions is true (default behavior)
      if (currentQuestion.shuffleOptions !== false) {
        const seed = generateSeed(currentQuestion.text, currentQuestion.options);
        currentQuestion.options = seededShuffle(currentQuestion.options, seed);
      }

      // Assign a display label (A, B, C, ...) by final display position so screen
      // readers announce options in order even after shuffling. `label` stays the
      // authored source letter used for grading and report/answer output.
      currentQuestion.options.forEach((opt, i) => {
        opt.displayLabel = String.fromCharCode(65 + i);
      });

      // Add to questions array
      questions.push(currentQuestion);
    }

    // Parse tokens sequentially
    for (const token of allTokens) {
      if (token.type === 'paragraph') {
        const text = (token.text || '').trim();
        const m = text.match(/^__([^_]+)__\s*$/);
        if (m) {
          const sectionName = m[1].trim();

          if (sectionName === 'Practice Question') {
            // Process previous question/answers if any
            if (currentQuestion) {
              processAnswers();
            }

            // Start new question
            const nameFromBuffer = questionNameBuffer.map(t => t.raw || t.text || '').join('\n').trim();
            questionNameBuffer = [];
            currentQuestion = {
              id: questions.length,
              name: nameFromBuffer,
              text: '',
              options: [],
              isMultiSelect: false,
              explainAnswer: false,
              shuffleOptions: true,
              multiSelectMode: 'all'
            };
            currentSection = 'question';
            questionBuffer = [];
            answerBuffer = [];
            explainAnswerBuffer = [];
            questionOptionsBuffer = [];
            continue;
          } else if (sectionName === 'Question Name' || sectionName === 'Question name') {
            if (currentQuestion && (currentSection === 'answers' || currentSection === 'explain' || currentSection === 'questionOptions')) {
              processAnswers();
              currentQuestion = null;
            }
            currentSection = 'questionName';
            questionNameBuffer = [];
            continue;
          } else if (sectionName === 'Suggested Answers') {
            // Process current question text and question options if they exist
            if (currentQuestion) {
              processQuestion();
              // Process question options if we were in that section
              if (currentSection === 'questionOptions' && questionOptionsBuffer.length > 0) {
                processQuestionOptions();
              }
              currentSection = 'answers';
              answerBuffer = [];
            }
            continue;
          } else if (sectionName === 'Question Options' || sectionName === 'Question options') {
            // Switch to question options section - should come after question text, before Suggested Answers
            if (currentQuestion && currentSection === 'question') {
              processQuestion();
              currentSection = 'questionOptions';
              questionOptionsBuffer = [];
            }
            continue;
          } else if (sectionName === 'Explain Your Answer' || sectionName === 'Explain your answer') {
            // Switch to explain section - answers will be processed when we hit the next question or end
            if (currentQuestion) {
              // Process question options if we were in that section
              if (currentSection === 'questionOptions' && questionOptionsBuffer.length > 0) {
                processQuestionOptions();
              }
              if (currentSection === 'answers' || currentSection === 'questionOptions') {
                currentSection = 'explain';
                explainAnswerBuffer = [];
              }
            }
            continue;
          } else if (sectionName === 'Heading') {
            currentSection = 'heading';
            headingBuffer = [];
            continue;
          } else if (sectionName === 'Content') {
            // Side content is read from the section map by attachSideContent; do not
            // leave MCQ in 'explain' (etc.) or __Content__ tokens pollute explainAnswerBuffer.
            currentSection = null;
            continue;
          } else if (sectionName === 'Type') {
            // Skip type section
            currentSection = null;
            continue;
          }
        }
      }

      if (currentSection === 'heading') {
        headingBuffer.push(token);
      } else if (currentSection === 'questionName') {
        questionNameBuffer.push(token);
      } else if (currentSection === 'question' && currentQuestion) {
        questionBuffer.push(token);
      } else if (currentSection === 'questionOptions' && currentQuestion) {
        questionOptionsBuffer.push(token);
      } else if (currentSection === 'answers' && currentQuestion) {
        answerBuffer.push(token);
      } else if (currentSection === 'explain' && currentQuestion) {
        explainAnswerBuffer.push(token);
      }
    }

    // Process last question and answers
    if (currentQuestion) {
      if (questionBuffer.length > 0 && currentQuestion.options.length === 0) {
        processQuestion();
      }
      processAnswers();
    }

    if (questions.length === 0) {
      throw new Error('No MCQ questions found');
    }

    let heading = null;
    if (headingBuffer.length > 0) {
      const headingText = headingBuffer.map(t => t.raw || t.text || '').join('\n').trim();
      if (headingText) {
        heading = { markdown: headingText, html: renderMarkdown(headingText) };
      }
    }

    return attachSideContent({ type, question: null, mcq: { questions, heading } }, sections);
  }

  if (/^matching$/i.test(type)) {
    const matchingTokens = sections.get('Markdown With Blanks') || [];
    const matchingMarkdown = matchingTokens.map(t => t.raw || t.text || '').join('\n').trim();
    const suggested = readListItems(sections.get('Suggested Answers'));

    // Split the content into prompt and matching items
    const lines = matchingMarkdown.split(/\r?\n/);
    let promptLines = [];
    let itemLines = [];
    let foundBlockquote = false;

    for (const line of lines) {
      if (/^\s*>/.test(line)) {
        foundBlockquote = true;
        // Remove the '> ' marker and add to items
        itemLines.push(line.replace(/^\s*>\s?/, ''));
      } else if (foundBlockquote) {
        // After finding blockquote, everything goes to items
        itemLines.push(line);
      } else {
        // Before blockquote, everything goes to prompt (unless it's empty)
        if (line.trim()) {
          promptLines.push(line);
        }
      }
    }

    const prompt = promptLines.join('\n').trim();

    const items = [];
    let idx = 0;
    // Parse each blockquote line as a separate item
    // Each line starting with '>' is a separate card
    for (const line of lines) {
      if (/^\s*>/.test(line)) {
        const itemLine = line.replace(/^\s*>\s?/, '').trim();
        const blankMatch = itemLine.match(/\[\[blank(?::([^\]]*))?\]\]/i);
        if (!blankMatch) continue;

        const answer = blankMatch[1] != null ? String(blankMatch[1]).trim() : null;
        const textBeforeBlank = itemLine.replace(/\[\[blank(?::[^\]]*)?\]\]/gi, '').trim();

        // Render text without blank to HTML
        const textHtml = renderMarkdown(textBeforeBlank);

        items.push({
          index: idx++,
          text: textBeforeBlank,
          textHtml: textHtml,
          answer: answer
        });
      }
    }

    // Build choices preserving duplicates from Suggested Answers, and ensure
    // at least as many copies of each correct answer as there are blanks.
    const suggestedTrimmed = suggested.map(s => s.trim()).filter(Boolean);
    const requiredCounts = new Map();
    items.forEach(item => {
      const k = item.answer;
      if (k != null && k !== '') {
        requiredCounts.set(k, (requiredCounts.get(k) || 0) + 1);
      }
    });
    const suggestedCounts = new Map();
    suggestedTrimmed.forEach(s => {
      suggestedCounts.set(s, (suggestedCounts.get(s) || 0) + 1);
    });
    const choices = suggestedTrimmed.slice();
    requiredCounts.forEach((req, k) => {
      const have = suggestedCounts.get(k) || 0;
      for (let i = have; i < req; i++) choices.push(k);
    });

    // Shuffle choices using deterministic shuffle
    let s = (markdownText.length || 1337) % 2147483647 || 1337;
    function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    // Render markdown/LaTeX for each choice chip. Identity stays the raw
    // string in `choices` so scoring still matches [[blank:...]] answers.
    const choicesHtml = choices.map(c => renderMarkdown(c));

    // Render markdown to HTML for prompt
    const promptHtml = prompt ? renderMarkdown(prompt) : '';

    const matchingHeadingTokens = sections.get('Heading') || [];
    const matchingHeadingMd = matchingHeadingTokens.map(t => t.raw || t.text).join('\n').trim();
    let matchingHeading = null;
    if (matchingHeadingMd) {
      matchingHeading = { markdown: matchingHeadingMd, html: renderMarkdown(matchingHeadingMd) };
    }

    return attachSideContent({
      type,
      question: null,
      matching: {
        raw: matchingMarkdown,
        prompt,
        promptHtml,
        items,
        choices,
        choicesHtml,
        ...(matchingHeading ? { heading: matchingHeading } : {})
      }
    }, sections);
  }

  if (/^text input$/i.test(type)) {
    // Parse Text Input with support for multiple questions
    const questions = [];
    const allTokens = Lexer.lex(markdownText);

    let currentQuestion = null;
    let currentSection = null;
    let questionBuffer = [];
    let answerBuffer = [];
    let headingBuffer = [];
    let questionNameBuffer = [];

    function processQuestion() {
      if (!currentQuestion || questionBuffer.length === 0) return;

      // Extract question text
      const questionText = questionBuffer.map(t => t.raw || t.text || '').join('\n').trim();
      currentQuestion.text = questionText;

      // Parse markdown to HTML for rendering (supports LaTeX, images, bold, etc.)
      if (currentQuestion.text) {
        currentQuestion.textHtml = renderMarkdown(currentQuestion.text);
      } else {
        currentQuestion.textHtml = '';
      }
    }

    function processAnswers() {
      if (!currentQuestion) return;

      if (answerBuffer.length > 0) {
        const answerItems = readListItems(answerBuffer);

        // For text-input, support multiple correct answers.
        if (answerItems.length > 0) {
          const parsed = parseTextInputAnswerItems(answerItems);
          currentQuestion.correctAnswers = parsed.correctAnswers;
          currentQuestion.correctAnswer = parsed.correctAnswer;
          currentQuestion.validation = parsed.validation;
        }
      }

      // Add to questions array
      questions.push(currentQuestion);
    }

    // Parse tokens sequentially
    for (const token of allTokens) {
      if (token.type === 'paragraph') {
        const text = (token.text || '').trim();
        const m = text.match(/^__([^_]+)__\s*$/);
        if (m) {
          const sectionName = m[1].trim();

          if (sectionName === 'Practice Question') {
            // Process previous question/answers if any
            if (currentQuestion) {
              processAnswers();
            }

            const nameFromBuffer = questionNameBuffer.map(t => t.raw || t.text || '').join('\n').trim();
            questionNameBuffer = [];

            // Start new question
            currentQuestion = {
              id: questions.length,
              name: nameFromBuffer,
              text: '',
              correctAnswer: '',
              correctAnswers: [],
              validation: {}
            };
            currentSection = 'question';
            questionBuffer = [];
            answerBuffer = [];
            continue;
          } else if (sectionName === 'Question Name' || sectionName === 'Question name') {
            if (currentQuestion && currentSection === 'answers') {
              processAnswers();
              currentQuestion = null;
            }
            currentSection = 'questionName';
            questionNameBuffer = [];
            continue;
          } else if (sectionName === 'Correct Answers' || sectionName === 'Suggested Answers') {
            // Process current question text
            if (currentQuestion) {
              processQuestion();
              currentSection = 'answers';
              answerBuffer = [];
            }
            continue;
          } else if (sectionName === 'Type') {
            // Skip type section
            currentSection = null;
            continue;
          } else if (sectionName === 'Heading') {
            currentSection = 'heading';
            headingBuffer = [];
            continue;
          }
        }
      }

      if (currentSection === 'questionName') {
        questionNameBuffer.push(token);
      } else if (currentSection === 'question' && currentQuestion) {
        questionBuffer.push(token);
      } else if (currentSection === 'answers' && currentQuestion) {
        answerBuffer.push(token);
      } else if (currentSection === 'heading') {
        headingBuffer.push(token);
      }
    }

    // Process last question and answers
    if (currentQuestion) {
      if (questionBuffer.length > 0 && !currentQuestion.text) {
        processQuestion();
      }
      processAnswers();
    }

    if (questions.length === 0) {
      throw new Error('No text input questions found');
    }

    // Process heading section if present
    let heading = null;
    if (headingBuffer.length > 0) {
      const headingText = headingBuffer.map(t => t.raw || t.text || '').join('\n').trim();
      if (headingText) {
        heading = { markdown: headingText, html: renderMarkdown(headingText) };
      }
    }

    const activity = { type, question: null, textInput: { questions, heading } };
    attachSideContent(activity, sections);
    const side = activity.content || null;
    activity.textInput.content = side;
    return activity;
  }

  if (/^matrix$/i.test(type)) {
    const columns = readListItems(sections.get('Matrix Columns'));
    const rows = readListItems(sections.get('Matrix Rows'));
    const suggestedRaw = readListItems(sections.get('Suggested Answers'));

    if (columns.length < 2) {
      throw new Error('Matrix requires at least two entries in __Matrix Columns__');
    }
    if (rows.length === 0) {
      throw new Error('Matrix requires at least one entry in __Matrix Rows__');
    }

    const colSeen = new Set();
    for (const c of columns) {
      if (colSeen.has(c)) {
        throw new Error(`Duplicate matrix column label: ${c}`);
      }
      colSeen.add(c);
    }
    const rowSeen = new Set();
    for (const r of rows) {
      if (rowSeen.has(r)) {
        throw new Error(`Duplicate matrix row label: ${r}`);
      }
      rowSeen.add(r);
    }

    let correctColumnIndexByRow = null;
    if (suggestedRaw.length > 0) {
      if (suggestedRaw.length !== rows.length) {
        throw new Error(
          `Matrix __Suggested Answers__ must have exactly one line per row (expected ${rows.length}, got ${suggestedRaw.length})`
        );
      }

      const answerByRow = new Map();
      for (const line of suggestedRaw) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          throw new Error(`Matrix suggested answer must use "row label: column label" format: ${line}`);
        }
        const rowKey = line.slice(0, colonIdx).trim();
        const colLabel = line.slice(colonIdx + 1).trim();
        if (!rows.includes(rowKey)) {
          throw new Error(`Matrix __Suggested Answers__ row not found in __Matrix Rows__: ${rowKey}`);
        }
        if (answerByRow.has(rowKey)) {
          throw new Error(`Duplicate __Suggested Answers__ entry for row: ${rowKey}`);
        }
        const colIdx = columns.indexOf(colLabel);
        if (colIdx === -1) {
          throw new Error(`Matrix __Suggested Answers__ column not found in __Matrix Columns__: ${colLabel}`);
        }
        answerByRow.set(rowKey, colIdx);
      }

      correctColumnIndexByRow = rows.map(r => {
        if (!answerByRow.has(r)) {
          throw new Error(`Missing __Suggested Answers__ entry for row: ${r}`);
        }
        return answerByRow.get(r);
      });
    }

    const explainTokens = sections.get('Explain Your Answer') || sections.get('Explain your answer') || [];
    const explainRaw = explainTokens.map(t => t.raw || t.text).join('\n').trim();
    const {
      enabled: explainAnswer,
      label: explainAnswerLabel
    } = parseExplainYourAnswerSection(explainRaw);

    const headingTokens = sections.get('Heading') || [];
    const headingMd = headingTokens.map(t => t.raw || t.text).join('\n').trim();
    let matrixHeading = null;
    if (headingMd) {
      matrixHeading = { markdown: headingMd, html: renderMarkdown(headingMd) };
    }

    const questionHtml = question ? renderMarkdown(question) : '';

    return attachSideContent(
      {
        type,
        question,
        questionHtml,
        matrix: {
          columns,
          rows,
          correctColumnIndexByRow,
          explainAnswer,
          ...(explainAnswer && explainAnswerLabel ? { explainAnswerLabel } : {}),
          ...(matrixHeading ? { heading: matrixHeading } : {})
        }
      },
      sections
    );
  }

  const labels = readListItems(sections.get('Labels'));
  if (/^sort into boxes$/i.test(type)) {
    // Preferred schema (supports N categories):
    //   __Categories__  -> list of category labels
    //   __Items__       -> list of "Item text: Category"
    // Falls back to the legacy two-box schema (First/Second Box Label + Items).
    const categoriesRaw = readListItems(sections.get('Categories'));
    const itemEntries = readListItems(sections.get('Items'));

    let categories = [];
    let items = [];

    if (categoriesRaw.length > 0 || itemEntries.length > 0) {
      categories = categoriesRaw.map(c => c.trim()).filter(Boolean);
      items = itemEntries
        .map(parseSortItemEntry)
        .filter(it => it.text);
      // In assessment mode, items may lack category assignments
      const hasCategories = items.some(it => it.correct);
      if (hasCategories) {
        for (const it of items) {
          if (!it.correct) {
            throw new Error(`Sort Into Boxes __Items__ is missing a category: ${it.text}`);
          }
          if (!categories.includes(it.correct)) {
            throw new Error(`Sort Into Boxes __Items__ category not found in __Categories__: ${it.text}: ${it.correct}`);
          }
        }
      } else {
        items = items.map(it => ({ ...it, correct: null }));
      }
    } else {
      // Legacy two-box schema.
      let first = '', second = '';
      for (const entry of labels) {
        const [k, ...rest] = entry.split(':');
        const v = rest.join(':').trim();
        const nk = (k || '').toLowerCase();
        if (nk.includes('first')) first = v;
        if (nk.includes('second')) second = v;
      }
      categories = [first || 'First Box', second || 'Second Box'];
      const firstItems = readListItems(sections.get('First Box Items'));
      const secondItems = readListItems(sections.get('Second Box Items'));
      items = [
        ...firstItems.map(text => ({ text, correct: categories[0] })),
        ...secondItems.map(text => ({ text, correct: categories[1] })),
      ];
    }

    // Render markdown/LaTeX for each chip's display text.
    items = items.map(it => ({ ...it, textHtml: renderMarkdown(it.text) }));

    let s = (markdownText.length || 1337) % 2147483647 || 1337;
    function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }

    const categoriesHtml = categories.map(c => renderMarkdown(c));

    const questionHtml = question ? renderMarkdown(question) : '';
    return attachSideContent(
      {
        type,
        question,
        questionHtml,
        categories,
        categoriesHtml,
        items,
        // Retained for backward compatibility with older consumers.
        labels: { first: categories[0] || '', second: categories[1] || '' }
      },
      sections
    );
  }

  // default swipe left/right
  let left = '', right = '';
  for (const entry of labels) {
    const [k, ...rest] = entry.split(':');
    const v = rest.join(':').trim();
    const nk = (k || '').toLowerCase();
    if (nk.includes('left')) left = v;
    if (nk.includes('right')) right = v;
  }
  const leftItems = readListItems(sections.get('Left Label Items'));
  const rightItems = readListItems(sections.get('Right Label Items'));
  let items;
  if (leftItems.length === 0 && rightItems.length === 0) {
    // Assessment mode: flat __Items__ list without left/right assignment
    items = readListItems(sections.get('Items')).map(text => ({ text, correct: null }));
  } else {
    items = [
      ...leftItems.map(text => ({ text, correct: 'left' })),
      ...rightItems.map(text => ({ text, correct: 'right' })),
    ];
  }
  let s = (markdownText.length || 1337) % 2147483647 || 1337;
  function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return attachSideContent({ type, question, labels: { left, right }, items }, sections);
}

/**
 * Returns true if the parsed activity contains embedded answer information.
 * When false, the activity was loaded from a stripped question.md (assessment mode).
 */
function detectAnswersPresent(activity) {
  if (!activity || !activity.type) return false;
  const type = String(activity.type);

  if (/^multiple choice$/i.test(type)) {
    const qs = activity.mcq && activity.mcq.questions;
    if (!qs || qs.length === 0) return false;
    return qs.some(q => Array.isArray(q.options) && q.options.some(o => o.correct));
  }
  if (/^fill in the blanks$/i.test(type)) {
    const blanks = activity.fib && activity.fib.blanks;
    if (!blanks || blanks.length === 0) return false;
    return blanks.some(b => b.answer != null && b.answer !== '');
  }
  if (/^matching$/i.test(type)) {
    const items = activity.matching && activity.matching.items;
    if (!items || items.length === 0) return false;
    return items.some(it => it.answer != null && it.answer !== '');
  }
  if (/^sort into boxes$/i.test(type)) {
    if (!Array.isArray(activity.items)) return false;
    return activity.items.some(it => it.correct != null && it.correct !== '');
  }
  if (/^matrix$/i.test(type)) {
    return Array.isArray(activity.matrix && activity.matrix.correctColumnIndexByRow)
      && activity.matrix.correctColumnIndexByRow.length > 0;
  }
  if (/^text input$/i.test(type)) {
    const qs = activity.textInput && activity.textInput.questions;
    if (!qs || qs.length === 0) return false;
    return qs.some(q =>
      (q.correctAnswer && q.correctAnswer.trim() !== '') ||
      (Array.isArray(q.correctAnswers) && q.correctAnswers.some(ca =>
        (ca.correctAnswer && ca.correctAnswer.trim() !== '') ||
        (ca.validation && ca.validation.kind === 'validate-later')
      ))
    );
  }
  // Swipe left/right
  if (!Array.isArray(activity.items)) return false;
  return activity.items.some(it => it.correct != null && it.correct !== '');
}

module.exports = {
  parseSectionsFromTokens,
  extractQuestionTypeFromMarkdown,
  parseSideContentFromSectionTokens,
  attachSideContent,
  parseExplainYourAnswerSection,
  readListItems,
  parseAnswersFromMarkdown,
  buildActivityFromMarkdown,
  detectAnswersPresent,
};
