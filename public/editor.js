import Dropdown from '/design-system/components/dropdown/dropdown.js';

/** @returns {{ type: 'url'|'markdown', value: string, openInNewTab?: boolean, contentWidth?: string } | null} */
function parseContentTextToStructure(contentText) {
  if (!contentText || !String(contentText).trim()) return null;
  const contentWidthMatch = contentText.match(/\[contentWidth:\s*([^\]]+)\]/i);
  const contentWidth = contentWidthMatch ? contentWidthMatch[1].trim() : null;
  const contentWithoutWidth = contentWidthMatch
    ? contentText.replace(/\s*\[contentWidth:\s*[^\]]+\]\s*/gi, '').trim()
    : contentText;

  if (/^https?:\/\//i.test(contentWithoutWidth)) {
    const openInNewTab = /\[openInNewTab\]/i.test(contentWithoutWidth);
    const url = contentWithoutWidth.replace(/\s+\[openInNewTab\]\s*$/im, '').trim();
    const out = { type: 'url', value: url, openInNewTab: !!openInNewTab };
    if (contentWidth) out.contentWidth = contentWidth;
    return out;
  }
  const out = { type: 'markdown', value: contentWithoutWidth };
  if (contentWidth) out.contentWidth = contentWidth;
  return out;
}

// Parse markdown into editable structure
function parseMarkdownToStructure(markdown) {
  const lines = markdown.split('\n');
  const structure = {
    type: 'Text Input',
    questions: [],
    content: null
  };

  let currentSection = null;
  let currentQuestion = null;
  let questionBuffer = [];
  let answerBuffer = [];
  let contentBuffer = [];
  let headingBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(/^__([^_]+)__\s*$/);

    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim();

      // Process previous question if switching sections
      if (currentSection === 'question' && currentQuestion) {
        currentQuestion.text = questionBuffer.join('\n').trim();
        questionBuffer = [];
      } else if (currentSection === 'answers' && currentQuestion) {
        // Parse answer with validation options
        const answerText = answerBuffer.join('\n').trim();
        const answerMatch = answerText.match(/^-\s*(.+)$/m);
        if (answerMatch) {
          const answerLine = answerMatch[1];
          const { correctAnswer, validation } = parseAnswerLine(answerLine);
          currentQuestion.correctAnswer = correctAnswer;
          currentQuestion.validation = validation;
        }
        structure.questions.push(currentQuestion);
        answerBuffer = [];
        currentQuestion = null;
      }

      // Handle section transitions
      if (sectionName === 'Type') {
        currentSection = 'type';
      } else if (sectionName === 'Practice Question') {
        currentSection = 'question';
        currentQuestion = {
          text: '',
          correctAnswer: '',
          validation: { kind: 'string', options: {} }
        };
        questionBuffer = [];
      } else if (sectionName === 'Correct Answers' || sectionName === 'Suggested Answers') {
        currentSection = 'answers';
        answerBuffer = [];
      } else if (sectionName === 'Content') {
        currentSection = 'content';
        contentBuffer = [];
      } else if (sectionName === 'Heading') {
        currentSection = 'heading';
        headingBuffer = [];
      } else {
        currentSection = null;
      }
      continue;
    }

    // Accumulate content based on current section
    if (currentSection === 'type') {
      structure.type = line.trim() || 'Text Input';
    } else if (currentSection === 'question' && currentQuestion) {
      questionBuffer.push(line);
    } else if (currentSection === 'answers' && currentQuestion) {
      answerBuffer.push(line);
    } else if (currentSection === 'content') {
      contentBuffer.push(line);
    } else if (currentSection === 'heading') {
      headingBuffer.push(line);
    }
  }

  // Process heading
  if (headingBuffer.length > 0) {
    const headingText = headingBuffer.join('\n').trim();
    if (headingText) {
      structure.heading = { value: headingText };
    }
  }

  // Process last question if exists
  if (currentQuestion) {
    if (questionBuffer.length > 0) {
      currentQuestion.text = questionBuffer.join('\n').trim();
    }
    if (answerBuffer.length > 0) {
      const answerText = answerBuffer.join('\n').trim();
      // Match answer line: "- answer text [kind: ...]" or "- [kind: ...]" (empty answer)
      const answerMatch = answerText.match(/^-\s*(.+)$/m);
      if (answerMatch) {
        const answerLine = answerMatch[1].trim();
        const { correctAnswer, validation } = parseAnswerLine(answerLine);
        currentQuestion.correctAnswer = correctAnswer;
        currentQuestion.validation = validation;
      }
      structure.questions.push(currentQuestion);
    }
  }

  if (contentBuffer.length > 0) {
    const contentText = contentBuffer.join('\n').trim();
    if (contentText) {
      structure.content = parseContentTextToStructure(contentText);
    }
  }

  return structure;
}

// Parse options string into options object
function parseOptions(optionsText) {
  const options = {};
  if (optionsText && optionsText.trim()) {
    const optionPairs = optionsText.split(',');
    optionPairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value !== undefined) {
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
  return options;
}

// Parse answer line with validation options
// Format: "answer [kind: string] [options: key=value,key=value]"
// Also handles empty answers: "[kind: string] [options: ...]"
function parseAnswerLine(answerLine) {
  // Check if the line starts with [kind: (empty answer case)
  const trimmedLine = answerLine.trim();
  const startsWithKind = trimmedLine.startsWith('[kind:');
  
  let validationMatch;
  if (startsWithKind) {
    // Handle case where answer is empty: "[kind: string] [options: ...]"
    validationMatch = trimmedLine.match(/^\[kind:\s*([^\]]+)\](?:\s+\[options:\s*([^\]]+)\])?$/);
    if (validationMatch) {
      return {
        correctAnswer: '',
        validation: {
          kind: validationMatch[1] ? validationMatch[1].trim() : 'string',
          options: parseOptions(validationMatch[2])
        }
      };
    }
  } else {
    // Normal case: "answer [kind: string] [options: ...]"
    validationMatch = trimmedLine.match(/^(.+?)(?:\s+\[kind:\s*([^\]]+)\])?(?:\s+\[options:\s*([^\]]+)\])?$/);
  }
  
  if (!validationMatch) {
    return {
      correctAnswer: trimmedLine,
      validation: { kind: 'string', options: {} }
    };
  }

  const correctAnswer = startsWithKind ? '' : validationMatch[1].trim();
  const kind = (startsWithKind ? validationMatch[1] : validationMatch[2]) ? 
    (startsWithKind ? validationMatch[1].trim() : validationMatch[2].trim()) : 'string';
  const optionsText = (startsWithKind ? validationMatch[2] : validationMatch[3]) ? 
    (startsWithKind ? validationMatch[2] : validationMatch[3].trim()) : '';

  const options = parseOptions(optionsText);

  // Parse units if present
  if (kind === 'numeric-with-units' && options.units) {
    if (typeof options.units === 'string') {
      options.units = options.units.split(',').map(u => u.trim()).filter(Boolean);
    }
  }

  return {
    correctAnswer,
    validation: { kind, options }
  };
}

// Convert structure back to markdown
function structureToMarkdown(structure) {
  let markdown = `__Type__\n\n${structure.type}\n\n`;

  // Add heading if present
  if (structure.heading && structure.heading.value) {
    markdown += `__Heading__\n\n${structure.heading.value}\n\n`;
  }

  // Add questions
  structure.questions.forEach((q, index) => {
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
    markdown += `- ${answerStr}\n\n`;
  });

  // Add content if present
  if (structure.content && structure.content.value) {
    let contentValue = structure.content.value;
    if (structure.content.type === 'url') {
      if (structure.content.openInNewTab) contentValue += ' [openInNewTab]';
      if (structure.content.contentWidth) contentValue += ` [contentWidth: ${structure.content.contentWidth}]`;
    } else {
      if (structure.content.contentWidth) contentValue += `\n[contentWidth: ${structure.content.contentWidth}]`;
    }
    markdown += `__Content__\n\n${contentValue}\n\n`;
  }

  return markdown;
}

// Debounce function for auto-save
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Save markdown to server
async function saveMarkdown(markdown) {
  const saveStatus = document.getElementById('save-status');

  try {
    const response = await fetch('/api/editor/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ markdown })
    });

    if (!response.ok) {
      throw new Error('Failed to save');
    }

    // Only show status on error, silently save otherwise
    saveStatus.classList.add('hidden');
  } catch (error) {
    saveStatus.textContent = 'Error saving';
    saveStatus.className = 'save-status error';
    saveStatus.classList.remove('hidden');
  }
}

// Load markdown from server
async function loadMarkdown() {
  try {
    const response = await fetch('/api/editor/load');
    if (!response.ok) {
      throw new Error('Failed to load');
    }
    const data = await response.json();
    const qt = data.questionType;
    const questionType =
      qt != null && String(qt).trim() ? String(qt).trim() : null;
    return {
      markdown: data.markdown || '',
      questionType,
      copyMarkdownEnabled: data.copyMarkdownEnabled === true
    };
  } catch (error) {
    console.error('Error loading markdown:', error);
    return { markdown: '', questionType: null, copyMarkdownEnabled: false };
  }
}

/** @returns {Promise<string>} */
function promptForQuestionType() {
  return new Promise((resolve) => {
    const screen = document.getElementById('type-picker-screen');
    const dropdownContainer = document.getElementById('type-picker-dropdown');
    const continueBtn = document.getElementById('type-picker-continue');
    if (!screen || !dropdownContainer || !continueBtn) {
      resolve('Text Input');
      return;
    }

    let selected = 'Text Input';
    dropdownContainer.innerHTML = '';
    new Dropdown(dropdownContainer, {
      items: [
        { value: 'Text Input', label: 'Text Input' },
        { value: 'Multiple Choice', label: 'Multiple Choice' },
        { value: 'Matrix', label: 'Matrix' },
        { value: 'Fill in the blanks', label: 'Fill in the blanks' },
        { value: 'Matching', label: 'Matching' }
      ],
      selectedValue: 'Text Input',
      growToFit: false,
      onSelect: (value) => {
        selected = value;
      }
    });

    function onContinue() {
      continueBtn.removeEventListener('click', onContinue);
      resolve(selected);
    }

    continueBtn.addEventListener('click', onContinue);
  });
}

