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
  
  // Initialize selected answers
  mcq.questions.forEach(q => {
    selectedAnswers[q.id] = [];
  });
  
  // Render all questions
  mcq.questions.forEach((question, qIdx) => {
    const questionEl = document.createElement('div');
    questionEl.className = 'mcq-question';
    questionEl.setAttribute('data-question-id', question.id);
    
    // Question legend (Question 1, Question 2, etc.)
    const legend = document.createElement('div');
    legend.className = 'mcq-legend';
    legend.textContent = `Question ${qIdx + 1}`;
    questionEl.appendChild(legend);
    
    // Question text
    const questionTextEl = document.createElement('div');
    questionTextEl.className = 'mcq-question-text';
    questionTextEl.textContent = question.text;
    questionEl.appendChild(questionTextEl);
    
    // Options container
    const optionsEl = document.createElement('fieldset');
    optionsEl.className = 'mcq-options';
    
    // Create options
    question.options.forEach((option, optIdx) => {
      const optionEl = document.createElement('label');
      optionEl.className = 'mcq-option';
      
      const input = document.createElement('input');
      input.type = question.isMultiSelect ? 'checkbox' : 'radio';
      input.name = `question-${question.id}`;
      input.value = option.label;
      input.id = `q${question.id}-opt${optIdx}`;
      input.setAttribute('aria-label', `Option ${option.label}: ${option.text}`);
      
      const optionText = document.createElement('span');
      optionText.className = 'mcq-option-text';
      optionText.textContent = option.text;
      
      const optionLabel = document.createElement('span');
      optionLabel.className = 'mcq-option-label';
      optionLabel.textContent = option.label + '.';
      
      // Create option card structure matching Figma design
      const optionCard = document.createElement('div');
      optionCard.className = 'mcq-option-card';
      
      // Radio/checkbox wrapper (visual only, input is outside for CSS sibling selector)
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'mcq-input-wrapper';
      
      // Text wrapper
      const textWrapper = document.createElement('div');
      textWrapper.className = 'mcq-option-content';
      textWrapper.appendChild(optionText);
      
      optionCard.appendChild(inputWrapper);
      optionCard.appendChild(textWrapper);
      
      // Append input first (hidden, for form behavior), then card (for CSS sibling selector)
      optionEl.appendChild(input);
      optionEl.appendChild(optionCard);
      optionsEl.appendChild(optionEl);
      
      // Add change listener
      input.addEventListener('change', () => {
        updateSelection(question.id, option.label, input.checked);
      });
    });
    
    questionEl.appendChild(optionsEl);
    elQuestions.appendChild(questionEl);
  });
  
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
  
  return () => {
    elContainer.innerHTML = '';
  };
}

