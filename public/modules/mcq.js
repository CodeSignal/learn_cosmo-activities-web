export function initMcq({ activity, state, postResults }) {
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
  
  // Track validation state
  let isValidating = false;
  
  // Initialize selected answers
  mcq.questions.forEach(q => {
    selectedAnswers[q.id] = [];
  });
  
  // Render all questions
  mcq.questions.forEach((question, qIdx) => {
    const questionEl = document.createElement('div');
    questionEl.className = 'mcq-question';
    questionEl.setAttribute('data-question-id', question.id);
    questionEl.setAttribute('data-question-index', qIdx.toString());
    
    // Question legend (Question 1, Question 2, etc.)
    const legend = document.createElement('div');
    legend.className = 'mcq-legend heading-small';
    legend.textContent = `Question ${qIdx + 1}`;
    questionEl.appendChild(legend);
    
    // Question text
    const questionTextEl = document.createElement('div');
    questionTextEl.className = 'mcq-question-text body-xxlarge';
    questionTextEl.textContent = question.text;
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
      optionText.textContent = option.text;
      
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
        if (!question.isMultiSelect && input.checked) {
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
    
    // Add "Next" button for multi-select questions (not on last question)
    if (question.isMultiSelect && qIdx < mcq.questions.length - 1) {
      const nextButtonContainer = document.createElement('div');
      nextButtonContainer.className = 'mcq-next-button-container';
      
      const nextButton = document.createElement('button');
      nextButton.className = 'button button-primary mcq-next-button';
      nextButton.textContent = 'Next';
      nextButton.type = 'button';
      // Always visible, but disabled if no answer selected
      nextButton.disabled = true; // Initially disabled until answer is selected
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
  
  function clearValidation() {
    if (!isValidating) return;
    
    isValidating = false;
    // Remove validation classes from all questions
    mcq.questions.forEach(q => {
      const questionEl = elQuestions.querySelector(`[data-question-id="${q.id}"]`);
      if (questionEl) {
        questionEl.classList.remove('mcq-question-incorrect');
      }
    });
  }
  
  function validateAnswers() {
    isValidating = true;
    
    // Check each question and mark incorrect ones
    mcq.questions.forEach(q => {
      const selected = selectedAnswers[q.id] || [];
      const correct = q.options.filter(opt => opt.correct).map(opt => opt.label);
      const isCorrect = arraysEqual(selected.sort(), correct.sort());
      
      const questionEl = elQuestions.querySelector(`[data-question-id="${q.id}"]`);
      if (questionEl) {
        if (!isCorrect) {
          questionEl.classList.add('mcq-question-incorrect');
        } else {
          questionEl.classList.remove('mcq-question-incorrect');
        }
      }
    });
  }
  
  function updateResultsAndPost() {
    state.results = mcq.questions.map((q, idx) => {
      const selected = selectedAnswers[q.id] || [];
      const correct = q.options.filter(opt => opt.correct).map(opt => opt.label);
      const isCorrect = arraysEqual(selected.sort(), correct.sort());
      
      return {
        text: `Question ${idx + 1}`,
        selected: selected.length > 0 ? selected.join(', ') : '',
        correct: correct.join(', ')
      };
    });
    
    // Count answered questions
    state.index = Object.values(selectedAnswers).filter(arr => arr.length > 0).length;
    
    postResults();
  }
  
  // Initialize results
  updateResultsAndPost();
  
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
  
  // Center the first question (or first selected question) on initial load
  setTimeout(() => {
    // Check if there's a pre-selected question from state
    let questionToCenter = -1;
    for (let i = 0; i < mcq.questions.length; i++) {
      const q = mcq.questions[i];
      if (!q.isMultiSelect && selectedAnswers[q.id] && selectedAnswers[q.id].length > 0) {
        questionToCenter = i;
        break;
      }
    }
    // If no selected question, center the first one
    if (questionToCenter === -1) {
      questionToCenter = 0;
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
      window.removeEventListener('scroll', handleScroll);
      elContainer.innerHTML = '';
    },
    validate: validateAnswers
  };
}

