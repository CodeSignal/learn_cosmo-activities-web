const http = require('http');
const fs = require('fs');
const path = require('path');
const { Lexer, marked } = require('marked');
const WebSocket = require('ws');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

// Parse command line arguments for --edit and --type flags
let EDIT_MODE = false;
let EDIT_FILE_PATH = null;
let EDIT_QUESTION_TYPE = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--edit' && i + 1 < args.length) {
    EDIT_MODE = true;
    let editPathArg = args[i + 1];
    // Resolve path relative to current working directory if path is relative, otherwise use as-is
    if (path.isAbsolute(editPathArg)) {
      EDIT_FILE_PATH = editPathArg;
    } else {
      // Resolve relative paths from current working directory
      EDIT_FILE_PATH = path.resolve(process.cwd(), editPathArg);
    }
  } else if (args[i] === '--type' && i + 1 < args.length) {
    EDIT_QUESTION_TYPE = args[i + 1];
  }
}

// Require type when in edit mode
if (EDIT_MODE && !EDIT_QUESTION_TYPE) {
  console.error('Error: --type flag is required when using --edit');
  console.error('');
  console.error('Available question types:');
  console.error('  - "Text Input"');
  console.error('  - "Multiple Choice"');
  console.error('  - "Fill in the Blanks"');
  console.error('  - "Matching"');
  console.error('  - "Sort into Boxes"');
  console.error('  - "Swipe Left/Right"');
  console.error('');
  console.error('Example: node server.js --edit ./data/question.md --type "Text Input"');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function isPathInside(child, parent) {
  const relative = path.relative(parent, child);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function sendFile(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(status, {
    'Content-Type': contentType,
    // Disable aggressive caching during development
    'Cache-Control': 'no-store'
  });
  const read = fs.createReadStream(filePath);
  read.on('error', () => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  });
  read.pipe(res);
}

function respondJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

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
      if (m) {
        flush();
        current = m[1].trim();
        continue;
      }
    }
    if (current !== null) buffer.push(token);
  }
  flush();
  return sections;
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
        const explanationMatch = block.match(/Explanation:\s*([^\n]+)/);
        if (explanationMatch) {
          const questionIndex = questionNumber - 1; // Convert to 0-indexed
          const explanationStr = explanationMatch[1].trim();
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
  } else if (/^text input$/i.test(type)) {
    // Parse Text Input responses: "Selected Answer: [value]"
    const responseRegex = /(\d+)\.\s*\*\*[^*]+\*\*[\s\S]*?Selected Answer:\s*([^\n]+)/g;
    let match;
    while ((match = responseRegex.exec(responsesText)) !== null) {
      const questionIndex = parseInt(match[1], 10) - 1; // Convert to 0-indexed
      const selectedAnswer = match[2].trim();
      if (selectedAnswer && selectedAnswer !== 'No answer selected') {
        answers[questionIndex] = selectedAnswer;
      }
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
    const contentWithBlankSpans = content.replace(/\[\[blank:([^\]]+)\]\]/gi, (_, token) => {
      const answer = String(token).trim();
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
      requiredCounts.set(k, (requiredCounts.get(k) || 0) + 1);
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
    const promptHtml = prompt ? marked.parse(prompt) : '';
    const contentHtml = marked.parse(contentWithBlankSpans);
    return { type, question, fib: { raw: fibMarkdown, prompt, promptHtml, content, htmlWithPlaceholders: contentHtml, blanks, choices } };
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
        const textHtml = marked.parse(text);
        
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
        currentQuestion.textHtml = marked.parse(currentQuestion.text);
      } else {
        currentQuestion.textHtml = '';
      }
      
      currentQuestion.options = options;
    }
    
    function processExplainAnswer() {
      if (!currentQuestion) return;
      
      // Parse explain answer section - check if it contains "true", "yes", or "enabled"
      const explainText = explainAnswerBuffer.map(t => t.raw || t.text || '').join('\n').trim().toLowerCase();
      currentQuestion.explainAnswer = explainText === 'true' || explainText === 'yes' || explainText === 'enabled';
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
        
        // Determine if multi-select
        currentQuestion.isMultiSelect = correctAnswers.size > 1;
      }
      
      // Shuffle options only if shuffleOptions is true (default behavior)
      if (currentQuestion.shuffleOptions !== false) {
        const seed = generateSeed(currentQuestion.text, currentQuestion.options);
        currentQuestion.options = seededShuffle(currentQuestion.options, seed);
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
            
            // Start new question
            currentQuestion = { id: questions.length, text: '', options: [], isMultiSelect: false, explainAnswer: false, shuffleOptions: true, multiSelectMode: 'all' };
            currentSection = 'question';
            questionBuffer = [];
            answerBuffer = [];
            explainAnswerBuffer = [];
            questionOptionsBuffer = [];
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
          } else if (sectionName === 'Type') {
            // Skip type section
            currentSection = null;
            continue;
          }
        }
      }
      
      if (currentSection === 'question' && currentQuestion) {
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
      processAnswers();
    }
    
    if (questions.length === 0) {
      throw new Error('No MCQ questions found');
    }
    
    return { type, question: null, mcq: { questions } };
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
        const blankMatch = itemLine.match(/\[\[blank:([^\]]+)\]\]/i);
        if (!blankMatch) continue;
        
        const answer = String(blankMatch[1]).trim();
        const textBeforeBlank = itemLine.replace(/\[\[blank:[^\]]+\]\]/gi, '').trim();
        
        // Render text without blank to HTML
        const textHtml = marked.parse(textBeforeBlank);
        
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
      requiredCounts.set(k, (requiredCounts.get(k) || 0) + 1);
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
    
    // Render markdown to HTML for prompt
    const promptHtml = prompt ? marked.parse(prompt) : '';
    
    return { 
      type, 
      question: null, 
      matching: { 
        raw: matchingMarkdown,
        prompt, 
        promptHtml, 
        items, 
        choices 
      } 
    };
  }

  if (/^text input$/i.test(type)) {
    // Parse Text Input with support for multiple questions
    const questions = [];
    const allTokens = Lexer.lex(markdownText);
    
    let currentQuestion = null;
    let currentSection = null;
    let questionBuffer = [];
    let answerBuffer = [];
    let contentSection = null;
    let contentBuffer = [];
    let headingBuffer = [];
    
    function processQuestion() {
      if (!currentQuestion || questionBuffer.length === 0) return;
      
      // Extract question text
      const questionText = questionBuffer.map(t => t.raw || t.text || '').join('\n').trim();
      currentQuestion.text = questionText;
      
      // Parse markdown to HTML for rendering (supports LaTeX, images, bold, etc.)
      if (currentQuestion.text) {
        currentQuestion.textHtml = marked.parse(currentQuestion.text);
      } else {
        currentQuestion.textHtml = '';
      }
    }
    
    function parseValidationOptions(answerText) {
      // Parse validation options from answer text
      // Format: "answer [kind: string|numeric|numeric-with-units] [options: key=value,key=value]"
      // Examples:
      // "Hello World [kind: string] [options: caseInsensitive=true,fuzzy=false]"
      // "42.5 [kind: numeric] [options: threshold=0.01,precision=2]"
      // "100 kg [kind: numeric-with-units] [options: threshold=0.1,precision=1,units=kg,g]"
      
      const validationMatch = answerText.match(/^(.+?)(?:\s+\[kind:\s*([^\]]+)\])?(?:\s+\[options:\s*([^\]]+)\])?$/);
      if (!validationMatch) {
        return {
          correctAnswer: answerText.trim(),
          validation: {}
        };
      }
      
      const correctAnswer = validationMatch[1].trim();
      const kind = validationMatch[2] ? validationMatch[2].trim() : 'string';
      const optionsText = validationMatch[3] ? validationMatch[3].trim() : '';
      
      // Parse options
      const options = {};
      if (optionsText) {
        const optionPairs = optionsText.split(',');
        optionPairs.forEach(pair => {
          const [key, value] = pair.split('=').map(s => s.trim());
          if (key && value !== undefined) {
            // Convert string booleans and numbers
            if (value === 'true') {
              options[key] = true;
            } else if (value === 'false') {
              options[key] = false;
            } else if (!isNaN(value)) {
              options[key] = parseFloat(value);
            } else {
              options[key] = value;
            }
          }
        });
      }
      
      // Parse units if present (comma-separated list)
      if (kind === 'numeric-with-units' && options.units) {
        if (typeof options.units === 'string') {
          options.units = options.units.split(',').map(u => u.trim()).filter(Boolean);
        }
      }
      
      return {
        correctAnswer,
        validation: {
          kind,
          options
        }
      };
    }
    
    function processAnswers() {
      if (!currentQuestion || answerBuffer.length === 0) return;
      
      const answerItems = readListItems(answerBuffer);
      
      // For text-input, we expect a single correct answer per question
      // But we support multiple answers in case of multiple correct answers
      if (answerItems.length > 0) {
        // Use the first answer as the correct answer
        const answerText = answerItems[0].trim();
        const { correctAnswer, validation } = parseValidationOptions(answerText);
        
        currentQuestion.correctAnswer = correctAnswer;
        currentQuestion.validation = validation;
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
            
            // Start new question
            currentQuestion = { id: questions.length, text: '', correctAnswer: '', validation: {} };
            currentSection = 'question';
            questionBuffer = [];
            answerBuffer = [];
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
          } else if (sectionName === 'Content') {
            // Start content section
            currentSection = 'content';
            contentBuffer = [];
            continue;
          }
        }
      }
      
      if (currentSection === 'question' && currentQuestion) {
        questionBuffer.push(token);
      } else if (currentSection === 'answers' && currentQuestion) {
        answerBuffer.push(token);
      } else if (currentSection === 'content') {
        contentBuffer.push(token);
      } else if (currentSection === 'heading') {
        headingBuffer.push(token);
      }
    }
    
    // Process last question and answers
    if (currentQuestion) {
      processAnswers();
    }
    
    if (questions.length === 0) {
      throw new Error('No text input questions found');
    }
    
    // Process content section if present
    let content = null;
    if (contentBuffer.length > 0) {
      const contentText = contentBuffer.map(t => t.raw || t.text || '').join('\n').trim();
      if (contentText) {
        // Check if it's a URL (starts with http:// or https://)
        if (/^https?:\/\//i.test(contentText)) {
          const lines = contentText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const firstLine = lines[0] || '';
          const openInNewTab = /\[openInNewTab\]/i.test(contentText);
          const url = firstLine.replace(/\s+\[openInNewTab\]\s*$/i, '').trim();
          content = { url, openInNewTab: !!openInNewTab };
        } else {
          // Treat as markdown content
          content = { markdown: contentText };
        }
      }
    }
    
    // Process heading section if present
    let heading = null;
    if (headingBuffer.length > 0) {
      const headingText = headingBuffer.map(t => t.raw || t.text || '').join('\n').trim();
      if (headingText) {
        heading = { markdown: headingText, html: marked.parse(headingText) };
      }
    }
    
    return { type, question: null, textInput: { questions, content, heading } };
  }

  const labels = readListItems(sections.get('Labels'));
  if (/^sort into boxes$/i.test(type)) {
    let first = '', second = '';
    for (const entry of labels) {
      const [k, ...rest] = entry.split(':');
      const v = rest.join(':').trim();
      const nk = (k || '').toLowerCase();
      if (nk.includes('first')) first = v;
      if (nk.includes('second')) second = v;
    }
    const firstItems = readListItems(sections.get('First Box Items'));
    const secondItems = readListItems(sections.get('Second Box Items'));
    const items = [
      ...firstItems.map(text => ({ text, correct: 'first' })),
      ...secondItems.map(text => ({ text, correct: 'second' })),
    ];
    let s = (markdownText.length || 1337) % 2147483647 || 1337;
    function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    return { type, question, labels: { first, second }, items };
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
  const items = [
    ...leftItems.map(text => ({ text, correct: 'left' })),
    ...rightItems.map(text => ({ text, correct: 'right' })),
  ];
  let s = (markdownText.length || 1337) % 2147483647 || 1337;
  function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return { type, question, labels: { left, right }, items };
}

