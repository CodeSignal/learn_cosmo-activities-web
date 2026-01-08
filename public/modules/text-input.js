import toolbar from '../components/toolbar.js';

export function initTextInput({ activity, state, postResults, persistedAnswers = null }) {
  const elContainer = document.getElementById('activity-container');
  const textInput = activity.textInput;
  
  if (!textInput || !textInput.questions || textInput.questions.length === 0) {
    elContainer.innerHTML = '<div class="error">No text input questions found</div>';
    return () => {
      elContainer.innerHTML = '';
    };
  }
  
  // Create the text input container
  elContainer.innerHTML = `
    <div id="text-input" class="text-input">
      <div id="text-input-questions" class="text-input-questions"></div>
    </div>
  `;
  
  const elTextInput = document.getElementById('text-input');
  const elQuestions = document.getElementById('text-input-questions');
  
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
    
    inputContainer.appendChild(input);
    
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
      
      // Scroll to next question when button is clicked
      nextButton.addEventListener('click', () => {
        const questionIndex = parseInt(questionEl.getAttribute('data-question-index'), 10);
        scrollToNextQuestion(questionIndex);
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
  
  function findCenteredQuestionIndex() {
    const viewportCenter = window.innerHeight / 2 + window.scrollY;
    let closestQuestionIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < elQuestions.children.length; i++) {
      const questionEl = elQuestions.children[i];
      const rect = questionEl.getBoundingClientRect();
      const questionCenter = rect.top + rect.height / 2 + window.scrollY;
      const distance = Math.abs(viewportCenter - questionCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestQuestionIndex = i;
      }
    }
    
    return closestQuestionIndex;
  }
  
  function updateQuestionOpacity(centeredQuestionIndex) {
    for (let i = 0; i < elQuestions.children.length; i++) {
      const questionEl = elQuestions.children[i];
      if (i === centeredQuestionIndex) {
        questionEl.classList.add('text-input-question-centered');
      } else {
        questionEl.classList.remove('text-input-question-centered');
      }
    }
  }
  
  function updateDynamicPadding(centeredQuestionIndex) {
    const viewportHeight = window.innerHeight;
    
    // Calculate padding based on position
    const totalQuestions = textInput.questions.length;
    const isFirstQuestion = centeredQuestionIndex === 0;
    const isLastQuestion = centeredQuestionIndex === totalQuestions - 1;
    
    // Calculate how much padding is needed
    let topPadding = 0;
    let bottomPadding = 0;
    
    if (isFirstQuestion) {
      // Need padding at top to center first question
      const firstQuestionEl = elQuestions.children[0];
      if (firstQuestionEl) {
        const rect = firstQuestionEl.getBoundingClientRect();
        const questionHeight = rect.height;
        // Reduce padding slightly (multiply by 0.85) for better centering
        const neededPadding = Math.max(0, (viewportHeight - questionHeight) / 2 * 0.85);
        topPadding = neededPadding;
      }
    }
    
    if (isLastQuestion) {
      // Need padding at bottom to center last question
      const lastQuestionEl = elQuestions.children[totalQuestions - 1];
      if (lastQuestionEl) {
        const rect = lastQuestionEl.getBoundingClientRect();
        const questionHeight = rect.height;
        const neededPadding = Math.max(0, (viewportHeight - questionHeight) / 2);
        bottomPadding = neededPadding;
      }
    }
    
    // Apply padding dynamically
    elQuestions.style.paddingTop = `${topPadding}px`;
    elQuestions.style.paddingBottom = `${bottomPadding}px`;
  }
  
  function centerQuestion(questionIndex) {
    const questionEl = elQuestions.children[questionIndex];
    if (questionEl) {
      updateDynamicPadding(questionIndex);
      updateQuestionOpacity(questionIndex);
      questionEl.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      // Update opacity and padding again after scroll animation completes
      setTimeout(() => {
        const centeredIndex = findCenteredQuestionIndex();
        updateQuestionOpacity(centeredIndex);
        updateDynamicPadding(centeredIndex);
      }, 600);
    }
  }
  
  function scrollToNextQuestion(currentQuestionIndex) {
    const nextQuestionIndex = currentQuestionIndex + 1;
    if (nextQuestionIndex < textInput.questions.length) {
      centerQuestion(nextQuestionIndex);
    }
  }
  
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
  
  // Add scroll event listener to update opacity dynamically on manual scroll
  let scrollTimeout;
  function handleScroll() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const centeredIndex = findCenteredQuestionIndex();
      updateQuestionOpacity(centeredIndex);
      updateDynamicPadding(centeredIndex);
    }, 50); // Debounce scroll events
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
  
  // Center the first question (or first answered question) on initial load
  setTimeout(() => {
    let questionToCenter = 0; // Default to first question
    
    // If persisted answers exist, always scroll to the first question
    if (persistedAnswers) {
      questionToCenter = 0;
    } else {
      // Otherwise, check if there's a pre-answered question from state
      for (let i = 0; i < textInput.questions.length; i++) {
        const q = textInput.questions[i];
        if (userAnswers[q.id] && userAnswers[q.id].trim().length > 0) {
          questionToCenter = i;
          break;
        }
      }
    }
    
    centerQuestion(questionToCenter);
    // Update opacity and padding after scroll animation completes
    setTimeout(() => {
      const centeredIndex = findCenteredQuestionIndex();
      updateQuestionOpacity(centeredIndex);
      updateDynamicPadding(centeredIndex);
    }, 600); // Wait for smooth scroll to complete
  }, 100);
  
  return {
    cleanup: () => {
      toolbar.unregisterTool('text-input-clear-all');
      window.removeEventListener('scroll', handleScroll);
      elContainer.innerHTML = '';
    },
    validate: validateAnswers
  };
}