// Render question item
function renderQuestion(question, index) {
  const container = document.createElement('div');
  container.className = 'box card non-interactive question-item';
  container.dataset.index = index;

  const header = document.createElement('div');
  header.className = 'question-item-header';
  
  const title = document.createElement('div');
  title.className = 'question-item-title';
  title.textContent = `Question ${index + 1}`;

  const kindDropdownContainer = document.createElement('div');
  kindDropdownContainer.style.marginLeft = 'var(--UI-Spacing-spacing-l)';
  kindDropdownContainer.style.width = '240px';
  
  const kindDropdown = new Dropdown(kindDropdownContainer, {
    items: [
      { value: 'string', label: 'String' },
      { value: 'numeric', label: 'Numeric' },
      { value: 'numeric-with-units', label: 'Numeric with Units' },
      { value: 'numeric-with-currency', label: 'Numeric with Currency' },
      { value: 'validate-later', label: 'Validate Later' }
    ],
    selectedValue: question.validation.kind || 'string',
    growToFit: false,
    onSelect: (value) => {
      question.validation.kind = value;
      updateStructure();
      renderValidationOptions(container, question, index);
    }
  });
  
  // Store dropdown instance for potential updates
  questionDropdowns.set(index, kindDropdown);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'button button-text button-danger';
  deleteBtn.textContent = 'Delete';
  if (currentStructure.questions.length <= 1) {
    deleteBtn.disabled = true;
    deleteBtn.classList.add('disabled');
  }
  deleteBtn.onclick = () => {
    // Don't allow deleting if it's the last question
    if (currentStructure.questions.length <= 1) {
      return;
    }
    const questionIndex = parseInt(container.dataset.index);
    // Clean up dropdown instance
    const dropdown = questionDropdowns.get(questionIndex);
    if (dropdown) {
      dropdown.destroy();
      questionDropdowns.delete(questionIndex);
    }
    currentStructure.questions.splice(questionIndex, 1);
    container.remove();
    // Re-render all questions to update indices and delete button states
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';
    questionDropdowns.clear(); // Clear all dropdown instances before re-rendering
    currentStructure.questions.forEach((q, idx) => {
      questionsContainer.appendChild(renderQuestion(q, idx));
    });
    updateStructure();
  };

  header.appendChild(title);
  header.appendChild(kindDropdownContainer);
  header.appendChild(deleteBtn);

  const questionTextArea = document.createElement('textarea');
  questionTextArea.className = 'form-textarea';
  questionTextArea.placeholder = 'Enter question text...';
  questionTextArea.value = question.text;
  questionTextArea.oninput = debounce(() => {
    question.text = questionTextArea.value;
    updateStructure();
  }, 300);

  const answerLabel = document.createElement('label');
  answerLabel.className = 'form-label';
  answerLabel.textContent = 'Correct Answer';
  answerLabel.setAttribute('for', `answer-${index}`);

  const answerInput = document.createElement('input');
  answerInput.type = 'text';
  answerInput.id = `answer-${index}`;
  answerInput.className = 'input';
  answerInput.style.boxSizing = 'border-box';
  answerInput.style.padding = 'var(--UI-Spacing-spacing-none) var(--UI-Spacing-spacing-ml)';
  answerInput.value = question.correctAnswer;
  answerInput.oninput = debounce(() => {
    question.correctAnswer = answerInput.value;
    updateStructure();
  }, 300);

  container.appendChild(header);
  container.appendChild(questionTextArea);
  container.appendChild(answerLabel);
  container.appendChild(answerInput);

  renderValidationOptions(container, question, index);

  return container;
}

// Render validation options based on kind
function renderValidationOptions(container, question, index) {
  // Remove existing validation options
  const existing = container.querySelector('.validation-options');
  if (existing) {
    existing.remove();
  }

  const kind = question.validation.kind || 'string';
  const options = question.validation.options || {};

  const validationDiv = document.createElement('div');
  validationDiv.className = 'validation-options';

  // "validate-later" type doesn't need validation options
  if (kind === 'validate-later') {
    container.appendChild(validationDiv);
    return;
  }

  if (kind === 'string') {
    // Case sensitive option
    const caseSensitiveDiv = document.createElement('div');
    caseSensitiveDiv.className = 'validation-option';
    const caseLabel = document.createElement('label');
    caseLabel.className = 'input-checkbox';
    const caseInput = document.createElement('input');
    caseInput.type = 'checkbox';
    caseInput.checked = options.caseSensitive === true;
    caseInput.onchange = () => {
      options.caseSensitive = caseInput.checked;
      updateStructure();
    };
    const caseBox = document.createElement('span');
    caseBox.className = 'input-checkbox-box';
    const caseCheckmark = document.createElement('span');
    caseCheckmark.className = 'input-checkbox-checkmark';
    caseBox.appendChild(caseCheckmark);
    const caseText = document.createElement('span');
    caseText.className = 'input-checkbox-label';
    caseText.textContent = 'Case Sensitive';
    caseLabel.appendChild(caseInput);
    caseLabel.appendChild(caseBox);
    caseLabel.appendChild(caseText);
    caseSensitiveDiv.appendChild(caseLabel);
    validationDiv.appendChild(caseSensitiveDiv);

    // Multi-line option
    const multiLineDiv = document.createElement('div');
    multiLineDiv.className = 'validation-option';
    const multiLineLabel = document.createElement('label');
    multiLineLabel.className = 'input-checkbox';
    const multiLineInput = document.createElement('input');
    multiLineInput.type = 'checkbox';
    multiLineInput.checked = options.multiLine === true;
    multiLineInput.onchange = () => {
      options.multiLine = multiLineInput.checked;
      updateStructure();
    };
    const multiLineBox = document.createElement('span');
    multiLineBox.className = 'input-checkbox-box';
    const multiLineCheckmark = document.createElement('span');
    multiLineCheckmark.className = 'input-checkbox-checkmark';
    multiLineBox.appendChild(multiLineCheckmark);
    const multiLineText = document.createElement('span');
    multiLineText.className = 'input-checkbox-label';
    multiLineText.textContent = 'Multi-line';
    multiLineLabel.appendChild(multiLineInput);
    multiLineLabel.appendChild(multiLineBox);
    multiLineLabel.appendChild(multiLineText);
    multiLineDiv.appendChild(multiLineLabel);
    validationDiv.appendChild(multiLineDiv);

    // Fuzzy option
    const fuzzyDiv = document.createElement('div');
    fuzzyDiv.className = 'validation-option';
    const fuzzyLabel = document.createElement('label');
    fuzzyLabel.className = 'form-label';
    fuzzyLabel.textContent = 'Fuzzy Matching';
    const fuzzyInput = document.createElement('input');
    fuzzyInput.type = 'text';
    fuzzyInput.className = 'input';
    fuzzyInput.placeholder = 'false, true, or 0.0-1.0';
    if (options.fuzzy !== undefined && options.fuzzy !== false) {
      fuzzyInput.value = options.fuzzy === true ? 'true' : options.fuzzy;
    }
    fuzzyInput.oninput = debounce(() => {
      const value = fuzzyInput.value.trim();
      if (value === 'true') {
        options.fuzzy = true;
      } else if (value === 'false' || value === '') {
        options.fuzzy = false;
      } else {
        const num = parseFloat(value);
        if (!isNaN(num) && num >= 0 && num <= 1) {
          options.fuzzy = num;
        }
      }
      updateStructure();
    }, 300);
    fuzzyDiv.appendChild(fuzzyLabel);
    fuzzyDiv.appendChild(fuzzyInput);
    validationDiv.appendChild(fuzzyDiv);
  } else if (kind === 'numeric' || kind === 'numeric-with-units' || kind === 'numeric-with-currency') {
    // Threshold option
    const thresholdDiv = document.createElement('div');
    thresholdDiv.className = 'validation-option';
    const thresholdLabel = document.createElement('label');
    thresholdLabel.className = 'form-label';
    thresholdLabel.textContent = 'Threshold';
    const thresholdInput = document.createElement('input');
    thresholdInput.type = 'number';
    thresholdInput.className = 'input';
    thresholdInput.step = '0.01';
    thresholdInput.value = options.threshold !== undefined ? options.threshold : (kind === 'numeric-with-currency' ? '0.01' : '0.01');
    thresholdInput.oninput = debounce(() => {
      const value = parseFloat(thresholdInput.value);
      if (!isNaN(value)) {
        options.threshold = value;
        updateStructure();
      }
    }, 300);
    thresholdDiv.appendChild(thresholdLabel);
    thresholdDiv.appendChild(thresholdInput);
    validationDiv.appendChild(thresholdDiv);

    // Precision option
    const precisionDiv = document.createElement('div');
    precisionDiv.className = 'validation-option';
    const precisionLabel = document.createElement('label');
    precisionLabel.className = 'form-label';
    precisionLabel.textContent = 'Precision';
    const precisionInput = document.createElement('input');
    precisionInput.type = 'number';
    precisionInput.className = 'input';
    precisionInput.step = '1';
    precisionInput.value = options.precision !== undefined ? options.precision : '2';
    precisionInput.oninput = debounce(() => {
      const value = parseInt(precisionInput.value);
      if (!isNaN(value)) {
        options.precision = value;
        updateStructure();
      }
    }, 300);
    precisionDiv.appendChild(precisionLabel);
    precisionDiv.appendChild(precisionInput);
    validationDiv.appendChild(precisionDiv);

    // Units option (for numeric-with-units)
    if (kind === 'numeric-with-units') {
      const unitsDiv = document.createElement('div');
      unitsDiv.className = 'validation-option';
      const unitsLabel = document.createElement('label');
      unitsLabel.className = 'form-label';
      unitsLabel.textContent = 'Units (comma-separated)';
      const unitsInput = document.createElement('input');
      unitsInput.type = 'text';
      unitsInput.className = 'input';
      unitsInput.placeholder = 'kg, g, lb';
      if (options.units && Array.isArray(options.units)) {
        unitsInput.value = options.units.join(', ');
      }
      unitsInput.oninput = debounce(() => {
        const units = unitsInput.value.split(',').map(u => u.trim()).filter(Boolean);
        if (units.length > 0) {
          options.units = units;
        } else {
          delete options.units;
        }
        updateStructure();
      }, 300);
      unitsDiv.appendChild(unitsLabel);
      unitsDiv.appendChild(unitsInput);
      validationDiv.appendChild(unitsDiv);
    }

    // Currency option (for numeric-with-currency)
    if (kind === 'numeric-with-currency') {
      const currencyDiv = document.createElement('div');
      currencyDiv.className = 'validation-option';
      const currencyLabel = document.createElement('label');
      currencyLabel.className = 'form-label';
      currencyLabel.textContent = 'Currency Symbol';
      const currencyInput = document.createElement('input');
      currencyInput.type = 'text';
      currencyInput.className = 'input';
      currencyInput.placeholder = '$';
      currencyInput.value = options.currency || '$';
      currencyInput.oninput = debounce(() => {
        options.currency = currencyInput.value || '$';
        updateStructure();
      }, 300);
      currencyDiv.appendChild(currencyLabel);
      currencyDiv.appendChild(currencyInput);
      validationDiv.appendChild(currencyDiv);
    }
  }

  container.appendChild(validationDiv);
}

// Global structure - will be initialized based on question type
let currentStructure = {
  type: '',
  questions: [],
  content: null
};

// Store dropdown instances for updates
const questionDropdowns = new Map();

// Update structure and save
const debouncedSave = debounce((markdown) => {
  saveMarkdown(markdown);
}, 500);

// Track if we're in MCQ / Matrix / FIB mode
let isMcqMode = false;
let isMatrixMode = false;
let isFibMode = false;
let isMatchingMode = false;

/** @returns {{ type: 'url'|'markdown', value: string, openInNewTab?: boolean, contentWidth?: string } | null} */
function cloneSideContent(content) {
  if (!content) return null;
  return {
    type: content.type,
    value: content.value ?? '',
    openInNewTab: !!content.openInNewTab,
    contentWidth: content.contentWidth
  };
}

function hasDefinedSideContent(content) {
  return !!(content && String(content.value || '').trim());
}

function createDefaultMcqQuestion() {
  return {
    name: '',
    text: '',
    options: [
      { label: 'A', text: '', correct: false },
      { label: 'B', text: '', correct: false },
      { label: 'C', text: '', correct: false },
      { label: 'D', text: '', correct: false }
    ],
    isMultiSelect: false,
    explainAnswer: false,
    shuffleOptions: true,
    multiSelectMode: 'all'
  };
}

function createDefaultTextQuestion() {
  return {
    text: '',
    correctAnswer: '',
    validation: { kind: 'string', options: {} }
  };
}