// Store active WebSocket connections
const clients = new Set();

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(urlObj.pathname || '/');

  // In edit mode, serve editor.html for root path
  if (EDIT_MODE && pathname === '/') {
    pathname = '/editor.html';
  }

  // API: /api/editor/load - Load markdown file for editing
  if (pathname === '/api/editor/load' && req.method === 'GET') {
    if (!EDIT_MODE || !EDIT_FILE_PATH) {
      respondJson(res, 400, { error: 'Editor mode not enabled' });
      return;
    }
    fs.readFile(EDIT_FILE_PATH, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, return empty structure
          respondJson(res, 200, { 
            markdown: '', 
            filePath: EDIT_FILE_PATH,
            questionType: EDIT_QUESTION_TYPE
          });
        } else {
          respondJson(res, 500, { error: 'Failed to read file' });
        }
        return;
      }
      respondJson(res, 200, { 
        markdown: data, 
        filePath: EDIT_FILE_PATH,
        questionType: EDIT_QUESTION_TYPE
      });
    });
    return;
  }

  // API: /api/editor/save - Save markdown file
  if (pathname === '/api/editor/save' && req.method === 'POST') {
    if (!EDIT_MODE || !EDIT_FILE_PATH) {
      respondJson(res, 400, { error: 'Editor mode not enabled' });
      return;
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const markdown = data.markdown || '';
        
        // Ensure directory exists
        const dir = path.dirname(EDIT_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFile(EDIT_FILE_PATH, markdown, 'utf8', (err) => {
          if (err) {
            respondJson(res, 500, { error: 'Failed to save file' });
            return;
          }
          respondJson(res, 200, { success: true, filePath: EDIT_FILE_PATH });
        });
      } catch (e) {
        respondJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // API: /api/activity
  if (pathname === '/api/activity') {
    const activityFile = path.join(DATA_DIR, 'question.md');
    fs.readFile(activityFile, 'utf8', (err, data) => {
      if (err) {
        respondJson(res, 404, { error: 'Activity file not found' });
        return;
      }
      try {
        const activity = buildActivityFromMarkdown(data);
        respondJson(res, 200, activity);
      } catch (e) {
        respondJson(res, 500, { error: 'Failed to parse markdown' });
      }
    });
    return;
  }

  // API: /api/answers
  if (pathname === '/api/answers') {
    const answerFile = path.join(DATA_DIR, 'answer.md');
    const activityFile = path.join(DATA_DIR, 'question.md');
    
    // Read both answer.md and question.md to map result indices to question IDs
    fs.readFile(answerFile, 'utf8', (err, answerData) => {
      if (err) {
        // If file doesn't exist, return empty answers
        respondJson(res, 200, { answers: null, type: null, explanations: null });
        return;
      }
      
      // Also read activity to map indices to question IDs
      fs.readFile(activityFile, 'utf8', (err, activityData) => {
        if (err) {
          // If activity file doesn't exist, just return parsed answers without mapping
          try {
            const parsed = parseAnswersFromMarkdown(answerData);
            const { answers, type, explanations } = parsed;
            respondJson(res, 200, { answers, type, explanations: explanations || null });
          } catch (e) {
            respondJson(res, 500, { error: 'Failed to parse answers' });
          }
          return;
        }
        
        try {
          const parsed = parseAnswersFromMarkdown(answerData);
          let { answers, type, explanations } = parsed;
          
          // For MCQ, map result indices to question IDs
          if (/^multiple choice$/i.test(type) && explanations) {
            const activity = buildActivityFromMarkdown(activityData);
            if (activity && activity.mcq && activity.mcq.questions) {
              // Map explanations from result index to question ID
              // Result indices (0, 1, 2, 3...) should match question IDs (0, 1, 2, 3...)
              // since questions are created sequentially
              const mappedExplanations = {};
              Object.keys(explanations).forEach(resultIndex => {
                const idx = parseInt(resultIndex, 10);
                if (idx >= 0 && idx < activity.mcq.questions.length) {
                  const questionId = activity.mcq.questions[idx].id;
                  mappedExplanations[questionId] = explanations[resultIndex];
                }
              });
              explanations = mappedExplanations;
            }
          }
          
          respondJson(res, 200, { answers, type, explanations: explanations || null });
        } catch (e) {
          respondJson(res, 500, { error: 'Failed to parse answers' });
        }
      });
    });
    return;
  }

  // API: /validate
  if (pathname === '/validate' && req.method === 'POST') {
    // Send message to all connected WebSocket clients
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'validate' }));
      }
    });
    
    respondJson(res, 200, { 
      status: 'success', 
      message: 'Validation message sent to all connected clients',
      clientCount: clients.size
    });
    return;
  }

  // API: /api/content/markdown - Render markdown content for iframe
  if (pathname === '/api/content/markdown' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const markdown = data.markdown || '';
        const html = marked.parse(markdown);
        
        // Return HTML wrapped in a proper document with styles
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content</title>
  <link rel="stylesheet" href="/design-system/colors/colors.css" />
  <link rel="stylesheet" href="/design-system/typography/typography.css" />
  <link rel="stylesheet" href="/design-system/spacing/spacing.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
  <style>
    body {
      margin: 0;
      padding: 1.5rem;
      background-color: var(--Colors-Backgrounds-Main-Top);
      color: var(--Colors-Text-Body-Default);
      font-family: var(--body-family);
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: var(--Colors-Backgrounds-Main-Top);
        color: var(--Colors-Text-Body-Default);
      }
    }
  </style>
