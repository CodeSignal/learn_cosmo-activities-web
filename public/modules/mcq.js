import toolbar from '../components/toolbar.js';
import { detectQuoteBlockquotes } from '../design-system/typography/typography.js';

export function initMcq({ activity, state, postResults, persistedAnswers = null, persistedExplanations = null }) {
  const elContainer = document.getElementById('activity-container');
  const mcq = activity.mcq;
  
  if (!mcq || !mcq.questions || mcq.questions.length === 0) {
    elContainer.innerHTML = '<div class="error">No MCQ questions found</div>';
    return () => {
      elContainer.innerHTML = '';
    };
  }
  
  // Create the MCQ container
  elContainer.innerHTML = `
    <div id="mcq" class="mcq">
      <div id="mcq-questions" class="mcq-questions"></div>
    </div>
  `;
  
  const elMcq = document.getElementById('mcq');
  const elQuestions = document.getElementById('mcq-questions');
  
  // Track selected answers per question
  const selectedAnswers = {};
  
  // Track explanations per question
  const explanations = {};
  
  // Track validation state
  let isValidating = false;
  
  // Initialize selected answers from persisted answers if available
  mcq.questions.forEach(q => {
    if (persistedAnswers && persistedAnswers[q.id] !== undefined) {
      selectedAnswers[q.id] = Array.isArray(persistedAnswers[q.id]) 
        ? persistedAnswers[q.id] 
        : [persistedAnswers[q.id]];
    } else {
      selectedAnswers[q.id] = [];
    }
    // Initialize explanations from persisted explanations if available
    if (persistedExplanations && persistedExplanations[q.id] !== undefined) {
      explanations[q.id] = persistedExplanations[q.id];
    } else {
      explanations[q.id] = '';
    }
  });
  
  // Render all questions
  const hasMultipleQuestions = mcq.questions.length > 1;
  
  mcq.questions.forEach((question, qIdx) => {
    const questionEl = document.createElement('div');
    questionEl.className = 'mcq-question';
    questionEl.setAttribute('data-question-id', question.id);
    questionEl.setAttribute('data-question-index', qIdx.toString());
    
    // Question legend (Question 1, Question 2, etc.) - only show if multiple questions
    if (hasMultipleQuestions) {
      const legend = document.createElement('div');
      legend.className = 'mcq-legend heading-xsmall';
      legend.textContent = `Question ${qIdx + 1}`;
      questionEl.appendChild(legend);
    }
    
    // Question text (support markdown HTML if available, fallback to plain text for backward compatibility)
    const questionTextEl = document.createElement('div');
    questionTextEl.className = 'mcq-question-text body-xlarge';
    if (question.textHtml) {
      questionTextEl.innerHTML = question.textHtml;
    } else {
      questionTextEl.textContent = question.text;
    }
    questionEl.appendChild(questionTextEl);
    
    // Options container
    const optionsEl = document.createElement('fieldset');
    optionsEl.className = 'mcq-options';
    
    // Create options
    question.options.forEach((option, optIdx) => {
      const optionEl = document.createElement('label');
      // Apply design system classes to the option label
      optionEl.className = question.isMultiSelect 
        ? 'mcq-option input-checkbox' 
        : 'mcq-option input-radio';
      
      const input = document.createElement('input');
      input.type = question.isMultiSelect ? 'checkbox' : 'radio';
      input.name = `question-${question.id}`;
      input.value = option.label;
      input.id = `q${question.id}-opt${optIdx}`;
      input.setAttribute('aria-label', `Option ${option.label}: ${option.text}`);
      
      const optionText = document.createElement('span');
      optionText.className = 'mcq-option-text body-large';
      // Support markdown HTML if available, fallback to plain text for backward compatibility
      if (option.textHtml) {
        optionText.innerHTML = option.textHtml;
      } else {
        optionText.textContent = option.text;
      }
      
      const optionLabel = document.createElement('span');
      optionLabel.className = 'mcq-option-label';
      optionLabel.textContent = option.label + '.';
      
      // Create option card structure matching Figma design
      const optionCard = document.createElement('div');
      optionCard.className = 'mcq-option-card';
      
      // Use design system checkbox/radio structure
      if (question.isMultiSelect) {
        // Checkbox structure: input-checkbox-box with checkmark
        const checkboxBox = document.createElement('span');
        checkboxBox.className = 'input-checkbox-box';
        
        const checkboxCheckmark = document.createElement('span');
        checkboxCheckmark.className = 'input-checkbox-checkmark';
        
        checkboxBox.appendChild(checkboxCheckmark);
        
        // Text wrapper
        const textWrapper = document.createElement('div');
        textWrapper.className = 'mcq-option-content';
        textWrapper.appendChild(optionText);
        
        optionCard.appendChild(checkboxBox);
        optionCard.appendChild(textWrapper);
      } else {
        // Radio structure: input-radio-circle with dot
        const radioCircle = document.createElement('span');
        radioCircle.className = 'input-radio-circle';
        
        const radioDot = document.createElement('span');
        radioDot.className = 'input-radio-dot';
        
        radioCircle.appendChild(radioDot);
        
        // Text wrapper
        const textWrapper = document.createElement('div');
        textWrapper.className = 'mcq-option-content';
        textWrapper.appendChild(optionText);
        
        optionCard.appendChild(radioCircle);
        optionCard.appendChild(textWrapper);
      }
      
      // Apply persisted answers if available
      if (selectedAnswers[question.id] && selectedAnswers[question.id].includes(option.label)) {
        input.checked = true;
      }
      
      // Append input first (for CSS sibling selector), then card
      optionEl.appendChild(input);
      optionEl.appendChild(optionCard);
      optionsEl.appendChild(optionEl);
      
      // Add change listener
      input.addEventListener('change', () => {
        // Clear validation when user changes any value
        clearValidation();
        updateSelection(question.id, option.label, input.checked);
        
        // For radio questions, center the selected question and auto-scroll after a short delay
        // Only do this if there are multiple questions AND explainAnswer is not enabled
        // (If explainAnswer is enabled, user needs to type explanation, so don't auto-scroll)
        if (!question.isMultiSelect && input.checked && mcq.questions.length > 1 && !question.explainAnswer) {
          const questionEl = elQuestions.querySelector(`[data-question-id="${question.id}"]`);
          const questionIndex = parseInt(questionEl.getAttribute('data-question-index'), 10);
          
          // Center the currently selected question
          centerQuestion(questionIndex);
          
          // Auto-scroll to next question after a brief delay (only if not last question)
          const isLastQuestion = questionIndex === mcq.questions.length - 1;
          if (!isLastQuestion) {
            setTimeout(() => {
              scrollToNextQuestion(questionIndex);
            }, 300);
          }
        }
      });
    });
    
    questionEl.appendChild(optionsEl);
    
    // Add explanation textarea if enabled
    if (question.explainAnswer) {
      const explainContainer = document.createElement('div');
      explainContainer.className = 'mcq-explain-container';
      
      const explainLabel = document.createElement('label');
      explainLabel.className = 'mcq-explain-label body-large';
      explainLabel.textContent = 'Explain your answer';
      explainLabel.setAttribute('for', `explain-${question.id}`);
      explainContainer.appendChild(explainLabel);
      
      const explainTextarea = document.createElement('textarea');
      explainTextarea.id = `explain-${question.id}`;
      explainTextarea.className = 'input mcq-explain-textarea';
      explainTextarea.placeholder = 'Enter your explanation...';
      explainTextarea.rows = 4;
      explainTextarea.value = explanations[question.id] || '';
      explainTextarea.setAttribute('aria-label', 'Explain your answer');
      
      // Sync explanation value to our tracking object on load (in case it was set before listener)
      explanations[question.id] = explainTextarea.value;
      
      // Update explanation on input
      explainTextarea.addEventListener('input', () => {
        explanations[question.id] = explainTextarea.value;
        updateResultsAndPost();
      });
      
      explainContainer.appendChild(explainTextarea);
      questionEl.appendChild(explainContainer);
    }
    
    // Add "Next" button for multi-select questions or questions with explainAnswer (not on last question)
    if ((question.isMultiSelect || question.explainAnswer) && qIdx < mcq.questions.length - 1) {
      const nextButtonContainer = document.createElement('div');
      nextButtonContainer.className = 'mcq-next-button-container';
      
      const nextButton = document.createElement('button');
      nextButton.className = 'button button-primary mcq-next-button';
      nextButton.textContent = 'Next';
      nextButton.type = 'button';
      // Enable if persisted answers exist for this question
      const hasPersistedAnswers = selectedAnswers[question.id] && selectedAnswers[question.id].length > 0;
      nextButton.disabled = !hasPersistedAnswers;
      nextButton.setAttribute('aria-label', `Go to next question`);
      
      // Scroll to next question when button is clicked
      nextButton.addEventListener('click', () => {
        const questionIndex = parseInt(questionEl.getAttribute('data-question-index'), 10);
        scrollToNextQuestion(questionIndex);
      });
      
      nextButtonContainer.appendChild(nextButton);
      questionEl.appendChild(nextButtonContainer);
    }
    
    elQuestions.appendChild(questionEl);
  });
  
  // Detect and style blockquotes that start with quotes
  detectQuoteBlockquotes(elMcq);
  
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
        questionEl.classList.add('mcq-question-centered');
      } else {
        questionEl.classList.remove('mcq-question-centered');
      }
    }
  }
  
  function updateDynamicPadding(centeredQuestionIndex) {
    const viewportHeight = window.innerHeight;
    
    // Calculate padding based on position
    const totalQuestions = mcq.questions.length;
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
    if (nextQuestionIndex < mcq.questions.length) {
      centerQuestion(nextQuestionIndex);
    }
  }
  
  function updateSelection(questionId, optionLabel, isSelected) {
    const question = mcq.questions.find(q => q.id === questionId);
    if (!question) return;
    
    if (question.isMultiSelect) {
      // Checkbox: toggle in array
      if (isSelected) {
        if (!selectedAnswers[questionId].includes(optionLabel)) {
          selectedAnswers[questionId].push(optionLabel);
        }
      } else {
        selectedAnswers[questionId] = selectedAnswers[questionId].filter(l => l !== optionLabel);
      }
      
      // Enable/disable next button for multi-select questions based on selection
      const questionEl = elQuestions.querySelector(`[data-question-id="${questionId}"]`);
      if (questionEl) {
        const nextButton = questionEl.querySelector('.mcq-next-button');
        if (nextButton) {
          const hasSelection = selectedAnswers[questionId].length > 0;
          // Disable if no answer selected
          nextButton.disabled = !hasSelection;
        }
      }
    } else {
      // Radio: replace array with single selection
      selectedAnswers[questionId] = isSelected ? [optionLabel] : [];
      
      // Uncheck other radio buttons in the same group
      const questionEl = elQuestions.querySelector(`[data-question-id="${questionId}"]`);
      if (questionEl) {
        questionEl.querySelectorAll('input[type="radio"]').forEach(radio => {
          if (radio.value !== optionLabel) {
            radio.checked = false;
          }
        });
        
        // Enable/disable next button for explainAnswer questions based on selection
        if (question.explainAnswer) {
          const nextButton = questionEl.querySelector('.mcq-next-button');
          if (nextButton) {
            const hasSelection = selectedAnswers[questionId].length > 0;
            // Disable if no answer selected
            nextButton.disabled = !hasSelection;
          }
        }
      }
    }
    
    updateResultsAndPost();
  }
  
  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }
  
  function addErrorIcon(questionEl) {
    // Check if icon already exists
    if (questionEl.querySelector('.mcq-question-error-icon')) {
      return;
    }
    
    const errorIcon = document.createElement('div');
    errorIcon.className = 'mcq-question-error-icon';
    errorIcon.innerHTML = `
      <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="2" width="2" height="5" rx="1" fill="white"/>
        <circle cx="6" cy="9" r="1" fill="white"/>
      </svg>
    `;
    questionEl.appendChild(errorIcon);
  }
  
  function removeErrorIcon(questionEl) {
    const errorIcon = questionEl.querySelector('.mcq-question-error-icon');
    if (errorIcon) {
      errorIcon.remove();
    }
  }
  
  function clearValidation() {
    if (!isValidating) return;
    
    isValidating = false;
    // Remove validation classes from all questions
    mcq.questions.forEach(q => {
      const questionEl = elQuestions.querySelector(`[data-question-id="${q.id}"]`);
      if (questionEl) {
        questionEl.classList.remove('mcq-question-incorrect');
        removeErrorIcon(questionEl);
      }
    });
  }
  
  function validateAnswers() {
    isValidating = true;
    
    // Check each question and mark incorrect ones
    mcq.questions.forEach(q => {
      const selected = selectedAnswers[q.id] || [];
      const correct = q.options.filter(opt => opt.correct).map(opt => opt.label);
      
      let isCorrect = false;
      if (q.isMultiSelect && q.multiSelectMode === 'any') {
        // For "any" mode: check if at least one selected answer is correct
        // Also ensure no incorrect answers are selected
        const hasCorrectAnswer = selected.some(sel => correct.includes(sel));
        const hasIncorrectAnswer = selected.some(sel => !correct.includes(sel));
        isCorrect = hasCorrectAnswer && !hasIncorrectAnswer && selected.length > 0;
      } else {
        // For "all" mode (default): must match exactly
        isCorrect = arraysEqual(selected.sort(), correct.sort());
      }
      
      const questionEl = elQuestions.querySelector(`[data-question-id="${q.id}"]`);
      if (questionEl) {
        if (!isCorrect) {
          questionEl.classList.add('mcq-question-incorrect');
          addErrorIcon(questionEl);
        } else {
          questionEl.classList.remove('mcq-question-incorrect');
          removeErrorIcon(questionEl);
        }
      }
    });
  }
  
  function updateResultsAndPost() {
    state.results = mcq.questions.map((q, idx) => {
      const selected = selectedAnswers[q.id] || [];
      const correct = q.options.filter(opt => opt.correct).map(opt => opt.label);
      
      let isCorrect = false;
      if (q.isMultiSelect && q.multiSelectMode === 'any') {
        // For "any" mode: check if at least one selected answer is correct
        // Also ensure no incorrect answers are selected
        const hasCorrectAnswer = selected.some(sel => correct.includes(sel));
        const hasIncorrectAnswer = selected.some(sel => !correct.includes(sel));
        isCorrect = hasCorrectAnswer && !hasIncorrectAnswer && selected.length > 0;
      } else {
        // For "all" mode (default): must match exactly
        isCorrect = arraysEqual(selected.sort(), correct.sort());
      }
      
      const result = {
        text: `Question ${idx + 1}`,
        selected: selected.length > 0 ? selected.join(', ') : '',
        correct: correct.join(', '),
        isCorrect: isCorrect,
        multiSelectMode: q.multiSelectMode || 'all'
      };
      
      // Add explanation if enabled and has content
      // Also sync from textarea in case it was updated directly
      if (q.explainAnswer) {
        const explainTextarea = document.getElementById(`explain-${q.id}`);
        if (explainTextarea) {
          explanations[q.id] = explainTextarea.value;
        }
        if (explanations[q.id] && explanations[q.id].trim()) {
          result.explanation = explanations[q.id];
        }
      }
      
      return result;
    });
    
    // Count answered questions
    state.index = Object.values(selectedAnswers).filter(arr => arr.length > 0).length;
    
    postResults();
  }
  
  // Initialize results
  updateResultsAndPost();
  
  // Clear all answers function
  function clearAllAnswers() {
    // Clear all selected answers
    mcq.questions.forEach(q => {
      selectedAnswers[q.id] = [];
    });
    
    // Clear all explanations
    mcq.questions.forEach(q => {
      explanations[q.id] = '';
      // Also clear the textarea if it exists
      const explainTextarea = document.getElementById(`explain-${q.id}`);
      if (explainTextarea) {
        explainTextarea.value = '';
      }
    });
    
    // Uncheck all inputs
    elQuestions.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
      input.checked = false;
    });
    
    // Clear validation state
    clearValidation();
    
    // Update results and post
    updateResultsAndPost();
  }
  
  // Register "Clear All" tool in global toolbar
  toolbar.registerTool('mcq-clear-all', {
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
  
  // Initialize opacity and padding without scrolling on initial load
  // Only update visual state, don't scroll - let page start at top
  setTimeout(() => {
    // Find the question that's currently centered (or first question if at top)
    const centeredIndex = findCenteredQuestionIndex();
    updateQuestionOpacity(centeredIndex);
    updateDynamicPadding(centeredIndex);
  }, 100);
  
  return {
    cleanup: () => {
      toolbar.unregisterTool('mcq-clear-all');
      window.removeEventListener('scroll', handleScroll);
      elContainer.innerHTML = '';
    },
    validate: validateAnswers
  };
}