function createDefaultMatrixBlock() {
  return {
    practiceQuestion: '',
    columns: ['Column A', 'Column B'],
    rows: ['Row 1'],
    correctColumnIndex: [0],
    explainAnswer: false
  };
}

function createDefaultFibBlock() {
  return {
    markdownWithBlanks:
      'Fill in the blanks\n\n> This sentence has a [[blank:word]] and a [[blank:number]].',
    suggestedAnswers: ['word', 'number', 'extra choice'],
    questionStyle: ''
  };
}

function createDefaultMatchingBlock() {
  return {
    markdownWithBlanks:
      '> **Item 1**: First prompt text [[blank:Answer A]]\n\n> **Item 2**: Second prompt [[blank:Answer B]]',
    suggestedAnswers: ['Answer A', 'Answer B', 'distractor']
  };
}

/** @param {string} markdown */
function parseMatrixMarkdownToStructure(markdown) {
  const structure = {
    type: 'Matrix',
    matrix: createDefaultMatrixBlock(),
    content: null
  };
  const sections = {};
  let current = null;
  const buf = [];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^__([^_]+)__\s*$/);
    if (m) {
      if (current !== null) sections[current] = buf.join('\n');
      current = m[1].trim();
      buf.length = 0;
    } else {
      buf.push(line);
    }
  }
  if (current !== null) sections[current] = buf.join('\n');

  structure.type = (sections.Type || 'Matrix').trim() || 'Matrix';
  structure.matrix.practiceQuestion = (sections['Practice Question'] || '').trim();

  structure.matrix.columns = (sections['Matrix Columns'] || '')
    .split('\n')
    .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);

  structure.matrix.rows = (sections['Matrix Rows'] || '')
    .split('\n')
    .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);

  const sugg = (sections['Suggested Answers'] || '')
    .split('\n')
    .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);

  const correctColumnIndex = (structure.matrix.rows.length ? structure.matrix.rows : ['']).map(() => 0);
  structure.matrix.rows.forEach((_, ri) => {
    correctColumnIndex[ri] = 0;
  });

  sugg.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const row = line.slice(0, colonIdx).trim();
    const col = line.slice(colonIdx + 1).trim();
    const ri = structure.matrix.rows.indexOf(row);
    const ci = structure.matrix.columns.indexOf(col);
    if (ri >= 0 && ci >= 0) correctColumnIndex[ri] = ci;
  });
  structure.matrix.correctColumnIndex = correctColumnIndex;

  const ex = (sections['Explain Your Answer'] || sections['Explain your answer'] || '').trim().toLowerCase();
  structure.matrix.explainAnswer = ex === 'true' || ex === 'yes' || ex === 'enabled';

  const rawContent = (sections.Content || '').trim();
  if (rawContent) {
    structure.content = parseContentTextToStructure(rawContent);
  }

  if (structure.matrix.columns.length < 2) {
    structure.matrix.columns = createDefaultMatrixBlock().columns;
  }
  if (structure.matrix.rows.length === 0) {
    structure.matrix.rows = ['Row 1'];
    structure.matrix.correctColumnIndex = [0];
  }
  while (structure.matrix.correctColumnIndex.length < structure.matrix.rows.length) {
    structure.matrix.correctColumnIndex.push(0);
  }
  structure.matrix.correctColumnIndex.length = structure.matrix.rows.length;

  return structure;
}

function matrixStructureToMarkdown(structure) {
  const m = structure.matrix || createDefaultMatrixBlock();
  let markdown = `__Type__\n\nMatrix\n\n__Practice Question__\n\n${m.practiceQuestion || ''}\n\n__Matrix Columns__\n\n`;
  m.columns.forEach(c => {
    markdown += `- ${c}\n`;
  });
  markdown += '\n__Matrix Rows__\n\n';
  m.rows.forEach(r => {
    markdown += `- ${r}\n`;
  });
  markdown += '\n__Suggested Answers__\n\n';
  m.rows.forEach((row, i) => {
    const ci = Math.min(Math.max(0, m.correctColumnIndex[i] ?? 0), Math.max(0, m.columns.length - 1));
    const col = m.columns[ci] || m.columns[0] || '';
    markdown += `- ${row}: ${col}\n`;
  });
  markdown += '\n';
  if (m.explainAnswer) {
    markdown += `__Explain Your Answer__\n\ntrue\n\n`;
  }

  if (structure.content && structure.content.value) {
    let contentValue = structure.content.value;
    if (structure.content.type === 'url') {
      if (structure.content.openInNewTab) contentValue += ' [openInNewTab]';
      if (structure.content.contentWidth) contentValue += ` [contentWidth: ${structure.content.contentWidth}]`;
    } else if (structure.content.contentWidth) {
      contentValue += `\n[contentWidth: ${structure.content.contentWidth}]`;
    }
    markdown += `__Content__\n\n${contentValue}\n\n`;
  }

  return markdown;
}

/** @param {string} markdown */
function parseFibMarkdownToStructure(markdown) {
  const sections = {};
  let current = null;
  const buf = [];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^__([^_]+)__\s*$/);
    if (m) {
      if (current !== null) sections[current] = buf.join('\n');
      current = m[1].trim();
      buf.length = 0;
    } else {
      buf.push(line);
    }
  }
  if (current !== null) sections[current] = buf.join('\n');

  const suggested = (sections['Suggested Answers'] || '')
    .split('\n')
    .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);

  const qsRaw = (sections.QuestionStyle || sections['Question Style'] || '').trim().toLowerCase();
  const questionStyle = qsRaw === 'boxed' || qsRaw === 'bordered' ? qsRaw : '';

  const md = (sections['Markdown With Blanks'] || '').trim();
  const def = createDefaultFibBlock();

  const structure = {
    type: (sections.Type || 'Fill In The Blanks').trim() || 'Fill In The Blanks',
    fib: {
      markdownWithBlanks: md || def.markdownWithBlanks,
      suggestedAnswers: suggested.length ? suggested : def.suggestedAnswers.slice(),
      questionStyle
    },
    content: null
  };

  const rawContent = (sections.Content || '').trim();
  if (rawContent) {
    structure.content = parseContentTextToStructure(rawContent);
  }

  return structure;
}

function fibStructureToMarkdown(structure) {
  const f = structure.fib || createDefaultFibBlock();
  let markdown = `__Type__\n\nFill In The Blanks\n\n__Markdown With Blanks__\n\n${f.markdownWithBlanks || ''}\n\n__Suggested Answers__\n\n`;
  f.suggestedAnswers.forEach(a => {
    markdown += `- ${a}\n`;
  });
  markdown += '\n';
  if (f.questionStyle === 'boxed' || f.questionStyle === 'bordered') {
    markdown += `__QuestionStyle__\n\n${f.questionStyle}\n\n`;
  }
  if (structure.content && structure.content.value) {
    let contentValue = structure.content.value;
    if (structure.content.type === 'url') {
      if (structure.content.openInNewTab) contentValue += ' [openInNewTab]';
      if (structure.content.contentWidth) contentValue += ` [contentWidth: ${structure.content.contentWidth}]`;
    } else if (structure.content.contentWidth) {
      contentValue += `\n[contentWidth: ${structure.content.contentWidth}]`;
    }
    markdown += `__Content__\n\n${contentValue}\n\n`;
  }
  return markdown;
}

/** @param {string} markdown */
function parseMatchingMarkdownToStructure(markdown) {
  const sections = {};
  let current = null;
  const buf = [];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^__([^_]+)__\s*$/);
    if (m) {
      if (current !== null) sections[current] = buf.join('\n');
      current = m[1].trim();
      buf.length = 0;
    } else {
      buf.push(line);
    }
  }
  if (current !== null) sections[current] = buf.join('\n');

  const suggested = (sections['Suggested Answers'] || '')
    .split('\n')
    .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);

  const md = (sections['Markdown With Blanks'] || '').trim();
  const def = createDefaultMatchingBlock();

  const structure = {
    type: (sections.Type || 'Matching').trim() || 'Matching',
    matching: {
      markdownWithBlanks: md || def.markdownWithBlanks,
      suggestedAnswers: suggested.length ? suggested : def.suggestedAnswers.slice()
    },
    content: null
  };

  const rawContent = (sections.Content || '').trim();
  if (rawContent) {
    structure.content = parseContentTextToStructure(rawContent);
  }

  return structure;
}

function matchingStructureToMarkdown(structure) {
  const m = structure.matching || createDefaultMatchingBlock();
  let markdown = `__Type__\n\nMatching\n\n__Markdown With Blanks__\n\n${m.markdownWithBlanks || ''}\n\n__Suggested Answers__\n\n`;
  m.suggestedAnswers.forEach(a => {
    markdown += `- ${a}\n`;
  });
  markdown += '\n';
  if (structure.content && structure.content.value) {
    let contentValue = structure.content.value;
    if (structure.content.type === 'url') {
      if (structure.content.openInNewTab) contentValue += ' [openInNewTab]';
      if (structure.content.contentWidth) contentValue += ` [contentWidth: ${structure.content.contentWidth}]`;
    } else if (structure.content.contentWidth) {
      contentValue += `\n[contentWidth: ${structure.content.contentWidth}]`;
    }
    markdown += `__Content__\n\n${contentValue}\n\n`;
  }
  return markdown;
}

function renderMatchingEditor(structure) {
  const root = document.createElement('div');
  root.className = 'matching-editor-root box card non-interactive';

  const mat = structure.matching;

  const mdGroup = document.createElement('div');
  mdGroup.className = 'form-group';
  const mdLabel = document.createElement('label');
  mdLabel.className = 'form-label';
  mdLabel.textContent =
    'Markdown with blanks (one blockquote line per item; use [[blank:correctMatch]] for the draggable answer)';
  const mdTa = document.createElement('textarea');
  mdTa.className = 'input';
  mdTa.rows = 14;
  mdTa.value = mat.markdownWithBlanks;
  mdTa.oninput = debounce(() => {
    mat.markdownWithBlanks = mdTa.value;
    updateStructure();
  }, 300);
  mdGroup.appendChild(mdLabel);
  mdGroup.appendChild(mdTa);

  const suggGroup = document.createElement('div');
  suggGroup.className = 'form-group';
  const suggLabel = document.createElement('label');
  suggLabel.className = 'form-label';
  suggLabel.textContent =
    'Suggested answers (one per line; include each correct match and any extra choices)';
  const suggTa = document.createElement('textarea');
  suggTa.className = 'input';
  suggTa.rows = 8;
  suggTa.value = mat.suggestedAnswers.join('\n');
  suggTa.oninput = debounce(() => {
    let next = suggTa.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (next.length === 0) {
      next = createDefaultMatchingBlock().suggestedAnswers.slice();
      suggTa.value = next.join('\n');
    }
    mat.suggestedAnswers = next;
    updateStructure();
  }, 300);
  suggGroup.appendChild(suggLabel);
  suggGroup.appendChild(suggTa);

  root.appendChild(mdGroup);
  root.appendChild(suggGroup);

  return root;
}

