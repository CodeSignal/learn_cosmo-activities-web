import Dropdown from '/design-system/components/dropdown/dropdown.js';

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

  // Process content
  if (contentBuffer.length > 0) {
    const contentText = contentBuffer.join('\n').trim();
    if (contentText) {
      if (/^https?:\/\//i.test(contentText)) {
        structure.content = { type: 'url', value: contentText };
      } else {
        structure.content = { type: 'markdown', value: contentText };
      }
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
    markdown += `__Content__\n\n${structure.content.value}\n\n`;
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
    return { markdown: data.markdown || '', questionType: data.questionType };
  } catch (error) {
    console.error('Error loading markdown:', error);
    return { markdown: '', questionType: null };
  }
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
      { value: 'numeric-with-currency', label: 'Numeric with Currency' }
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

// Global structure
let currentStructure = {
  type: 'Text Input',
  questions: [],
  content: null
};

// Store dropdown instances for updates
const questionDropdowns = new Map();

// Update structure and save
const debouncedSave = debounce((markdown) => {
  saveMarkdown(markdown);
}, 500);

function updateStructure() {
  const markdown = structureToMarkdown(currentStructure);
  debouncedSave(markdown);
}

// Initialize editor
async function initEditor() {
  const { markdown, questionType } = await loadMarkdown();
  
  // Set type from server
  if (questionType) {
    currentStructure.type = questionType;
  }
  
  if (markdown && markdown.trim()) {
    const parsed = parseMarkdownToStructure(markdown);
    // Merge parsed structure but keep the type from server
    currentStructure.questions = parsed.questions;
    currentStructure.content = parsed.content;
    // Use server-provided type, not parsed type
  }

  // Ensure at least one question exists
  if (currentStructure.questions.length === 0) {
    currentStructure.questions.push({
      text: '',
      correctAnswer: '',
      validation: { kind: 'string', options: {} }
    });
  }

  // Render questions
  const questionsContainer = document.getElementById('questions-container');
  questionsContainer.innerHTML = '';
  currentStructure.questions.forEach((q, index) => {
    questionsContainer.appendChild(renderQuestion(q, index));
  });

  // Handle add question
  document.getElementById('add-question-btn').onclick = () => {
    const newQuestion = {
      text: '',
      correctAnswer: '',
      validation: { kind: 'string', options: {} }
    };
    currentStructure.questions.push(newQuestion);
    const index = currentStructure.questions.length - 1;
    questionsContainer.appendChild(renderQuestion(newQuestion, index));
    updateStructure();
  };

  // Handle content type change
  const contentTypeDropdownContainer = document.getElementById('content-type-dropdown');
  contentTypeDropdownContainer.style.width = '240px';
  const contentInputGroup = document.getElementById('content-input-group');
  const contentInputContainer = document.getElementById('content-input-container');
  const contentLabel = document.getElementById('content-label');
  let contentInput = null;
  let contentTypeDropdown = null;
  let openUrlButton = null;

  function createContentInput(type, value) {
    // Clear container
    contentInputContainer.innerHTML = '';
    
    if (type === 'url') {
      // Create text input for URL
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
        // Update button state if it exists
        if (openUrlButton) {
          const urlValue = contentInput.value.trim();
          openUrlButton.disabled = !urlValue || !/^https?:\/\//i.test(urlValue);
        }
      }, 300);
    } else {
      // Create textarea for markdown
      contentInput = document.createElement('textarea');
      contentInput.id = 'content-input';
      contentInput.className = 'form-textarea';
      contentInput.placeholder = 'Enter markdown content...';
      contentInput.value = value || '';
      
      contentInputContainer.appendChild(contentInput);
      
      // Set up input handler
      contentInput.oninput = debounce(() => {
        if (currentStructure.content) {
          currentStructure.content.value = contentInput.value;
          updateStructure();
        }
      }, 300);
    }
  }
  
  // Create icon button to open URL (placed next to label)
  function createOpenUrlButton() {
    // Remove existing button if any
    if (openUrlButton) {
      openUrlButton.remove();
    }
    
    // Only create button if content type is URL
    if (contentTypeDropdown && contentTypeDropdown.getValue() === 'url') {
      openUrlButton = document.createElement('button');
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
      
      // Create external link icon SVG
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
      
      // Update button state
      const updateButtonState = () => {
        if (contentInput && openUrlButton) {
          const urlValue = contentInput.value.trim();
          openUrlButton.disabled = !urlValue || !/^https?:\/\//i.test(urlValue);
        }
      };
      
      // Open URL in new tab when button is clicked
      openUrlButton.onclick = (e) => {
        e.preventDefault();
        if (contentInput) {
          const urlValue = contentInput.value.trim();
          if (urlValue && /^https?:\/\//i.test(urlValue)) {
            window.open(urlValue, '_blank', 'noopener,noreferrer');
          }
        }
      };
      
      // Insert button after the label - they'll be inline since label is inline-flex
      contentLabel.parentNode.insertBefore(openUrlButton, contentLabel.nextSibling);
      
      // Set initial state
      updateButtonState();
      
      // Update button state when input changes
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
        // Remove button if it exists
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
        
        createContentInput(value, currentValue);
        
        // Create or remove button based on type
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

  // Set initial content state
  if (currentStructure.content) {
    contentTypeDropdown.setValue(currentStructure.content.type);
    // Trigger the onSelect handler to set up the input
    const handler = contentTypeDropdown.config.onSelect;
    if (handler) {
      handler(currentStructure.content.type);
    }
  }
}

// Initialize on load
initEditor();
