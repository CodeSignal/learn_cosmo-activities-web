import toolbar from '../components/toolbar.js';
import SplitPanel from '../design-system/components/split-panel/split-panel.js';

export function initTextInput({ activity, state, postResults, persistedAnswers = null }) {
  const elContainer = document.getElementById('activity-container');
  const textInput = activity.textInput;
  
  if (!textInput || !textInput.questions || textInput.questions.length === 0) {
    elContainer.innerHTML = '<div class="error">No text input questions found</div>';
    return () => {
      elContainer.innerHTML = '';
    };
  }
  
  // Check if content is provided
  const hasContent = textInput.content && (textInput.content.url || textInput.content.markdown);
  
  // Store split panel reference for cleanup
  let splitPanel = null;
  
  // Create the text input container
  if (hasContent) {
    elContainer.innerHTML = `
      <div id="text-input" class="text-input text-input-with-content">
        <div id="text-input-split-panel" class="text-input-split-panel"></div>
      </div>
    `;
    
    // Initialize split panel
    const splitPanelContainer = document.getElementById('text-input-split-panel');
    splitPanel = new SplitPanel(splitPanelContainer, {
      initialSplit: 40,
      minLeft: 20,
      minRight: 30,
    });
    
    // Get panel references
    const leftPanel = splitPanel.getLeftPanel();
    const rightPanel = splitPanel.getRightPanel();
    
    // Set up left panel (content)
    leftPanel.className = 'text-input-content-wrapper';
    leftPanel.innerHTML = '<iframe id="text-input-content-iframe" class="text-input-content-iframe" frameborder="1"></iframe>';
    
    // Set up right panel (questions)
    rightPanel.className = 'text-input-questions-wrapper';
    rightPanel.innerHTML = `
      <div id="text-input-questions" class="text-input-questions"></div>
      <div id="text-input-scroll-indicator" class="text-input-scroll-indicator" aria-hidden="true">
        <div class="text-input-scroll-indicator-fade"></div>
        <div class="text-input-scroll-indicator-hint">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="body-xsmall">More questions below</span>
        </div>
      </div>
    `;
  } else {
    elContainer.innerHTML = `
      <div id="text-input" class="text-input">
        <div id="text-input-questions" class="text-input-questions"></div>
        <div id="text-input-scroll-indicator" class="text-input-scroll-indicator" aria-hidden="true">
          <div class="text-input-scroll-indicator-fade"></div>
          <div class="text-input-scroll-indicator-hint">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="body-xsmall">More questions below</span>
          </div>
        </div>
      </div>
    `;
  }
  
  const elTextInput = document.getElementById('text-input');
  const elQuestions = document.getElementById('text-input-questions');
  const elScrollIndicator = document.getElementById('text-input-scroll-indicator');
  
  // Initialize content iframe if content is provided
  if (hasContent) {
    const elContentIframe = document.getElementById('text-input-content-iframe');
    const elQuestionsWrapper = document.getElementById('text-input-questions-wrapper');
    
    // Load content into iframe
    if (textInput.content.url) {
      elContentIframe.src = textInput.content.url;
    } else if (textInput.content.markdown) {
      // Render markdown content via API
      fetch('/api/content/markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: textInput.content.markdown })
      })
      .then(res => res.text())
      .then(html => {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        elContentIframe.src = url;
      })
      .catch(err => {
        console.error('Failed to render markdown content:', err);
      });
    }
  }
  
  // Track user answers per question
  const userAnswers = {};
  
  // Track validation state
  let isValidating = false;
  
  // Initialize user answers from persisted answers if available
  textInput.questions.forEach(q => {
    if (persistedAnswers && persistedAnswers[q.id] !== undefined) {
      userAnswers[q.id] = persistedAnswers[q.id];
    } else {
      userAnswers[q.id] = '';
    }
  });
  
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
  
  // Validation functions
  function validateString(userAnswer, correctAnswer, options = {}) {
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
  
  function validateNumeric(userAnswer, correctAnswer, options = {}) {
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
  
  function validateNumericWithUnits(userAnswer, correctAnswer, options = {}) {
    const threshold = options.threshold !== undefined ? options.threshold : 0.01;
    const precision = options.precision !== undefined ? options.precision : 2;
    const units = options.units || [];
    
    // Extract numeric value and unit from user answer
    const userMatch = String(userAnswer).trim().match(/^([\d.]+)\s*(.*)$/);
    if (!userMatch) {
      return false;
    }
    
    const userValue = parseFloat(userMatch[1]);
    const userUnit = userMatch[2].trim().toLowerCase();
    
    // Extract numeric value and unit from correct answer
    const correctMatch = String(correctAnswer).trim().match(/^([\d.]+)\s*(.*)$/);
    if (!correctMatch) {
      return false;
    }
    
    const correctValue = parseFloat(correctMatch[1]);
    const correctUnit = correctMatch[2].trim().toLowerCase();
    
    // Check if units match (case insensitive, and check against allowed units)
    if (units.length > 0) {
      // If units are specified, check if user unit matches any allowed unit
      const userUnitMatches = units.some(u => u.toLowerCase() === userUnit);
      const correctUnitMatches = units.some(u => u.toLowerCase() === correctUnit);
      
      if (!userUnitMatches || !correctUnitMatches) {
        return false;
      }
      
      // If both match, check if they match each other
      if (userUnit !== correctUnit) {
        return false;
      }
    } else {
      // If no units specified, just check if they match
      if (userUnit !== correctUnit) {
        return false;
      }
    }
    
    // Check numeric value
    return validateNumeric(userValue, correctValue, { threshold, precision });
  }
  
  function validateNumericWithCurrency(userAnswer, correctAnswer, options = {}) {
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
  
  function validateAnswer(question) {
    const userAnswer = userAnswers[question.id] || '';
    const correctAnswer = question.correctAnswer;
    const validation = question.validation || {};
    
    if (!userAnswer.trim()) {
      return false;
    }
    
    const options = validation.options || {};
    
    switch (validation.kind) {
      case 'string':
        return validateString(userAnswer, correctAnswer, options);
      case 'numeric':
        return validateNumeric(userAnswer, correctAnswer, options);
      case 'numeric-with-units':
        return validateNumericWithUnits(userAnswer, correctAnswer, options);
      case 'numeric-with-currency':
        return validateNumericWithCurrency(userAnswer, correctAnswer, options);
      default:
        // Default to exact string match (case-insensitive)
        return validateString(userAnswer, correctAnswer, { caseSensitive: false });
    }
  }
  
  // Render all questions
  textInput.questions.forEach((question, qIdx) => {
    const questionEl = document.createElement('div');
    questionEl.className = 'text-input-question';
    questionEl.setAttribute('data-question-id', question.id);
    questionEl.setAttribute('data-question-index', qIdx.toString());
    
    // Question legend (Question 1, Question 2, etc.)
    const legend = document.createElement('div');
    legend.className = 'text-input-legend heading-xsmall';
    legend.textContent = `Question ${qIdx + 1}`;
    questionEl.appendChild(legend);
    
    // Question text
    const questionTextEl = document.createElement('div');
    questionTextEl.className = 'text-input-question-text body-xlarge';
    questionTextEl.textContent = question.text;
    questionEl.appendChild(questionTextEl);
    
    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'text-input-container';
    
    // Check if this is a currency input
    const isCurrency = question.validation && question.validation.kind === 'numeric-with-currency';
    const currencySymbol = isCurrency ? (question.validation.options?.currency || '$') : null;
    
    // Create input wrapper for currency overlay
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'text-input-field-wrapper';
    if (isCurrency) {
      inputWrapper.classList.add('text-input-field-wrapper-currency');
      inputWrapper.setAttribute('data-currency', currencySymbol);
    }
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input text-input-field';
    input.id = `q${question.id}-input`;
    input.value = userAnswers[question.id] || '';
    input.setAttribute('aria-label', `Answer for question ${qIdx + 1}`);
    input.placeholder = 'Enter your answer...';
    
    // Add input event listener
    input.addEventListener('input', () => {
      // Clear validation when user changes any value
      clearValidation();
      userAnswers[question.id] = input.value;
      updateResultsAndPost();
    });
    
    inputWrapper.appendChild(input);
    inputContainer.appendChild(inputWrapper);
    
    // Add "Next" button for non-last questions
    if (qIdx < textInput.questions.length - 1) {
      const nextButtonContainer = document.createElement('div');
      nextButtonContainer.className = 'text-input-next-button-container';
      
      const nextButton = document.createElement('button');
      nextButton.className = 'button button-primary text-input-next-button';
      nextButton.textContent = 'Next';
      nextButton.type = 'button';
      // Enable if answer exists for this question
      const hasAnswer = userAnswers[question.id] && userAnswers[question.id].trim().length > 0;
      nextButton.disabled = !hasAnswer;
      nextButton.setAttribute('aria-label', `Go to next question`);
      
      // Next button click handler (no scrolling)
      nextButton.addEventListener('click', () => {
        // Focus the next question's input field
        const nextQuestionIndex = qIdx + 1;
        if (nextQuestionIndex < textInput.questions.length) {
          const nextQuestion = textInput.questions[nextQuestionIndex];
          const nextInput = document.getElementById(`q${nextQuestion.id}-input`);
          if (nextInput) {
            nextInput.focus();
          }
        }
      });
      
      // Update button state when input changes
      input.addEventListener('input', () => {
        const hasAnswer = input.value.trim().length > 0;
        nextButton.disabled = !hasAnswer;
      });
      
      inputContainer.appendChild(nextButtonContainer);
    }
    questionEl.appendChild(inputContainer);
    
    elQuestions.appendChild(questionEl);
  });
  
  
  function addErrorIcon(questionEl) {
    // Check if icon already exists
    if (questionEl.querySelector('.text-input-question-error-icon')) {
      return;
    }
    
    const errorIcon = document.createElement('div');
    errorIcon.className = 'text-input-question-error-icon';
    errorIcon.innerHTML = `
      <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="2" width="2" height="5" rx="1" fill="white"/>
        <circle cx="6" cy="9" r="1" fill="white"/>
      </svg>
    `;
    questionEl.appendChild(errorIcon);
  }
  
  function removeErrorIcon(questionEl) {
    const errorIcon = questionEl.querySelector('.text-input-question-error-icon');
    if (errorIcon) {
      errorIcon.remove();
    }
  }
  
  function clearValidation() {
    if (!isValidating) return;
    
    isValidating = false;
    // Remove validation classes from all questions
    textInput.questions.forEach(q => {
      const questionEl = elQuestions.querySelector(`[data-question-id="${q.id}"]`);
      if (questionEl) {
        questionEl.classList.remove('text-input-question-incorrect');
        removeErrorIcon(questionEl);
      }
    });
  }
  
  function validateAnswers() {
    isValidating = true;
    
    // Check each question and mark incorrect ones
    textInput.questions.forEach(q => {
      const isCorrect = validateAnswer(q);
      
      const questionEl = elQuestions.querySelector(`[data-question-id="${q.id}"]`);
      if (questionEl) {
        if (!isCorrect) {
          questionEl.classList.add('text-input-question-incorrect');
          addErrorIcon(questionEl);
        } else {
          questionEl.classList.remove('text-input-question-incorrect');
          removeErrorIcon(questionEl);
        }
      }
    });
  }
  
  function updateResultsAndPost() {
    state.results = textInput.questions.map((q, idx) => {
      const userAnswer = userAnswers[q.id] || '';
      const isCorrect = validateAnswer(q);
      
      return {
        text: `Question ${idx + 1}`,
        selected: userAnswer,
        correct: q.correctAnswer
      };
    });
    
    // Count answered questions
    state.index = Object.values(userAnswers).filter(answer => answer && answer.trim().length > 0).length;
    
    postResults();
  }
  
  // Initialize results
  updateResultsAndPost();
  
  // Clear all answers function
  function clearAllAnswers() {
    // Clear all user answers
    textInput.questions.forEach(q => {
      userAnswers[q.id] = '';
    });
    
    // Clear all inputs
    elQuestions.querySelectorAll('.text-input-field').forEach(input => {
      input.value = '';
    });
    
    // Clear validation state
    clearValidation();
    
    // Update results and post
    updateResultsAndPost();
  }
  
  // Register "Clear All" tool in global toolbar
  toolbar.registerTool('text-input-clear-all', {
    icon: 'icon-eraser',
    title: 'Clear All',
    onClick: (e) => {
      e.preventDefault();
      clearAllAnswers();
    },
    enabled: true
  });
  
  // Add static top padding to position first question near the top
  elQuestions.style.paddingTop = '2rem';
  
  // Function to check if there's content below the fold and update scroll indicator
  function updateScrollIndicator() {
    if (!elScrollIndicator) return;
    
    const questionsWrapper = hasContent ? document.getElementById('text-input-questions-wrapper') : null;
    const scrollContainer = questionsWrapper || window;
    const scrollElement = questionsWrapper || document.documentElement;
    
    let scrollTop, scrollHeight, clientHeight;
    if (hasContent && questionsWrapper) {
      scrollTop = questionsWrapper.scrollTop;
      scrollHeight = questionsWrapper.scrollHeight;
      clientHeight = questionsWrapper.clientHeight;
    } else {
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    }
    
    // Check if there's content below the visible area
    const isContentBelow = scrollHeight > clientHeight;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isContentBelow && !isNearBottom) {
      elScrollIndicator.classList.add('text-input-scroll-indicator-visible');
    } else {
      elScrollIndicator.classList.remove('text-input-scroll-indicator-visible');
    }
  }
  
  // Update scroll indicator on scroll and resize
  let scrollIndicatorTimeout;
  function handleScrollIndicatorUpdate() {
    clearTimeout(scrollIndicatorTimeout);
    scrollIndicatorTimeout = setTimeout(() => {
      updateScrollIndicator();
    }, 100);
  }
  
  if (hasContent) {
    const questionsWrapper = document.getElementById('text-input-questions-wrapper');
    if (questionsWrapper) {
      questionsWrapper.addEventListener('scroll', handleScrollIndicatorUpdate, { passive: true });
    }
  } else {
    window.addEventListener('scroll', handleScrollIndicatorUpdate, { passive: true });
  }
  window.addEventListener('resize', handleScrollIndicatorUpdate, { passive: true });
  
  // Initial check after questions are rendered
  setTimeout(() => {
    updateScrollIndicator();
  }, 200);
  
  return {
    cleanup: () => {
      toolbar.unregisterTool('text-input-clear-all');
      if (splitPanel) {
        splitPanel.destroy();
        splitPanel = null;
      }
      if (hasContent) {
        const questionsWrapper = document.getElementById('text-input-questions-wrapper');
        if (questionsWrapper) {
          questionsWrapper.removeEventListener('scroll', handleScrollIndicatorUpdate);
        }
      } else {
        window.removeEventListener('scroll', handleScrollIndicatorUpdate);
      }
      window.removeEventListener('resize', handleScrollIndicatorUpdate);
      elContainer.innerHTML = '';
    },
    validate: validateAnswers
  };
}