</head>
<body>
  <div class="body-medium">${html}</div>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '\\\\[', right: '\\\\]', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false}
          ],
          throwOnError: false
        });
      }
    });
  </script>
</body>
</html>`;
        
        res.writeHead(200, { 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        res.end(fullHtml);
      } catch (e) {
        respondJson(res, 400, { error: 'Invalid request' });
      }
    });
    return;
  }

  // API: /api/results
  if (pathname === '/api/results' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const answerFile = path.join(DATA_DIR, 'answer.md');
        
        // Format results as markdown
        const activity = data.activity;
        
        // Helper function for array comparison
        function arraysEqual(a, b) {
          if (a.length !== b.length) return false;
          const sortedA = [...a].sort();
          const sortedB = [...b].sort();
          return sortedA.every((val, idx) => val === sortedB[idx]);
        }
        
        // Calculate Levenshtein distance between two strings
        function levenshteinDistance(str1, str2) {
          const len1 = str1.length;
          const len2 = str2.length;
          const matrix = [];
          
          // Initialize matrix
          for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
          }
          
          // Fill matrix
          for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
              if (str1[i - 1] === str2[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j] + 1,     // deletion
                  matrix[i][j - 1] + 1,     // insertion
                  matrix[i - 1][j - 1] + 1  // substitution
                );
              }
            }
          }
          
          return matrix[len1][len2];
        }
        
        // Calculate similarity percentage (0-1) between two strings
        function calculateSimilarity(str1, str2) {
          const maxLen = Math.max(str1.length, str2.length);
          if (maxLen === 0) return 1.0;
          
          const distance = levenshteinDistance(str1, str2);
          return 1 - (distance / maxLen);
        }
        
        // Validation functions for text input
        function validateTextInputString(userAnswer, correctAnswer, options = {}) {
          const caseSensitive = options.caseSensitive === true; // Default false (case-insensitive)
          const fuzzy = options.fuzzy; // Can be true, false, or a number (0-1)
          
          let user = String(userAnswer).trim();
          let correct = String(correctAnswer).trim();
          
          if (!caseSensitive) {
            // Default to case-insensitive matching
            user = user.toLowerCase();
            correct = correct.toLowerCase();
          }
          
          // Handle fuzzy matching
          if (fuzzy !== false && fuzzy !== undefined) {
            // Normalize fuzzy threshold: true = 0.8, number = that number
            let threshold = fuzzy === true ? 0.8 : parseFloat(fuzzy);
            
            // If threshold is invalid, default to 0.8
            if (isNaN(threshold) || threshold < 0 || threshold > 1) {
              threshold = 0.8;
            }
            
            // Normalize spacing and punctuation
            const normalizedUser = user.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
            const normalizedCorrect = correct.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
            
            // If exact match after normalization, accept
            if (normalizedUser === normalizedCorrect) {
              return true;
            }
            
            // Calculate similarity and compare to threshold
            const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
            return similarity >= threshold;
          }
          
          // No fuzzy matching - exact match required
          return user === correct;
        }
        
        function validateTextInputNumeric(userAnswer, correctAnswer, options = {}) {
          const threshold = options.threshold !== undefined ? options.threshold : 0.01;
          const precision = options.precision !== undefined ? options.precision : 2;
          
          const user = parseFloat(userAnswer);
          const correct = parseFloat(correctAnswer);
          
          if (isNaN(user) || isNaN(correct)) {
            return false;
          }
          
          // Round to specified precision
          const userRounded = Math.round(user * Math.pow(10, precision)) / Math.pow(10, precision);
          const correctRounded = Math.round(correct * Math.pow(10, precision)) / Math.pow(10, precision);
          
          return Math.abs(userRounded - correctRounded) <= threshold;
        }
        
        function validateTextInputNumericWithUnits(userAnswer, correctAnswer, options = {}) {
          const threshold = options.threshold !== undefined ? options.threshold : 0.01;
          const precision = options.precision !== undefined ? options.precision : 2;
          const units = options.units || [];
          
          // Escape unit symbols for regex (handle special regex characters)
          const escapedUnits = units.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          const unitsPattern = escapedUnits.length > 0 ? escapedUnits.join('|') : '';
          
          // Remove unit symbols and any whitespace from user answer (similar to currency)
          let userStr = String(userAnswer).trim();
          if (unitsPattern) {
            // Remove unit symbols (could be at start or end, with or without space)
            const unitRegex = new RegExp(`^\\s*(${unitsPattern})\\s*|\\s*(${unitsPattern})\\s*$`, 'gi');
            userStr = userStr.replace(unitRegex, '');
            userStr = userStr.trim();
          }
          
          // Remove unit symbols from correct answer
          let correctStr = String(correctAnswer).trim();
          if (unitsPattern) {
            const unitRegex = new RegExp(`^\\s*(${unitsPattern})\\s*|\\s*(${unitsPattern})\\s*$`, 'gi');
            correctStr = correctStr.replace(unitRegex, '');
            correctStr = correctStr.trim();
          }
          
          // Normalize decimal separators: replace comma with period
          // This allows both "4.50" and "4,50" to be accepted
          userStr = userStr.replace(',', '.');
          correctStr = correctStr.replace(',', '.');
          
          // Parse numeric values (parseFloat handles trailing zeros automatically: 4.50 = 4.5)
          const userValue = parseFloat(userStr);
          const correctValue = parseFloat(correctStr);
          
          if (isNaN(userValue) || isNaN(correctValue)) {
            return false;
          }
          
          // Compare numeric values directly (parseFloat normalizes trailing zeros)
          // Use threshold to allow small differences
          return Math.abs(userValue - correctValue) <= threshold;
        }
        
        function validateTextInputNumericWithCurrency(userAnswer, correctAnswer, options = {}) {
          const threshold = options.threshold !== undefined ? options.threshold : 0.01;
          const currency = options.currency !== undefined ? options.currency : '$';
          
          // Escape currency symbol for regex
          const escapedCurrency = currency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Remove currency symbol and any whitespace from user answer
          let userStr = String(userAnswer).trim();
          // Remove currency symbol (could be at start or end, with or without space)
          userStr = userStr.replace(new RegExp(`^\\s*${escapedCurrency}\\s*|\\s*${escapedCurrency}\\s*$`, 'g'), '');
          userStr = userStr.trim();
          
          // Remove currency symbol from correct answer
          let correctStr = String(correctAnswer).trim();
          correctStr = correctStr.replace(new RegExp(`^\\s*${escapedCurrency}\\s*|\\s*${escapedCurrency}\\s*$`, 'g'), '');
          correctStr = correctStr.trim();
          
          // Normalize decimal separators: replace comma with period
          // This allows both "4.50" and "4,50" to be accepted
          userStr = userStr.replace(',', '.');
          correctStr = correctStr.replace(',', '.');
          
          // Parse numeric values (parseFloat handles trailing zeros automatically: 4.50 = 4.5)
          const userValue = parseFloat(userStr);
          const correctValue = parseFloat(correctStr);
          
          if (isNaN(userValue) || isNaN(correctValue)) {
            return false;
          }
          
          // Compare numeric values directly (parseFloat normalizes trailing zeros)
          // Use threshold to allow small differences
          return Math.abs(userValue - correctValue) <= threshold;
        }
        
        function validateTextInputAnswer(question, userAnswer) {
          const validation = question.validation || {};
          
          // Skip validation for "validate-later" type - return null to exclude from scoring
          if (validation.kind === 'validate-later') {
            return null;
          }
          
          if (!userAnswer || !userAnswer.trim()) {
            return false;
          }
          
          const options = validation.options || {};
          
          switch (validation.kind) {
            case 'string':
              return validateTextInputString(userAnswer, question.correctAnswer, options);
            case 'numeric':
              return validateTextInputNumeric(userAnswer, question.correctAnswer, options);
            case 'numeric-with-units':
              return validateTextInputNumericWithUnits(userAnswer, question.correctAnswer, options);
            case 'numeric-with-currency':
              return validateTextInputNumericWithCurrency(userAnswer, question.correctAnswer, options);
            default:
              // Default to exact string match (case-insensitive)
              return validateTextInputString(userAnswer, question.correctAnswer, { caseSensitive: false });
          }
        }
        
        // For MCQ, compare sorted arrays; for Text Input, use validation logic; for others, exact string match
        const correctCount = data.results.filter(result => {
          if (activity && /^multiple choice$/i.test(activity.type)) {
            // For MCQ, check based on multi-select mode
            const questionIndex = parseInt(result.text.replace('Question ', '')) - 1;
            if (activity.mcq && activity.mcq.questions && activity.mcq.questions[questionIndex]) {
              const question = activity.mcq.questions[questionIndex];
              const selected = (result.selected || '').split(',').map(s => s.trim()).filter(Boolean);
              const correct = (result.correct || '').split(',').map(s => s.trim()).filter(Boolean);
              
              // Check if "any" mode is enabled
              if (question.isMultiSelect && question.multiSelectMode === 'any') {
                // For "any" mode: at least one correct answer selected, and no incorrect answers
                const hasCorrectAnswer = selected.some(sel => correct.includes(sel));
                const hasIncorrectAnswer = selected.some(sel => !correct.includes(sel));
                return hasCorrectAnswer && !hasIncorrectAnswer && selected.length > 0;
              } else {
                // For "all" mode (default): must match exactly
                return arraysEqual(selected.sort(), correct.sort());
              }
            }
            // Fallback to exact match if question not found
            const selected = (result.selected || '').split(',').map(s => s.trim()).filter(Boolean).sort().join(', ');
            const correct = (result.correct || '').split(',').map(s => s.trim()).filter(Boolean).sort().join(', ');
            return selected === correct;
          } else if (activity && /^text input$/i.test(activity.type)) {
            // For Text Input, use validation logic based on question validation options
            const questionIndex = parseInt(result.text.replace('Question ', '')) - 1;
            if (activity.textInput && activity.textInput.questions && activity.textInput.questions[questionIndex]) {
              const question = activity.textInput.questions[questionIndex];
              const validationResult = validateTextInputAnswer(question, result.selected);
              // Exclude "validate-later" questions from scoring (null result)
              return validationResult === true;
            }
            // Fallback to simple string comparison if question not found
            return result.selected === result.correct;
          }
          return result.selected === result.correct;
        }).length;
        
        // Count validate-later questions for text input
        let validateLaterCount = 0;
        if (activity && /^text input$/i.test(activity.type)) {
          validateLaterCount = data.results.filter(result => {
            const questionIndex = parseInt(result.text.replace('Question ', '')) - 1;
            if (activity.textInput && activity.textInput.questions && activity.textInput.questions[questionIndex]) {
              const question = activity.textInput.questions[questionIndex];
              return question.validation && question.validation.kind === 'validate-later';
            }
            return false;
          }).length;
        }
        
        // Total count excludes "validate-later" questions from scoring
        const totalCount = data.results.length - validateLaterCount;
        
        let markdown = '';
        
        // Include original activity details
        if (activity) {
          markdown += `__Type__\n\n${activity.type}\n\n`;
          
          // Add results section with summary
          let summaryText = `${correctCount}/${totalCount} correct`;
          if (validateLaterCount > 0) {
            summaryText += `\n${validateLaterCount} unvalidated`;
          }
          markdown += `__Summary__\n\n${summaryText}\n\n`;
          markdown += '__Responses__\n\n';
          
          data.results.forEach((result, index) => {
            markdown += `${index + 1}. **${result.text}**\n`;
            markdown += `   - Selected Answer: ${result.selected || 'No answer selected'}\n`;
            markdown += `   - Correct Answer: ${result.correct}\n`;
            // For MCQ, compare based on multi-select mode; for Text Input, use validation logic; for others, exact match
            let isCorrect = false;
            let isValidateLater = false;
            if (activity && /^multiple choice$/i.test(activity.type)) {
              const questionIndex = parseInt(result.text.replace('Question ', '')) - 1;
              if (activity.mcq && activity.mcq.questions && activity.mcq.questions[questionIndex]) {
                const question = activity.mcq.questions[questionIndex];
                const selected = (result.selected || '').split(',').map(s => s.trim()).filter(Boolean);
                const correct = (result.correct || '').split(',').map(s => s.trim()).filter(Boolean);
                
                // Add Multi Mode line if question has multiple correct answers
                if (question.isMultiSelect) {
                  const multiMode = question.multiSelectMode === 'any' ? 'any' : 'all';
                  markdown += `   - Multi Mode: ${multiMode}\n`;
                }
                
                // Check if "any" mode is enabled
                if (question.isMultiSelect && question.multiSelectMode === 'any') {
                  // For "any" mode: at least one correct answer selected, and no incorrect answers
                  const hasCorrectAnswer = selected.some(sel => correct.includes(sel));
                  const hasIncorrectAnswer = selected.some(sel => !correct.includes(sel));
                  isCorrect = hasCorrectAnswer && !hasIncorrectAnswer && selected.length > 0;
                } else {
                  // For "all" mode (default): must match exactly
                  isCorrect = arraysEqual(selected.sort(), correct.sort());
                }
              } else {
                // Fallback to exact match if question not found
                const selected = (result.selected || '').split(',').map(s => s.trim()).filter(Boolean).sort().join(', ');
                const correct = (result.correct || '').split(',').map(s => s.trim()).filter(Boolean).sort().join(', ');
                isCorrect = selected === correct;
              }
            } else if (activity && /^text input$/i.test(activity.type)) {
              // For Text Input, use validation logic based on question validation options
              const questionIndex = parseInt(result.text.replace('Question ', '')) - 1;
              if (activity.textInput && activity.textInput.questions && activity.textInput.questions[questionIndex]) {
                const question = activity.textInput.questions[questionIndex];
                isValidateLater = question.validation && question.validation.kind === 'validate-later';
                if (isValidateLater) {
                  // Skip validation for validate-later questions
                } else {
                  const validationResult = validateTextInputAnswer(question, result.selected);
                  isCorrect = validationResult === true;
                }
              } else {
                // Fallback to simple string comparison if question not found
                isCorrect = result.selected === result.correct;
              }
            } else {
              isCorrect = result.selected === result.correct;
            }
            
            // Show result status
            if (isValidateLater) {
              markdown += `   - Result: Unvalidated\n`;
            } else {
              markdown += `   - Result: ${isCorrect ? '✓ Correct' : '✗ Incorrect'}\n`;
            }
            
            // Add explanation if present (for MCQ questions with explainAnswer enabled)
            if (result.explanation) {
              markdown += `   - Explanation: ${result.explanation}\n`;
            }
            markdown += '\n';
          });

          if (/^fill in the blanks$/i.test(activity.type)) {
            // For fill-in-the-blanks, include the original markdown with blanks
            markdown += `__Markdown With Blanks__\n\n${activity.fib.raw}\n\n`;
            markdown += `__Suggested Answers__\n\n`;
            activity.fib.choices.forEach(choice => {
              markdown += `- ${choice}\n`;
            });
            markdown += '\n';
          } else if (/^multiple choice$/i.test(activity.type)) {
            // For MCQ, include each question with options and suggested answers
            if (activity.mcq && activity.mcq.questions) {
              activity.mcq.questions.forEach((q, qIdx) => {
                markdown += `__Practice Question__\n\n${q.text}\n\n`;
                q.options.forEach(opt => {
                  markdown += `${opt.label}. ${opt.text}\n`;
                });
                markdown += '\n';
                markdown += `__Suggested Answers__\n\n`;
                q.options.forEach(opt => {
                  const correctMarker = opt.correct ? ' - Correct' : '';
                  markdown += `- ${opt.label}${correctMarker}\n`;
                });
                markdown += '\n';
              });
            }
          } else if (/^matching$/i.test(activity.type)) {
            // For Matching, include the original markdown with blanks
            markdown += `__Markdown With Blanks__\n\n${activity.matching.raw}\n\n`;
            markdown += `__Suggested Answers__\n\n`;
            activity.matching.choices.forEach(choice => {
              markdown += `- ${choice}\n`;
            });
            markdown += '\n';
          } else if (/^text input$/i.test(activity.type)) {
            // For Text Input, include each question with correct answers
            if (activity.textInput && activity.textInput.questions) {
              activity.textInput.questions.forEach((q, qIdx) => {
                markdown += `__Practice Question__\n\n${q.text}\n\n`;
                markdown += `__Correct Answers__\n\n`;
                // Build answer string with validation options
                let answerStr = q.correctAnswer;
                if (q.validation && q.validation.kind) {
                  answerStr += ` [kind: ${q.validation.kind}]`;
                  if (q.validation.options && Object.keys(q.validation.options).length > 0) {
                    const optionsStr = Object.entries(q.validation.options)
                      .map(([key, value]) => {
                        if (Array.isArray(value)) {
                          return `${key}=${value.join(',')}`;
                        }
                        return `${key}=${value}`;
                      })
                      .join(',');
                    answerStr += ` [options: ${optionsStr}]`;
                  }
                }
                markdown += `- ${answerStr}\n`;
                markdown += '\n';
              });
            }
          } else {
            // For swipe/sort activities, include question and labels
            if (activity.question) {
              markdown += `__Practice Question__\n\n${activity.question}\n\n`;
            }
            
            if (activity.labels) {
              markdown += `__Labels__\n\n`;
              if (/^sort into boxes$/i.test(activity.type)) {
                markdown += `- First Box Label: ${activity.labels.first || activity.labels.left || 'First Box'}\n`;
                markdown += `- Second Box Label: ${activity.labels.second || activity.labels.right || 'Second Box'}\n\n`;
              } else {
                markdown += `- Left: ${activity.labels.left || 'Left'}\n`;
                markdown += `- Right: ${activity.labels.right || 'Right'}\n\n`;
              }
            }
          }
        }
        
        fs.writeFile(answerFile, markdown, 'utf8', (err) => {
          if (err) {
            respondJson(res, 500, { error: 'Failed to save results' });
            return;
          }
          respondJson(res, 200, { success: true });
        });
      } catch (e) {
        respondJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const fsPath = path.join(PUBLIC_DIR, pathname);

  // Prevent directory traversal
  if (!isPathInside(fsPath, PUBLIC_DIR) && fsPath !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(fsPath, (err, stats) => {
    if (err) {
      // Fallback to index.html for unknown paths (single page app behavior)
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(fallback)) {
        sendFile(res, fallback, 200);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      }
      return;
    }
    if (stats.isDirectory()) {
      const indexPath = path.join(fsPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        sendFile(res, indexPath, 200);
      } else {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
      }
      return;
    }
    sendFile(res, fsPath, 200);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${PORT}`);
});

// Create WebSocket server using the ws module
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  // Add new client to the Set
  clients.add(ws);
  console.log('WebSocket connection established, total clients:', clients.size);
  
  // Handle WebSocket connection close
  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket connection closed, remaining clients:', clients.size);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});