function renderFibEditor(structure) {
  const root = document.createElement('div');
  root.className = 'fib-editor-root box card non-interactive';

  const f = structure.fib;

  const mdGroup = document.createElement('div');
  mdGroup.className = 'form-group';
  const mdLabel = document.createElement('label');
  mdLabel.className = 'form-label';
  mdLabel.textContent =
    'Markdown with blanks (use [[blank:correctAnswer]]; start the FIB block with a > blockquote line per server rules)';
  const mdTa = document.createElement('textarea');
  mdTa.className = 'input';
  mdTa.rows = 14;
  mdTa.value = f.markdownWithBlanks;
  mdTa.oninput = debounce(() => {
    f.markdownWithBlanks = mdTa.value;
    updateStructure();
  }, 300);
  mdGroup.appendChild(mdLabel);
  mdGroup.appendChild(mdTa);

  const suggGroup = document.createElement('div');
  suggGroup.className = 'form-group';
  const suggLabel = document.createElement('label');
  suggLabel.className = 'form-label';
  suggLabel.textContent = 'Suggested answers (one per line; include correct answers and distractors)';
  const suggTa = document.createElement('textarea');
  suggTa.className = 'input';
  suggTa.rows = 8;
  suggTa.value = f.suggestedAnswers.join('\n');
  suggTa.oninput = debounce(() => {
    let next = suggTa.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (next.length === 0) {
      next = createDefaultFibBlock().suggestedAnswers.slice();
      suggTa.value = next.join('\n');
    }
    f.suggestedAnswers = next;
    updateStructure();
  }, 300);
  suggGroup.appendChild(suggLabel);
  suggGroup.appendChild(suggTa);

  const styleGroup = document.createElement('div');
  styleGroup.className = 'form-group';
  const styleLabel = document.createElement('label');
  styleLabel.className = 'form-label';
  styleLabel.textContent = 'Question style (optional)';
  const styleWrap = document.createElement('div');
  styleWrap.style.width = '260px';
  new Dropdown(styleWrap, {
    items: [
      { value: '', label: 'Default' },
      { value: 'boxed', label: 'Boxed' },
      { value: 'bordered', label: 'Bordered' }
    ],
    selectedValue: f.questionStyle || '',
    growToFit: false,
    onSelect: value => {
      f.questionStyle = value || '';
      updateStructure();
    }
  });
  styleGroup.appendChild(styleLabel);
  styleGroup.appendChild(styleWrap);

  root.appendChild(mdGroup);
  root.appendChild(suggGroup);
  root.appendChild(styleGroup);

  return root;
}

/**
 * @param {{ type: string, matrix: ReturnType<typeof createDefaultMatrixBlock>, content: * }} structure
 */
function renderMatrixEditor(structure) {
  const root = document.createElement('div');
  root.className = 'matrix-editor-root box card non-interactive';

  const m = structure.matrix;

  const pqGroup = document.createElement('div');
  pqGroup.className = 'form-group';
  const pqLabel = document.createElement('label');
  pqLabel.className = 'form-label';
  pqLabel.textContent = 'Practice question';
  const pqTa = document.createElement('textarea');
  pqTa.className = 'input';
  pqTa.rows = 4;
  pqTa.value = m.practiceQuestion;
  pqTa.oninput = debounce(() => {
    m.practiceQuestion = pqTa.value;
    updateStructure();
  }, 300);
  pqGroup.appendChild(pqLabel);
  pqGroup.appendChild(pqTa);

  const colGroup = document.createElement('div');
  colGroup.className = 'form-group';
  const colLabel = document.createElement('label');
  colLabel.className = 'form-label';
  colLabel.textContent = 'Matrix columns (one per line, at least 2)';
  const colTa = document.createElement('textarea');
  colTa.className = 'input';
  colTa.rows = 4;
  colTa.value = m.columns.join('\n');

  const rowGroup = document.createElement('div');
  rowGroup.className = 'form-group';
  const rowLabel = document.createElement('label');
  rowLabel.className = 'form-label';
  rowLabel.textContent = 'Matrix rows (one per line)';
  const rowTa = document.createElement('textarea');
  rowTa.className = 'input';
  rowTa.rows = 6;
  rowTa.value = m.rows.join('\n');

  const correctSection = document.createElement('div');
  correctSection.className = 'form-group';

  function syncMatrixLists() {
    m.columns = colTa.value.split('\n').map(s => s.trim()).filter(Boolean);
    m.rows = rowTa.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (m.columns.length < 2) {
      m.columns = createDefaultMatrixBlock().columns;
      colTa.value = m.columns.join('\n');
    }
    if (m.rows.length === 0) {
      m.rows = ['Row 1'];
      rowTa.value = m.rows.join('\n');
    }
    while (m.correctColumnIndex.length < m.rows.length) {
      m.correctColumnIndex.push(0);
    }
    m.correctColumnIndex.length = m.rows.length;
    m.correctColumnIndex = m.correctColumnIndex.map((v, i) => {
      const max = Math.max(0, m.columns.length - 1);
      const n = Number.isFinite(v) ? v : 0;
      return Math.min(Math.max(0, n), max);
    });
  }

  function renderCorrectPickers() {
    syncMatrixLists();
    correctSection.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'form-label';
    title.textContent = 'Correct column per row';
    correctSection.appendChild(title);

    m.rows.forEach((row, i) => {
      const rowWrap = document.createElement('div');
      rowWrap.className = 'form-group';
      const lbl = document.createElement('label');
      lbl.className = 'form-label';
      lbl.textContent = row ? `Answer for: ${row}` : `Row ${i + 1}`;
      const sel = document.createElement('select');
      sel.className = 'input';
      m.columns.forEach((c, ci) => {
        const opt = document.createElement('option');
        opt.value = String(ci);
        opt.textContent = c;
        sel.appendChild(opt);
      });
      const idx = Math.min(Math.max(0, m.correctColumnIndex[i] ?? 0), m.columns.length - 1);
      sel.value = String(idx);
      sel.addEventListener('change', () => {
        m.correctColumnIndex[i] = parseInt(sel.value, 10);
        updateStructure();
      });
      rowWrap.appendChild(lbl);
      rowWrap.appendChild(sel);
      correctSection.appendChild(rowWrap);
    });
  }

  colTa.oninput = debounce(() => {
    syncMatrixLists();
    renderCorrectPickers();
    updateStructure();
  }, 300);

  rowTa.oninput = debounce(() => {
    syncMatrixLists();
    renderCorrectPickers();
    updateStructure();
  }, 300);

  const explainWrap = document.createElement('div');
  explainWrap.className = 'form-group';
  const explainLabel = document.createElement('label');
  explainLabel.className = 'form-label';
  const explainCb = document.createElement('input');
  explainCb.type = 'checkbox';
  explainCb.checked = !!m.explainAnswer;
  explainCb.addEventListener('change', () => {
    m.explainAnswer = explainCb.checked;
    updateStructure();
  });
  explainLabel.appendChild(explainCb);
  explainLabel.appendChild(document.createTextNode(' Explain your answer'));
  explainWrap.appendChild(explainLabel);

  colGroup.appendChild(colLabel);
  colGroup.appendChild(colTa);
  rowGroup.appendChild(rowLabel);
  rowGroup.appendChild(rowTa);

  root.appendChild(pqGroup);
  root.appendChild(colGroup);
  root.appendChild(rowGroup);
  root.appendChild(correctSection);
  root.appendChild(explainWrap);

  renderCorrectPickers();

  return root;
}

let questionTypeDropdownInstance = null;
let suppressQuestionTypeSelect = false;

/** Current question markdown (same payload as auto-save). */
function getCurrentMarkdown() {
  if (isMcqMode) {
    return mcqStructureToMarkdown(currentStructure);
  }
  if (isMatrixMode) {
    return matrixStructureToMarkdown(currentStructure);
  }
  if (isFibMode) {
    return fibStructureToMarkdown(currentStructure);
  }
  if (isMatchingMode) {
    return matchingStructureToMarkdown(currentStructure);
  }
  return structureToMarkdown(currentStructure);
}

function updateStructure() {
  debouncedSave(getCurrentMarkdown());
}

let copyMarkdownFeedbackTimer = null;

function showCopyMarkdownFeedback(message, isError = false) {
  const el = document.getElementById('save-status');
  if (!el) return;
  if (copyMarkdownFeedbackTimer) {
    clearTimeout(copyMarkdownFeedbackTimer);
    copyMarkdownFeedbackTimer = null;
  }
  el.textContent = message;
  el.className = isError ? 'save-status error' : 'save-status saved';
  el.classList.remove('hidden');
  copyMarkdownFeedbackTimer = setTimeout(() => {
    el.classList.add('hidden');
    copyMarkdownFeedbackTimer = null;
  }, 2500);
}

async function copyMarkdownToClipboard() {
  const text = getCurrentMarkdown();
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error('Clipboard API unavailable');
    }
    showCopyMarkdownFeedback('Copied markdown to clipboard');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        showCopyMarkdownFeedback('Copied markdown to clipboard');
      } else {
        showCopyMarkdownFeedback('Could not copy — select and copy manually', true);
      }
    } catch {
      document.body.removeChild(ta);
      showCopyMarkdownFeedback('Could not copy — try a secure (https) context', true);
    }
  }
}

function setCopyMarkdownButtonVisible(enabled) {
  const btn = document.getElementById('copy-markdown-btn');
  if (!btn) return;
  if (enabled) {
    btn.removeAttribute('hidden');
    btn.style.removeProperty('display');
  } else {
    btn.setAttribute('hidden', '');
    btn.style.display = 'none';
  }
}

function initCopyMarkdownButton() {
  const btn = document.getElementById('copy-markdown-btn');
  if (!btn || btn.dataset.wired === '1') return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', () => {
    copyMarkdownToClipboard();
  });
}


// ===== MCQ-SPECIFIC PARSING AND RENDERING =====

// Parse MCQ markdown into editable structure
function parseMcqMarkdownToStructure(markdown) {
  const lines = markdown.split('\n');
  const structure = {
    type: 'Multiple Choice',
    questions: [],
    content: null
  };

  let currentSection = null;
  let currentQuestion = null;
  let questionBuffer = [];
  let answerBuffer = [];
  let explainAnswerBuffer = [];
  let questionOptionsBuffer = [];
  let contentBuffer = [];
  let questionNameBuffer = [];

  function flushPreviousMcqQuestion() {
    if (!currentQuestion) return;
    if (answerBuffer.length > 0 && currentQuestion.options.length > 0) {
      const answerItems = answerBuffer.map(line => line.trim()).filter(line => line.startsWith('-'));
      const correctAnswers = new Set();
      answerItems.forEach(item => {
        const trimmed = item.replace(/^-\s*/, '').trim();
        const match = trimmed.match(/^([A-Z])\s*(?:-?\s*(?:Correct)?)?$/i);
        if (match) {
          const label = match[1].toUpperCase();
          if (trimmed.toLowerCase().includes('correct')) {
            correctAnswers.add(label);
          }
        }
      });
      currentQuestion.options.forEach(opt => {
        opt.correct = correctAnswers.has(opt.label);
      });
      currentQuestion.isMultiSelect = correctAnswers.size > 1;
    }
    if (explainAnswerBuffer.length > 0) {
      const explainText = explainAnswerBuffer.join('\n').trim().toLowerCase();
      currentQuestion.explainAnswer = explainText === 'true' || explainText === 'yes' || explainText === 'enabled';
    }
    if (questionOptionsBuffer.length > 0) {
      const optionsText = questionOptionsBuffer.join('\n').trim().toLowerCase();
      if (optionsText.includes('shuffle=false') || optionsText.includes('don\'t shuffle') || optionsText.includes('dont shuffle') || optionsText === 'no shuffle') {
        currentQuestion.shuffleOptions = false;
      }
      if (optionsText.includes('any') || optionsText.includes('multi-select mode: any') || optionsText.includes('mode: any')) {
        currentQuestion.multiSelectMode = 'any';
      } else {
        currentQuestion.multiSelectMode = 'all';
      }
    } else {
      currentQuestion.multiSelectMode = 'all';
    }
    structure.questions.push(currentQuestion);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(/^__([^_]+)__\s*$/);

    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim();

      if (currentSection === 'content' && contentBuffer.length > 0) {
        const raw = contentBuffer.join('\n').trim();
        if (raw) structure.content = parseContentTextToStructure(raw);
        contentBuffer = [];
      }

      // Handle section transitions and process previous section data
      if (sectionName === 'Type') {
        currentSection = 'type';
      } else if (sectionName === 'Practice Question') {
        flushPreviousMcqQuestion();
        const qName = questionNameBuffer.join('\n').trim();
        questionNameBuffer = [];
        currentSection = 'question';
        currentQuestion = {
          name: qName,
          text: '',
          options: [],
          isMultiSelect: false,
          explainAnswer: false,
          shuffleOptions: true,
          multiSelectMode: 'all'
        };
        questionBuffer = [];
        answerBuffer = [];
        explainAnswerBuffer = [];
        questionOptionsBuffer = [];
      } else if (sectionName === 'Question Name' || sectionName === 'Question name') {
        if (
          currentQuestion &&
          (currentSection === 'answers' || currentSection === 'explain' || currentSection === 'questionOptions')
        ) {
          flushPreviousMcqQuestion();
          currentQuestion = null;
        }
        currentSection = 'questionName';
        questionNameBuffer = [];
      } else if (sectionName === 'Suggested Answers') {
        // Process question text and extract options when entering answers section
        if (currentQuestion && currentSection === 'question') {
          const questionText = questionBuffer.join('\n').trim();
          const optionRegex = /^([A-Z])\.\s*(.+)$/gm;
          const options = [];
          let match;
          while ((match = optionRegex.exec(questionText)) !== null) {
            options.push({
              label: match[1],
              text: match[2].trim(),
              correct: false
            });
          }
          const questionTextOnly = questionText.replace(/^[A-Z]\.\s*.+$/gm, '').trim();
          currentQuestion.text = questionTextOnly || questionText;
          currentQuestion.options = options;
        }
        currentSection = 'answers';
        answerBuffer = [];
      } else if (sectionName === 'Question Options' || sectionName === 'Question options') {
        // Process question text and extract options when entering question options section
        if (currentQuestion && currentSection === 'question') {
          const questionText = questionBuffer.join('\n').trim();
          const optionRegex = /^([A-Z])\.\s*(.+)$/gm;
          const options = [];
          let match;
          while ((match = optionRegex.exec(questionText)) !== null) {
            options.push({
              label: match[1],
              text: match[2].trim(),
              correct: false
            });
          }
          const questionTextOnly = questionText.replace(/^[A-Z]\.\s*.+$/gm, '').trim();
          currentQuestion.text = questionTextOnly || questionText;
          currentQuestion.options = options;
        }
        currentSection = 'questionOptions';
        questionOptionsBuffer = [];
      } else if (sectionName === 'Explain Your Answer' || sectionName === 'Explain your answer') {
        // Process answers when entering explain section
        if (currentQuestion && currentSection === 'answers' && answerBuffer.length > 0) {
          const answerItems = answerBuffer.map(line => line.trim()).filter(line => line.startsWith('-'));
          const correctAnswers = new Set();
          answerItems.forEach(item => {
            const trimmed = item.replace(/^-\s*/, '').trim();
            const match = trimmed.match(/^([A-Z])\s*(?:-?\s*(?:Correct)?)?$/i);
            if (match) {
              const label = match[1].toUpperCase();
              if (trimmed.toLowerCase().includes('correct')) {
                correctAnswers.add(label);
              }
            }
          });
          if (currentQuestion.options.length > 0) {
            currentQuestion.options.forEach(opt => {
              opt.correct = correctAnswers.has(opt.label);
            });
            currentQuestion.isMultiSelect = correctAnswers.size > 1;
          }
        }
        currentSection = 'explain';
        explainAnswerBuffer = [];
      } else if (sectionName === 'Content') {
        currentSection = 'content';
        contentBuffer = [];
      } else {
        currentSection = null;
      }
      continue;
    }

    // Accumulate content based on current section
    if (currentSection === 'questionName') {
      questionNameBuffer.push(line);
    } else if (currentSection === 'question' && currentQuestion) {
      questionBuffer.push(line);
    } else if (currentSection === 'answers' && currentQuestion) {
      answerBuffer.push(line);
    } else if (currentSection === 'explain' && currentQuestion) {
      explainAnswerBuffer.push(line);
    } else if (currentSection === 'questionOptions' && currentQuestion) {
      questionOptionsBuffer.push(line);
    } else if (currentSection === 'content') {
      contentBuffer.push(line);
    }
  }

  // Process last question if exists
  if (currentQuestion) {
    // Process question text and extract options if we haven't done so yet
    if (questionBuffer.length > 0 && (!currentQuestion.options || currentQuestion.options.length === 0)) {
      const questionText = questionBuffer.join('\n').trim();
      const optionRegex = /^([A-Z])\.\s*(.+)$/gm;
      const options = [];
      let match;
      while ((match = optionRegex.exec(questionText)) !== null) {
        options.push({
          label: match[1],
          text: match[2].trim(),
          correct: false
        });
      }
      const questionTextOnly = questionText.replace(/^[A-Z]\.\s*.+$/gm, '').trim();
      currentQuestion.text = questionTextOnly || questionText;
      if (options.length > 0) {
        currentQuestion.options = options;
      }
    }
    
    // Process question options if we're in that section
    if (questionOptionsBuffer.length > 0) {
      const optionsText = questionOptionsBuffer.join('\n').trim().toLowerCase();
      if (optionsText.includes('shuffle=false') || optionsText.includes('don\'t shuffle') || optionsText.includes('dont shuffle') || optionsText === 'no shuffle') {
        currentQuestion.shuffleOptions = false;
      }
    }
    
    // Process answers if we have answer buffer (we were in answers section)
    if (answerBuffer.length > 0 && currentQuestion.options && currentQuestion.options.length > 0) {
      const answerItems = answerBuffer.map(line => line.trim()).filter(line => line.startsWith('-'));
      const correctAnswers = new Set();
      answerItems.forEach(item => {
        const trimmed = item.replace(/^-\s*/, '').trim();
        const match = trimmed.match(/^([A-Z])\s*(?:-?\s*(?:Correct)?)?$/i);
        if (match) {
          const label = match[1].toUpperCase();
          if (trimmed.toLowerCase().includes('correct')) {
            correctAnswers.add(label);
          }
        }
      });
      currentQuestion.options.forEach(opt => {
        opt.correct = correctAnswers.has(opt.label);
      });
      currentQuestion.isMultiSelect = correctAnswers.size > 1;
    }
    
    // Process explain answer if we're in explain section
    if (explainAnswerBuffer.length > 0) {
      const explainText = explainAnswerBuffer.join('\n').trim().toLowerCase();
      currentQuestion.explainAnswer = explainText === 'true' || explainText === 'yes' || explainText === 'enabled';
    }
    
    structure.questions.push(currentQuestion);
  }

  if (contentBuffer.length > 0) {
    const raw = contentBuffer.join('\n').trim();
    if (raw) structure.content = parseContentTextToStructure(raw);
  }

  return structure;
}

// Convert MCQ structure back to markdown
function mcqStructureToMarkdown(structure) {
  let markdown = `__Type__\n\n${structure.type}\n\n`;

  structure.questions.forEach((q) => {
    if (q.name && String(q.name).trim()) {
      markdown += `__Question Name__\n\n${String(q.name).trim()}\n\n`;
    }
    markdown += `__Practice Question__\n\n${q.text}\n\n`;
    
    // Add options
    q.options.forEach(opt => {
      markdown += `${opt.label}. ${opt.text}\n`;
    });
    markdown += '\n';
    
    // Add question options if shuffle is disabled or multi-select mode is "any"
    const hasOptions = q.shuffleOptions === false || (q.multiSelectMode === 'any');
    if (hasOptions) {
      markdown += `__Question Options__\n\n`;
      if (q.shuffleOptions === false) {
        markdown += `don't shuffle\n`;
      }
      if (q.multiSelectMode === 'any') {
        markdown += `any\n`;
      }
      markdown += '\n';
    }
    
    // Add suggested answers
    markdown += `__Suggested Answers__\n\n`;
    q.options.forEach(opt => {
      const correctMarker = opt.correct ? ' - Correct' : '';
      markdown += `- ${opt.label}${correctMarker}\n`;
    });
    markdown += '\n';
    
    // Add explain your answer if enabled
    if (q.explainAnswer) {
      markdown += `__Explain Your Answer__\n\ntrue\n\n`;
    }
  });

  if (structure.content && structure.content.value) {
    let contentValue = structure.content.value;
    if (structure.content.type === 'url') {
      if (structure.content.openInNewTab) contentValue += ' [openInNewTab]';
      if (structure.content.contentWidth) contentValue += ` [contentWidth: ${structure.content.contentWidth}]`;
    } else {
      if (structure.content.contentWidth) contentValue += `\n[contentWidth: ${structure.content.contentWidth}]`;
    }
    markdown += `__Content__\n\n${contentValue}\n\n`;
  }

  return markdown;
}

// Render MCQ question item
function renderMcqQuestion(question, index) {
  const container = document.createElement('div');
  container.className = 'box card non-interactive question-item';
  container.dataset.index = index;

  const header = document.createElement('div');
  header.className = 'question-item-header';
  
  const title = document.createElement('div');
  title.className = 'question-item-title';
  title.textContent = `Question ${index + 1}`;

  const nameLabel = document.createElement('label');
  nameLabel.className = 'form-label';
  nameLabel.textContent = 'Question name (optional)';
  nameLabel.style.marginTop = 'var(--UI-Spacing-spacing-ms)';
  nameLabel.setAttribute('for', `mcq-qname-${index}`);
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = `mcq-qname-${index}`;
  nameInput.className = 'input';
  nameInput.placeholder = 'Shown in the legend when there are multiple questions';
  nameInput.value = question.name || '';
  nameInput.style.boxSizing = 'border-box';
  nameInput.style.maxWidth = '100%';
  nameInput.oninput = debounce(() => {
    question.name = nameInput.value;
    updateStructure();
  }, 300);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'button button-text button-danger';
  deleteBtn.textContent = 'Delete';
  if (currentStructure.questions.length <= 1) {
    deleteBtn.disabled = true;
    deleteBtn.classList.add('disabled');
  }
  deleteBtn.onclick = () => {
    if (currentStructure.questions.length <= 1) {
      return;
    }
    const questionIndex = parseInt(container.dataset.index);
    currentStructure.questions.splice(questionIndex, 1);
    container.remove();
    // Re-render all questions to update indices
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';
    currentStructure.questions.forEach((q, idx) => {
      questionsContainer.appendChild(renderMcqQuestion(q, idx));
    });
    updateStructure();
  };

  header.appendChild(title);
  header.appendChild(deleteBtn);

  container.appendChild(nameLabel);
  container.appendChild(nameInput);

  // Question text textarea
  const questionTextArea = document.createElement('textarea');
  questionTextArea.className = 'form-textarea';
  questionTextArea.placeholder = 'Enter question text (supports markdown)...';
  questionTextArea.value = question.text || '';
  questionTextArea.rows = 4;
  questionTextArea.oninput = debounce(() => {
    question.text = questionTextArea.value;
    updateStructure();
  }, 300);

  // Options section
  const optionsLabel = document.createElement('label');
  optionsLabel.className = 'form-label';
  optionsLabel.textContent = 'Options';
  optionsLabel.style.marginTop = 'var(--UI-Spacing-spacing-ms)';

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'mcq-options-editor';
  optionsContainer.style.display = 'flex';
  optionsContainer.style.flexDirection = 'column';
  optionsContainer.style.gap = 'var(--UI-Spacing-spacing-xs)';

  // Ensure question has options array
  if (!question.options || question.options.length === 0) {
    question.options = [
      { label: 'A', text: '', correct: false },
      { label: 'B', text: '', correct: false },
      { label: 'C', text: '', correct: false },
      { label: 'D', text: '', correct: false }
    ];
  }

  // Render each option
  question.options.forEach((option, optIdx) => {
    const optionRow = document.createElement('div');
    optionRow.style.display = 'flex';
    optionRow.style.gap = 'var(--UI-Spacing-spacing-xs)';
    optionRow.style.alignItems = 'center';

    const optionLabel = document.createElement('span');
    optionLabel.textContent = `${option.label}.`;
    optionLabel.style.minWidth = '24px';
    optionLabel.style.fontWeight = '500';

    const optionInput = document.createElement('input');
    optionInput.type = 'text';
    optionInput.className = 'input';
    optionInput.style.flex = '1';
    optionInput.value = option.text || '';
    optionInput.placeholder = `Option ${option.label} text`;
    optionInput.oninput = debounce(() => {
      option.text = optionInput.value;
      updateStructure();
    }, 300);

    const correctCheckbox = document.createElement('label');
    correctCheckbox.className = 'input-checkbox';
    correctCheckbox.style.flexShrink = '0';
    
    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.checked = option.correct || false;
    checkboxInput.onchange = () => {
      option.correct = checkboxInput.checked;
      // Update isMultiSelect based on number of correct answers
      const correctCount = question.options.filter(opt => opt.correct).length;
      question.isMultiSelect = correctCount > 1;
      // Update multi-select mode checkbox visibility dynamically
      if (container.updateMultiSelectModeVisibility) {
        container.updateMultiSelectModeVisibility();
      }
      updateStructure();
    };

    const checkboxBox = document.createElement('span');
    checkboxBox.className = 'input-checkbox-box';
    const checkboxCheckmark = document.createElement('span');
    checkboxCheckmark.className = 'input-checkbox-checkmark';
    checkboxBox.appendChild(checkboxCheckmark);

    const checkboxLabel = document.createElement('span');
    checkboxLabel.className = 'input-checkbox-label';
    checkboxLabel.textContent = 'Correct';

    correctCheckbox.appendChild(checkboxInput);
    correctCheckbox.appendChild(checkboxBox);
    correctCheckbox.appendChild(checkboxLabel);

    // Delete button for option
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'button button-text button-danger';
    deleteBtn.textContent = '×';
    deleteBtn.style.flexShrink = '0';
    deleteBtn.style.minWidth = '32px';
    deleteBtn.style.padding = '0';
    deleteBtn.style.fontSize = '20px';
    deleteBtn.style.lineHeight = '1';
    deleteBtn.disabled = question.options.length <= 2;
    if (deleteBtn.disabled) {
      deleteBtn.classList.add('disabled');
    }
    deleteBtn.onclick = () => {
      if (question.options.length <= 2) {
        return;
      }
      question.options.splice(optIdx, 1);
      // Re-render the entire question to update indices
      const questionIndex = parseInt(container.dataset.index);
      const questionsContainer = document.getElementById('questions-container');
      questionsContainer.innerHTML = '';
      currentStructure.questions.forEach((q, idx) => {
        questionsContainer.appendChild(renderMcqQuestion(q, idx));
      });
      // Note: updateMultiSelectModeVisibility will be called automatically after re-render
      updateStructure();
    };

    optionRow.appendChild(optionLabel);
    optionRow.appendChild(optionInput);
    optionRow.appendChild(correctCheckbox);
    optionRow.appendChild(deleteBtn);
    optionsContainer.appendChild(optionRow);
  });

  // Add option button
  const addOptionBtn = document.createElement('button');
  addOptionBtn.type = 'button';
  addOptionBtn.className = 'button button-text';
  addOptionBtn.textContent = '+ Add Option';
  addOptionBtn.style.marginTop = 'var(--UI-Spacing-spacing-xs)';
  addOptionBtn.onclick = () => {
    const nextLabel = String.fromCharCode(65 + question.options.length); // A, B, C, etc.
    question.options.push({
      label: nextLabel,
      text: '',
      correct: false
    });
    // Re-render options
    optionsContainer.innerHTML = '';
    question.options.forEach((opt, optIdx) => {
      const optionRow = document.createElement('div');
      optionRow.style.display = 'flex';
      optionRow.style.gap = 'var(--UI-Spacing-spacing-xs)';
      optionRow.style.alignItems = 'center';

      const optionLabel = document.createElement('span');
      optionLabel.textContent = `${opt.label}.`;
      optionLabel.style.minWidth = '24px';
      optionLabel.style.fontWeight = '500';

      const optionInput = document.createElement('input');
      optionInput.type = 'text';
      optionInput.className = 'input';
      optionInput.style.flex = '1';
      optionInput.value = opt.text || '';
      optionInput.placeholder = `Option ${opt.label} text`;
      optionInput.oninput = debounce(() => {
        opt.text = optionInput.value;
        updateStructure();
      }, 300);

      const correctCheckbox = document.createElement('label');
      correctCheckbox.className = 'input-checkbox';
      correctCheckbox.style.flexShrink = '0';
      
      const checkboxInput = document.createElement('input');
      checkboxInput.type = 'checkbox';
      checkboxInput.checked = opt.correct || false;
      checkboxInput.onchange = () => {
        opt.correct = checkboxInput.checked;
        const correctCount = question.options.filter(o => o.correct).length;
        question.isMultiSelect = correctCount > 1;
        // Update multi-select mode checkbox visibility dynamically
        if (container.updateMultiSelectModeVisibility) {
          container.updateMultiSelectModeVisibility();
        }
        updateStructure();
      };

      const checkboxBox = document.createElement('span');
      checkboxBox.className = 'input-checkbox-box';
      const checkboxCheckmark = document.createElement('span');
      checkboxCheckmark.className = 'input-checkbox-checkmark';
      checkboxBox.appendChild(checkboxCheckmark);

      const checkboxLabel = document.createElement('span');
      checkboxLabel.className = 'input-checkbox-label';
      checkboxLabel.textContent = 'Correct';

      correctCheckbox.appendChild(checkboxInput);
      correctCheckbox.appendChild(checkboxBox);
      correctCheckbox.appendChild(checkboxLabel);

      // Delete button for option
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'button button-text button-danger';
      deleteBtn.textContent = '×';
      deleteBtn.style.flexShrink = '0';
      deleteBtn.style.minWidth = '32px';
      deleteBtn.style.padding = '0';
      deleteBtn.style.fontSize = '20px';
      deleteBtn.style.lineHeight = '1';
      deleteBtn.disabled = question.options.length <= 2;
      if (deleteBtn.disabled) {
        deleteBtn.classList.add('disabled');
      }
      deleteBtn.onclick = () => {
        if (question.options.length <= 2) {
          return;
        }
        question.options.splice(optIdx, 1);
        // Re-render the entire question to update indices
        const questionIndex = parseInt(container.dataset.index);
        const questionsContainer = document.getElementById('questions-container');
        questionsContainer.innerHTML = '';
        currentStructure.questions.forEach((q, idx) => {
          questionsContainer.appendChild(renderMcqQuestion(q, idx));
        });
        updateStructure();
      };

      optionRow.appendChild(optionLabel);
      optionRow.appendChild(optionInput);
      optionRow.appendChild(correctCheckbox);
      optionRow.appendChild(deleteBtn);
      optionsContainer.appendChild(optionRow);
    });
    optionsContainer.appendChild(addOptionBtn);
    // Update multi-select mode checkbox visibility after re-rendering options
    if (container.updateMultiSelectModeVisibility) {
      container.updateMultiSelectModeVisibility();
    }
    updateStructure();
  };
  optionsContainer.appendChild(addOptionBtn);

  // Question options section
  const questionOptionsDiv = document.createElement('div');
  questionOptionsDiv.className = 'validation-options';
  questionOptionsDiv.style.marginTop = 'var(--UI-Spacing-spacing-ms)';

  const shuffleLabel = document.createElement('label');
  shuffleLabel.className = 'input-checkbox';
  const shuffleInput = document.createElement('input');
  shuffleInput.type = 'checkbox';
  shuffleInput.checked = question.shuffleOptions !== false; // Default to true
  shuffleInput.onchange = () => {
    question.shuffleOptions = shuffleInput.checked;
    updateStructure();
  };
  const shuffleBox = document.createElement('span');
  shuffleBox.className = 'input-checkbox-box';
  const shuffleCheckmark = document.createElement('span');
  shuffleCheckmark.className = 'input-checkbox-checkmark';
  shuffleBox.appendChild(shuffleCheckmark);
  const shuffleText = document.createElement('span');
  shuffleText.className = 'input-checkbox-label';
  shuffleText.textContent = 'Shuffle options';
  shuffleLabel.appendChild(shuffleInput);
  shuffleLabel.appendChild(shuffleBox);
  shuffleLabel.appendChild(shuffleText);
  questionOptionsDiv.appendChild(shuffleLabel);

  // Explain answer checkbox
  const explainLabel = document.createElement('label');
  explainLabel.className = 'input-checkbox';
  const explainInput = document.createElement('input');
  explainInput.type = 'checkbox';
  explainInput.checked = question.explainAnswer || false;
  explainInput.onchange = () => {
    question.explainAnswer = explainInput.checked;
    updateStructure();
  };
  const explainBox = document.createElement('span');
  explainBox.className = 'input-checkbox-box';
  const explainCheckmark = document.createElement('span');
  explainCheckmark.className = 'input-checkbox-checkmark';
  explainBox.appendChild(explainCheckmark);
  const explainText = document.createElement('span');
  explainText.className = 'input-checkbox-label';
  explainText.textContent = 'Explain your answer';
  explainLabel.appendChild(explainInput);
  explainLabel.appendChild(explainBox);
  explainLabel.appendChild(explainText);
  questionOptionsDiv.appendChild(explainLabel);

  // Multi-select mode checkbox container (created but may be hidden)
  const modeLabel = document.createElement('label');
  modeLabel.className = 'input-checkbox';
  modeLabel.style.marginTop = 'var(--UI-Spacing-spacing-ms)';
  modeLabel.style.display = 'none'; // Hidden by default
  
  const modeInput = document.createElement('input');
  modeInput.type = 'checkbox';
  modeInput.checked = question.multiSelectMode === 'any';
  modeInput.onchange = () => {
    question.multiSelectMode = modeInput.checked ? 'any' : 'all';
    updateStructure();
  };
  
  const modeBox = document.createElement('span');
  modeBox.className = 'input-checkbox-box';
  const modeCheckmark = document.createElement('span');
  modeCheckmark.className = 'input-checkbox-checkmark';
  modeBox.appendChild(modeCheckmark);
  
  const modeText = document.createElement('span');
  modeText.className = 'input-checkbox-label';
  modeText.textContent = 'Any Correct Answer is Sufficient';
  
  modeLabel.appendChild(modeInput);
  modeLabel.appendChild(modeBox);
  modeLabel.appendChild(modeText);
  questionOptionsDiv.appendChild(modeLabel);
  
  // Function to update multi-select mode checkbox visibility
  function updateMultiSelectModeVisibility() {
    const correctCount = question.options.filter(opt => opt.correct).length;
    if (correctCount > 1) {
      modeLabel.style.display = '';
      question.isMultiSelect = true;
    } else {
      modeLabel.style.display = 'none';
      question.isMultiSelect = false;
      // Reset to 'all' mode when no longer multi-select
      question.multiSelectMode = 'all';
      modeInput.checked = false;
    }
  }
  
  // Initial check
  updateMultiSelectModeVisibility();
  
  // Store the update function on the container so we can call it when options change
  container.updateMultiSelectModeVisibility = updateMultiSelectModeVisibility;

  container.appendChild(header);
  container.appendChild(questionTextArea);
  container.appendChild(optionsLabel);
  container.appendChild(optionsContainer);
  container.appendChild(questionOptionsDiv);

  return container;
}

function hydrateStructureFromMarkdown(markdown) {
  if (!markdown || !markdown.trim()) return;
  if (isMcqMode) {
    const parsed = parseMcqMarkdownToStructure(markdown);
    currentStructure.questions = parsed.questions;
    currentStructure.content = parsed.content || null;
    delete currentStructure.matrix;
    delete currentStructure.fib;
    delete currentStructure.matching;
  } else if (isMatrixMode) {
    const parsed = parseMatrixMarkdownToStructure(markdown);
    currentStructure.type = parsed.type;
    currentStructure.matrix = parsed.matrix;
    currentStructure.content = parsed.content || null;
    currentStructure.questions = [];
    delete currentStructure.heading;
    delete currentStructure.fib;
    delete currentStructure.matching;
  } else if (isFibMode) {
    const parsed = parseFibMarkdownToStructure(markdown);
    currentStructure.type = parsed.type;
    currentStructure.fib = parsed.fib;
    currentStructure.content = parsed.content || null;
    currentStructure.questions = [];
    delete currentStructure.heading;
    delete currentStructure.matrix;
    delete currentStructure.matching;
  } else if (isMatchingMode) {
    const parsed = parseMatchingMarkdownToStructure(markdown);
    currentStructure.type = parsed.type;
    currentStructure.matching = parsed.matching;
    currentStructure.content = parsed.content || null;
    currentStructure.questions = [];
    delete currentStructure.heading;
    delete currentStructure.matrix;
    delete currentStructure.fib;
  } else {
    const parsed = parseMarkdownToStructure(markdown);
    currentStructure.questions = parsed.questions;
    currentStructure.content = parsed.content;
    currentStructure.heading = parsed.heading ? { value: parsed.heading.value } : { value: '' };
    delete currentStructure.matrix;
    delete currentStructure.fib;
    delete currentStructure.matching;
  }
}

function ensureDefaultQuestions() {
  if (isMatrixMode) {
    if (!currentStructure.matrix) {
      currentStructure.matrix = createDefaultMatrixBlock();
    }
    return;
  }
  if (isFibMode) {
    if (!currentStructure.fib) {
      currentStructure.fib = createDefaultFibBlock();
    }
    return;
  }
  if (isMatchingMode) {
    if (!currentStructure.matching) {
      currentStructure.matching = createDefaultMatchingBlock();
    }
    return;
  }
  if (currentStructure.questions.length === 0) {
    currentStructure.questions.push(
      isMcqMode ? createDefaultMcqQuestion() : createDefaultTextQuestion()
    );
  }
}

function mountEditorUi() {
  const headingTitle = document.getElementById('heading-title');
  const headingGroup = document.getElementById('heading-input-group');
  const headingInput = document.getElementById('heading-input');

  if (isMcqMode || isMatrixMode || isFibMode || isMatchingMode) {
    headingTitle.style.display = 'none';
    headingGroup.style.display = 'none';
    delete currentStructure.heading;
  } else {
    headingTitle.style.display = '';
    headingGroup.style.display = '';
    if (!currentStructure.heading) {
      currentStructure.heading = { value: '' };
    }
    headingInput.value = currentStructure.heading.value || '';
    headingInput.oninput = debounce(() => {
      if (!currentStructure.heading) {
        currentStructure.heading = { value: '' };
      }
      currentStructure.heading.value = headingInput.value;
      updateStructure();
    }, 300);
  }

  const questionsContainer = document.getElementById('questions-container');
  const addQuestionBtn = document.getElementById('add-question-btn');
  questionsContainer.innerHTML = '';
  questionDropdowns.clear();

  if (isMatrixMode) {
    if (addQuestionBtn) addQuestionBtn.style.display = 'none';
    if (!currentStructure.matrix) {
      currentStructure.matrix = createDefaultMatrixBlock();
    }
    questionsContainer.appendChild(renderMatrixEditor(currentStructure));
  } else if (isFibMode) {
    if (addQuestionBtn) addQuestionBtn.style.display = 'none';
    if (!currentStructure.fib) {
      currentStructure.fib = createDefaultFibBlock();
    }
    questionsContainer.appendChild(renderFibEditor(currentStructure));
  } else if (isMatchingMode) {
    if (addQuestionBtn) addQuestionBtn.style.display = 'none';
    if (!currentStructure.matching) {
      currentStructure.matching = createDefaultMatchingBlock();
    }
    questionsContainer.appendChild(renderMatchingEditor(currentStructure));
  } else {
    if (addQuestionBtn) addQuestionBtn.style.display = '';
    currentStructure.questions.forEach((q, index) => {
      questionsContainer.appendChild(
        isMcqMode ? renderMcqQuestion(q, index) : renderQuestion(q, index)
      );
    });
  }

  if (addQuestionBtn) {
    addQuestionBtn.onclick = () => {
      if (isMatrixMode || isFibMode || isMatchingMode) return;
      const newQuestion = isMcqMode ? createDefaultMcqQuestion() : createDefaultTextQuestion();
      currentStructure.questions.push(newQuestion);
      const index = currentStructure.questions.length - 1;
      questionsContainer.appendChild(
        isMcqMode ? renderMcqQuestion(newQuestion, index) : renderQuestion(newQuestion, index)
      );
      updateStructure();
    };
  }

  wireContentEditorPanel();
  updateStructure();
}

function initQuestionTypeDropdown() {
  const el = document.getElementById('question-type-dropdown');
  if (!el || el.dataset.wired === '1') return;
  el.dataset.wired = '1';

  function currentTypeDropdownValue() {
    if (isMcqMode) return 'Multiple Choice';
    if (isMatrixMode) return 'Matrix';
    if (isFibMode) return 'Fill in the blanks';
    if (isMatchingMode) return 'Matching';
    return 'Text Input';
  }

  questionTypeDropdownInstance = new Dropdown(el, {
    items: [
      { value: 'Text Input', label: 'Text Input' },
      { value: 'Multiple Choice', label: 'Multiple Choice' },
      { value: 'Matrix', label: 'Matrix' },
      { value: 'Fill in the blanks', label: 'Fill in the blanks' },
      { value: 'Matching', label: 'Matching' }
    ],
    selectedValue: currentTypeDropdownValue(),
    growToFit: false,
    onSelect: (value) => {
      if (suppressQuestionTypeSelect) return;

      const nextMcq = value === 'Multiple Choice';
      const nextMatrix = value === 'Matrix';
      const nextFib = value === 'Fill in the blanks';
      const nextMatching = value === 'Matching';
      if (
        nextMcq === isMcqMode &&
        nextMatrix === isMatrixMode &&
        nextFib === isFibMode &&
        nextMatching === isMatchingMode
      ) {
        return;
      }

      const preservedContent = cloneSideContent(currentStructure.content);
      const contentNote = hasDefinedSideContent(currentStructure.content)
        ? ' Your Content panel (side URL or markdown) will be kept.'
        : '';
      const ok = window.confirm(
        `Switching question type will discard all questions, answers, and settings for the current format (including the optional heading for Text Input).${contentNote}\n\nContinue?`
      );
      if (!ok) {
        suppressQuestionTypeSelect = true;
        questionTypeDropdownInstance.setValue(currentTypeDropdownValue());
        suppressQuestionTypeSelect = false;
        return;
      }

      isMcqMode = nextMcq;
      isMatrixMode = nextMatrix;
      isFibMode = nextFib;
      isMatchingMode = nextMatching;
      currentStructure.type = value;
      currentStructure.content = preservedContent;
      questionDropdowns.clear();

      if (nextMatrix) {
        currentStructure.matrix = createDefaultMatrixBlock();
        currentStructure.questions = [];
        delete currentStructure.heading;
        delete currentStructure.fib;
        delete currentStructure.matching;
      } else if (nextFib) {
        currentStructure.fib = createDefaultFibBlock();
        currentStructure.questions = [];
        delete currentStructure.heading;
        delete currentStructure.matrix;
        delete currentStructure.matching;
      } else if (nextMatching) {
        currentStructure.matching = createDefaultMatchingBlock();
        currentStructure.questions = [];
        delete currentStructure.heading;
        delete currentStructure.matrix;
        delete currentStructure.fib;
      } else if (nextMcq) {
        currentStructure.questions = [createDefaultMcqQuestion()];
        delete currentStructure.heading;
        delete currentStructure.matrix;
        delete currentStructure.fib;
        delete currentStructure.matching;
      } else {
        currentStructure.questions = [createDefaultTextQuestion()];
        currentStructure.heading = { value: '' };
        delete currentStructure.matrix;
        delete currentStructure.fib;
        delete currentStructure.matching;
      }
      mountEditorUi();
    }
  });
}

// Initialize editor
async function initEditor() {
  let { markdown, questionType, copyMarkdownEnabled } = await loadMarkdown();
  setCopyMarkdownButtonVisible(copyMarkdownEnabled);

  const editorRoot = document.getElementById('editor-root');
  const typePickerScreen = document.getElementById('type-picker-screen');

  if (!questionType) {
    if (editorRoot) editorRoot.style.display = 'none';
    if (typePickerScreen) {
      typePickerScreen.classList.add('is-visible');
      typePickerScreen.setAttribute('aria-hidden', 'false');
    }
    questionType = await promptForQuestionType();
    if (typePickerScreen) {
      typePickerScreen.classList.remove('is-visible');
      typePickerScreen.setAttribute('aria-hidden', 'true');
    }
    if (editorRoot) editorRoot.style.display = '';
  }

  if (questionType) {
    currentStructure.type = questionType;
  }

  isMcqMode = questionType && /^multiple choice$/i.test(questionType);
  isMatrixMode = questionType && /^matrix$/i.test(questionType);
  isFibMode = questionType && /^fill in the blanks$/i.test(questionType);
  isMatchingMode = questionType && /^matching$/i.test(questionType);

  if (markdown && markdown.trim()) {
    hydrateStructureFromMarkdown(markdown);
  } else {
    currentStructure.questions = [];
    if (isMatrixMode) {
      currentStructure.type = 'Matrix';
      currentStructure.matrix = createDefaultMatrixBlock();
      delete currentStructure.heading;
      delete currentStructure.fib;
      delete currentStructure.matching;
    } else if (isFibMode) {
      currentStructure.type = 'Fill In The Blanks';
      currentStructure.fib = createDefaultFibBlock();
      delete currentStructure.heading;
      delete currentStructure.matrix;
      delete currentStructure.matching;
    } else if (isMatchingMode) {
      currentStructure.type = 'Matching';
      currentStructure.matching = createDefaultMatchingBlock();
      delete currentStructure.heading;
      delete currentStructure.matrix;
      delete currentStructure.fib;
    } else if (!isMcqMode) {
      currentStructure.heading = { value: '' };
      delete currentStructure.matrix;
      delete currentStructure.fib;
      delete currentStructure.matching;
    } else {
      delete currentStructure.heading;
      delete currentStructure.matrix;
      delete currentStructure.fib;
      delete currentStructure.matching;
    }
  }

  ensureDefaultQuestions();
  mountEditorUi();
  initQuestionTypeDropdown();
  initCopyMarkdownButton();
}

function wireContentEditorPanel() {
    const contentPanelTitle = document.getElementById('content-panel-title');
    if (contentPanelTitle) contentPanelTitle.style.display = '';
    document.getElementById('content-open-url-btn')?.remove();
    const contentTypeDropdownContainer = document.getElementById('content-type-dropdown');
    if (!contentTypeDropdownContainer) return;
    if (contentTypeDropdownContainer.parentElement) {
      contentTypeDropdownContainer.parentElement.style.display = '';
    }
    contentTypeDropdownContainer.style.width = '240px';
    const contentInputGroup = document.getElementById('content-input-group');
    const contentInputContainer = document.getElementById('content-input-container');
    const contentLabel = document.getElementById('content-label');
    let contentInput = null;
    let contentTypeDropdown = null;
    let openUrlButton = null;

    function createContentInput(type, value, openInNewTab = false, contentWidth = '') {
      contentInputContainer.innerHTML = '';
      
      if (type === 'url') {
        contentInput = document.createElement('input');
        contentInput.type = 'text';
        contentInput.id = 'content-input';
        contentInput.className = 'input';
        contentInput.placeholder = 'https://example.com';
        contentInput.value = value || '';
        contentInputContainer.appendChild(contentInput);
        
        contentInput.oninput = debounce(() => {
          if (currentStructure.content) {
            currentStructure.content.value = contentInput.value;
            updateStructure();
          }
          if (openUrlButton) {
            const urlValue = contentInput.value.trim();
            openUrlButton.disabled = !urlValue || !/^https?:\/\//i.test(urlValue);
          }
        }, 300);

        // Open in new tab checkbox
        const openInNewTabLabel = document.createElement('label');
        openInNewTabLabel.className = 'input-checkbox';
        openInNewTabLabel.style.marginTop = 'var(--UI-Spacing-spacing-ms)';
        openInNewTabLabel.style.display = 'flex';
        const openInNewTabInput = document.createElement('input');
        openInNewTabInput.type = 'checkbox';
        openInNewTabInput.checked = openInNewTab;
        openInNewTabInput.onchange = () => {
          if (currentStructure.content) {
            currentStructure.content.openInNewTab = openInNewTabInput.checked;
            updateStructure();
          }
        };
        const openInNewTabBox = document.createElement('span');
        openInNewTabBox.className = 'input-checkbox-box';
        const openInNewTabCheckmark = document.createElement('span');
        openInNewTabCheckmark.className = 'input-checkbox-checkmark';
        openInNewTabBox.appendChild(openInNewTabCheckmark);
        const openInNewTabText = document.createElement('span');
        openInNewTabText.className = 'input-checkbox-label';
        openInNewTabText.textContent = 'Show "Open in new tab" button in toolbar';
        openInNewTabLabel.appendChild(openInNewTabInput);
        openInNewTabLabel.appendChild(openInNewTabBox);
        openInNewTabLabel.appendChild(openInNewTabText);
        contentInputContainer.appendChild(openInNewTabLabel);

        // Content panel width (for URL)
        const contentWidthGroup = document.createElement('div');
        contentWidthGroup.className = 'form-group';
        contentWidthGroup.style.marginTop = 'var(--UI-Spacing-spacing-ms)';
        const contentWidthLabel = document.createElement('label');
        contentWidthLabel.className = 'form-label';
        contentWidthLabel.textContent = 'Content panel width (e.g. 40% or 280px)';
        contentWidthLabel.htmlFor = 'content-width-input';
        const contentWidthInput = document.createElement('input');
        contentWidthInput.type = 'text';
        contentWidthInput.id = 'content-width-input';
        contentWidthInput.className = 'input';
        contentWidthInput.placeholder = '40%';
        contentWidthInput.value = contentWidth || '';
        contentWidthInput.style.width = '120px';
        contentWidthInput.oninput = debounce(() => {
          if (currentStructure.content) {
            currentStructure.content.contentWidth = contentWidthInput.value.trim() || undefined;
            updateStructure();
          }
        }, 300);
        contentWidthGroup.appendChild(contentWidthLabel);
        contentWidthGroup.appendChild(contentWidthInput);
        contentInputContainer.appendChild(contentWidthGroup);
      } else {
        contentInput = document.createElement('textarea');
        contentInput.id = 'content-input';
        contentInput.className = 'form-textarea';
        contentInput.placeholder = 'Enter markdown content...';
        contentInput.value = value || '';
        contentInputContainer.appendChild(contentInput);
        
        contentInput.oninput = debounce(() => {
          if (currentStructure.content) {
            currentStructure.content.value = contentInput.value;
            updateStructure();
          }
        }, 300);

        // Content panel width (for markdown)
        const contentWidthGroup = document.createElement('div');
        contentWidthGroup.className = 'form-group';
        contentWidthGroup.style.marginTop = 'var(--UI-Spacing-spacing-ms)';
        const contentWidthLabel = document.createElement('label');
        contentWidthLabel.className = 'form-label';
        contentWidthLabel.textContent = 'Content panel width (e.g. 40% or 280px)';
        contentWidthLabel.htmlFor = 'content-width-input';
        const contentWidthInput = document.createElement('input');
        contentWidthInput.type = 'text';
        contentWidthInput.id = 'content-width-input';
        contentWidthInput.className = 'input';
        contentWidthInput.placeholder = '40%';
        contentWidthInput.value = contentWidth || '';
        contentWidthInput.style.width = '120px';
        contentWidthInput.oninput = debounce(() => {
          if (currentStructure.content) {
            currentStructure.content.contentWidth = contentWidthInput.value.trim() || undefined;
            updateStructure();
          }
        }, 300);
        contentWidthGroup.appendChild(contentWidthLabel);
        contentWidthGroup.appendChild(contentWidthInput);
        contentInputContainer.appendChild(contentWidthGroup);
      }
    }
    
    function createOpenUrlButton() {
      if (openUrlButton) {
        openUrlButton.remove();
      }
      
      if (contentTypeDropdown && contentTypeDropdown.getValue() === 'url') {
        openUrlButton = document.createElement('button');
        openUrlButton.id = 'content-open-url-btn';
        openUrlButton.type = 'button';
        openUrlButton.className = 'button button-text';
        openUrlButton.style.padding = 'var(--UI-Spacing-spacing-xs)';
        openUrlButton.style.minWidth = 'auto';
        openUrlButton.style.display = 'inline-flex';
        openUrlButton.style.alignItems = 'center';
        openUrlButton.style.justifyContent = 'center';
        openUrlButton.style.verticalAlign = 'middle';
        openUrlButton.style.lineHeight = '1';
        openUrlButton.setAttribute('aria-label', 'Open URL in new tab');
        
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('width', '16');
        iconSvg.setAttribute('height', '16');
        iconSvg.setAttribute('viewBox', '0 0 16 16');
        iconSvg.setAttribute('fill', 'none');
        iconSvg.style.display = 'block';
        
        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('d', 'M10 2H4C3.44772 2 3 2.44772 3 3V12C3 12.5523 3.44772 13 4 13H13C13.5523 13 14 12.5523 14 12V6');
        path1.setAttribute('stroke', 'currentColor');
        path1.setAttribute('stroke-width', '1.5');
        path1.setAttribute('stroke-linecap', 'round');
        path1.setAttribute('stroke-linejoin', 'round');
        
        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('d', 'M11 1H14V4');
        path2.setAttribute('stroke', 'currentColor');
        path2.setAttribute('stroke-width', '1.5');
        path2.setAttribute('stroke-linecap', 'round');
        path2.setAttribute('stroke-linejoin', 'round');
        
        const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path3.setAttribute('d', 'M6 10L14 2');
        path3.setAttribute('stroke', 'currentColor');
        path3.setAttribute('stroke-width', '1.5');
        path3.setAttribute('stroke-linecap', 'round');
        path3.setAttribute('stroke-linejoin', 'round');
        
        iconSvg.appendChild(path1);
        iconSvg.appendChild(path2);
        iconSvg.appendChild(path3);
        openUrlButton.appendChild(iconSvg);
        
        const updateButtonState = () => {
          if (contentInput && openUrlButton) {
            const urlValue = contentInput.value.trim();
            openUrlButton.disabled = !urlValue || !/^https?:\/\//i.test(urlValue);
          }
        };
        
        openUrlButton.onclick = (e) => {
          e.preventDefault();
          if (contentInput) {
            const urlValue = contentInput.value.trim();
            if (urlValue && /^https?:\/\//i.test(urlValue)) {
              window.open(urlValue, '_blank', 'noopener,noreferrer');
            }
          }
        };
        
        contentLabel.parentNode.insertBefore(openUrlButton, contentLabel.nextSibling);
        updateButtonState();
        
        if (contentInput) {
          const originalOnInput = contentInput.oninput;
          contentInput.oninput = debounce(() => {
            if (originalOnInput) originalOnInput();
            updateButtonState();
          }, 300);
        }
      }
    }

    contentTypeDropdown = new Dropdown(contentTypeDropdownContainer, {
      items: [
        { value: 'none', label: 'None' },
        { value: 'markdown', label: 'Markdown' },
        { value: 'url', label: 'URL' }
      ],
      selectedValue: currentStructure.content ? currentStructure.content.type : 'none',
      growToFit: false,
      onSelect: (value) => {
        if (value === 'none') {
          contentInputGroup.style.display = 'none';
          currentStructure.content = null;
          if (openUrlButton) {
            openUrlButton.remove();
            openUrlButton = null;
          }
        } else {
          contentInputGroup.style.display = 'block';
          contentLabel.textContent = value === 'url' ? 'URL' : 'Markdown Content';
          
          const currentValue = currentStructure.content ? currentStructure.content.value : '';
          if (!currentStructure.content) {
            currentStructure.content = { type: value, value: '' };
          } else {
            currentStructure.content.type = value;
          }
          
          createContentInput(value, currentValue, currentStructure.content?.openInNewTab, currentStructure.content?.contentWidth);
          
          if (value === 'url') {
            createOpenUrlButton();
          } else {
            if (openUrlButton) {
              openUrlButton.remove();
              openUrlButton = null;
            }
          }
        }
        updateStructure();
      }
    });

    if (currentStructure.content) {
      contentTypeDropdown.setValue(currentStructure.content.type);
      const handler = contentTypeDropdown.config.onSelect;
      if (handler) {
        handler(currentStructure.content.type);
      }
    } else {
      contentInputGroup.style.display = 'none';
    }
}

// Initialize on load
initEditor();
