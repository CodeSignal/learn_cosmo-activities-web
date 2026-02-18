import toolbar from '../components/toolbar.js';
import SplitPanel from '../design-system/components/split-panel/split-panel.js';
import { renderMath } from '../utils/katex-render.js';

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
    
    // Parse contentWidth for initial split (e.g. "20%", "280px")
    const contentWidthRaw = textInput.content?.contentWidth;
    let initialSplitPercent = 40;
    let contentWidthPx = null;
    if (contentWidthRaw) {
      const match = String(contentWidthRaw).trim().match(/^(\d+(?:\.\d+)?)\s*(%|px)?$/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = (match[2] || '%').toLowerCase();
        if (unit === '%') {
          initialSplitPercent = Math.max(20, Math.min(80, value));
        } else if (unit === 'px') {
          contentWidthPx = value;
        }
      }
    }

    // Initialize split panel
    const splitPanelContainer = document.getElementById('text-input-split-panel');
    splitPanel = new SplitPanel(splitPanelContainer, {
      initialSplit: initialSplitPercent,
      minLeft: 20,
      minRight: 30,
    });

    // If contentWidth was in pixels, set split after layout
    if (contentWidthPx != null) {
      const applyPxSplit = () => {
        const rect = splitPanelContainer.getBoundingClientRect();
        if (rect.width > 0) {
          const percent = Math.max(20, Math.min(80, (contentWidthPx / rect.width) * 100));
          splitPanel.setSplit(percent, true);
        }
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(applyPxSplit);
      });
    }
    
    // Get panel references
    const leftPanel = splitPanel.getLeftPanel();
    const rightPanel = splitPanel.getRightPanel();
    
    // Prevent scrolling on split panel container itself
    // This prevents scrollIntoView from scrolling the container
    // The panels themselves will handle their own scrolling via their content wrappers
    const splitPanelContainerEl = splitPanel.container;
    if (splitPanelContainerEl) {
      splitPanelContainerEl.style.overflow = 'hidden';
      // Also prevent any scroll events on the container
      splitPanelContainerEl.addEventListener('scroll', (e) => {
        e.preventDefault();
        e.stopPropagation();
        splitPanelContainerEl.scrollTop = 0;
        splitPanelContainerEl.scrollLeft = 0;
      }, { passive: false, capture: true });
    }
    
    // Set up left panel (content)
    // Note: leftPanel will get className 'text-input-content-wrapper' which has overflow: auto
    // This allows the iframe content to scroll, but prevents split-panel-left from being scrollable
    leftPanel.className = 'text-input-content-wrapper';
    leftPanel.innerHTML = '<iframe id="text-input-content-iframe" class="text-input-content-iframe" frameborder="1"></iframe>';
    
    // Set up right panel (questions)
    rightPanel.className = 'text-input-questions-wrapper';
    rightPanel.innerHTML = `
      <div id="text-input-questions" class="text-input-questions"></div>
    `;
    
    // Prevent horizontal scrolling on the questions wrapper
    const questionsWrapperEl = document.getElementById('text-input-questions-wrapper');
    if (questionsWrapperEl) {
      // Prevent horizontal scrolling aggressively
      const preventHorizontalScroll = () => {
        if (questionsWrapperEl.scrollLeft !== 0) {
          questionsWrapperEl.scrollLeft = 0;
        }
      };
      
      // Listen to scroll events and reset horizontal scroll immediately
      questionsWrapperEl.addEventListener('scroll', preventHorizontalScroll, { passive: false, capture: true });
      
      // Also reset on any scroll event (non-capture as backup)
      questionsWrapperEl.addEventListener('scroll', preventHorizontalScroll, { passive: true });
      
      // Set initial scrollLeft to 0
      questionsWrapperEl.scrollLeft = 0;
    }
  } else {
    elContainer.innerHTML = `
      <div id="text-input" class="text-input">
        <div id="text-input-questions" class="text-input-questions"></div>
      </div>
    `;
  }
  
  const elTextInput = document.getElementById('text-input');
  const elQuestions = document.getElementById('text-input-questions');
  
  // Prevent document-level scrolling when in split panel mode
  // This prevents the container from being pushed up when tabbing
  // The key is to make body/html fixed and exactly 100vh so there's nothing to scroll
  let scrollPreventionCleanup = null;
  if (hasContent) {
    // Store original styles
    const originalBodyStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      height: document.body.style.height,
      width: document.body.style.width,
      top: document.body.style.top,
      left: document.body.style.left
    };
    const originalHtmlStyle = {
      overflow: document.documentElement.style.overflow,
      height: document.documentElement.style.height
    };
    const mainEl = elContainer.closest('.main');
    const originalMainOverflow = mainEl?.style.overflow || '';
    const originalActivityOverflow = elContainer.style.overflow || '';
    
    // Make body/html fixed and exactly 100vh - this prevents ANY document scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.height = '100vh';
    document.body.style.width = '100%';
    document.body.style.top = '0';
    document.body.style.left = '0';
    
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100vh';
    
    if (mainEl) {
      mainEl.style.overflow = 'hidden';
    }
    elContainer.style.overflow = 'hidden';
    
    // Store cleanup function
    scrollPreventionCleanup = () => {
      // Restore original styles
      document.body.style.overflow = originalBodyStyle.overflow;
      document.body.style.position = originalBodyStyle.position;
      document.body.style.height = originalBodyStyle.height;
      document.body.style.width = originalBodyStyle.width;
      document.body.style.top = originalBodyStyle.top;
      document.body.style.left = originalBodyStyle.left;
      
      document.documentElement.style.overflow = originalHtmlStyle.overflow;
      document.documentElement.style.height = originalHtmlStyle.height;
      
      if (mainEl) {
        mainEl.style.overflow = originalMainOverflow;
      }
      elContainer.style.overflow = originalActivityOverflow;
    };
  }
  
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
    
    // Skip validation for "validate-later" type
    if (validation.kind === 'validate-later') {
      return null;
    }
    
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
  
  // Optional heading section (instructions for the questions)
  const hasHeading = textInput.heading && (textInput.heading.html || textInput.heading.markdown);
  if (hasHeading) {
    const headingEl = document.createElement('div');
    headingEl.className = 'text-input-heading box non-interactive input-group text-input-question-text body-xlarge';
    if (textInput.heading.html) {
      headingEl.innerHTML = textInput.heading.html;
    } else {
      headingEl.textContent = textInput.heading.markdown;
    }
    renderMath(headingEl);
    elQuestions.appendChild(headingEl);
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
    
    // Question text (support markdown HTML if available, fallback to plain text)
    const questionTextEl = document.createElement('div');
    questionTextEl.className = 'text-input-question-text body-xlarge';
    if (question.textHtml) {
      questionTextEl.innerHTML = question.textHtml;
      // Render LaTeX math expressions
      renderMath(questionTextEl);
    } else if (question.text) {
      // Even if textHtml is not available, set as HTML to allow LaTeX rendering
      // The text might contain LaTeX that needs to be rendered
      questionTextEl.innerHTML = question.text;
      // Render LaTeX math expressions
      renderMath(questionTextEl);
    }
    questionEl.appendChild(questionTextEl);
    
    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'text-input-container';
    
    // Check if this is a currency input
    const isCurrency = question.validation && question.validation.kind === 'numeric-with-currency';
    const currencySymbol = isCurrency ? (question.validation.options?.currency || '$') : null;
    
    // Check if this is a units input
    const isUnits = question.validation && question.validation.kind === 'numeric-with-units';
    const unitsArray = isUnits ? (question.validation.options?.units || []) : [];
    const unitSymbol = isUnits && unitsArray.length > 0 ? unitsArray[0] : null;
    
    // Check if this is a numeric input (numeric, numeric-with-units, or numeric-with-currency)
    const isNumeric = question.validation && (
      question.validation.kind === 'numeric' ||
      question.validation.kind === 'numeric-with-units' ||
      question.validation.kind === 'numeric-with-currency'
    );
    
    // Check if this is a multi-line input
    const isMultiLine = question.validation && question.validation.kind === 'string' && 
                        question.validation.options?.multiLine === true;
    
    // Create input wrapper for currency/units overlay (only for single-line inputs)
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'text-input-field-wrapper';
    if (isCurrency && !isMultiLine) {
      inputWrapper.classList.add('text-input-field-wrapper-currency');
      inputWrapper.setAttribute('data-currency', currencySymbol);
    }
    if (isUnits && !isMultiLine && unitSymbol) {
      inputWrapper.classList.add('text-input-field-wrapper-units');
      inputWrapper.setAttribute('data-units', unitSymbol);
    }
    
    // Create input field (textarea for multi-line, input for single-line)
    const input = isMultiLine ? document.createElement('textarea') : document.createElement('input');
    if (!isMultiLine) {
      input.type = isNumeric ? 'number' : 'text';
    } else {
      // Set textarea-specific attributes
      input.rows = 4;
      input.style.resize = 'vertical';
      input.style.minHeight = 'var(--UI-Input-md)';
      input.style.height = 'auto';
    }
    input.className = 'input text-input-field';
    input.id = `q${question.id}-input`;
    input.value = userAnswers[question.id] || '';
    input.setAttribute('aria-label', `Answer for question ${qIdx + 1}`);
    input.placeholder = 'Enter your answer...';
    
    // Handle scrolling within the wrapper when in split panel mode
    // Document scrolling is prevented by making body fixed, so we only need to handle wrapper scrolling
    if (hasContent) {
      const questionsWrapper = document.getElementById('text-input-questions-wrapper');
      
      // Helper function to scroll input into view within the wrapper
      const scrollInputIntoView = (inputElement, behavior = 'smooth') => {
        if (!questionsWrapper) return;
        
        // Get bounding rects
        const inputRect = inputElement.getBoundingClientRect();
        const wrapperRect = questionsWrapper.getBoundingClientRect();
        
        // Check if this is the last question
        const isLastQuestion = qIdx === textInput.questions.length - 1;
        
        // Calculate scroll padding (2rem = 32px)
        const scrollPadding = 2 * 16;
        
        // Get maximum scroll position
        const maxScrollTop = questionsWrapper.scrollHeight - questionsWrapper.clientHeight;
        
        // Use getBoundingClientRect calculation - more reliable than offsetTop
        const distanceFromWrapperTop = inputRect.top - wrapperRect.top;
        const currentScrollTop = questionsWrapper.scrollTop;
        const inputPositionInScrollContent = currentScrollTop + distanceFromWrapperTop;
        
        let targetScrollTop;
        
        // For the last question, always ensure it's visible
        if (isLastQuestion) {
          // For the last question, scroll to show it fully
          const wrapperHeight = questionsWrapper.clientHeight;
          const inputHeight = inputRect.height;
          const inputBottomInContent = inputPositionInScrollContent + inputHeight;
          
          // Check if input extends beyond visible area
          const inputTopVisible = inputRect.top >= wrapperRect.top;
          const inputBottomVisible = inputRect.bottom <= wrapperRect.bottom;
          
          if (!inputTopVisible) {
            // Input top is above visible area - scroll to show top with padding
            targetScrollTop = inputPositionInScrollContent - scrollPadding;
          } else if (!inputBottomVisible) {
            // Input bottom is below visible area - scroll to show bottom
            targetScrollTop = inputBottomInContent - wrapperHeight + scrollPadding;
          } else {
            // Input is visible, but for last question ensure it's positioned well
            // Scroll to show input with padding at top
            targetScrollTop = inputPositionInScrollContent - scrollPadding;
          }
          
          // For last question, ensure we can scroll to maximum if needed
          targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
        } else {
          // Normal case - check if visible first
          const margin = 50;
          const isVisible = inputRect.top >= (wrapperRect.top - margin) && 
                           inputRect.bottom <= (wrapperRect.bottom + margin);
          
          if (!isVisible) {
            // Scroll to show input with padding
            targetScrollTop = inputPositionInScrollContent - scrollPadding;
            targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
          } else {
            // Already visible, no need to scroll
            return;
          }
        }
        
        // Ensure no horizontal scroll before scrolling
        questionsWrapper.scrollLeft = 0;
        
        // Perform the scroll
        questionsWrapper.scrollTo({
          top: targetScrollTop,
          behavior: behavior,
          left: 0  // Ensure no horizontal scroll
        });
        
        // Ensure no horizontal scroll after scrolling (in case scrollTo doesn't work)
        requestAnimationFrame(() => {
          questionsWrapper.scrollLeft = 0;
        });
      };
      
      // Check if this is the last question
      const isLastQuestion = qIdx === textInput.questions.length - 1;
      
      // Override scrollIntoView to scroll within the wrapper instead of document
      const originalScrollIntoView = input.scrollIntoView.bind(input);
      input.scrollIntoView = function(options) {
        if (questionsWrapper) {
          // Prevent default browser scrolling and horizontal scroll
          questionsWrapper.scrollLeft = 0;
          scrollInputIntoView(this, options?.behavior || 'smooth');
          // Don't call original - document is fixed so it can't scroll anyway
          return;
        }
        originalScrollIntoView(options);
      };
      
      // Add focus handler to handle wrapper scrolling
      input.addEventListener('focus', (e) => {
        // For the last question, always scroll to ensure it's visible
        // Use multiple delays to ensure layout is complete
        const scrollToInput = () => {
          if (questionsWrapper) {
            scrollInputIntoView(e.target, 'auto');
          }
        };
        
        // Immediate attempt
        scrollToInput();
        
        // Use requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
          scrollToInput();
        });
        
        // Also try after a short delay in case the first attempts don't work
        setTimeout(() => {
          scrollToInput();
        }, 50);
        
        // For last question, try multiple times to ensure it works
        if (isLastQuestion) {
          setTimeout(() => {
            scrollToInput();
          }, 100);
          setTimeout(() => {
            scrollToInput();
          }, 200);
        }
      }, { passive: true });
    }
    
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
      // Skip validation for "validate-later" type
      if (q.validation && q.validation.kind === 'validate-later') {
        return;
      }
      
      const isCorrect = validateAnswer(q);
      
      const questionEl = elQuestions.querySelector(`[data-question-id="${q.id}"]`);
      if (questionEl) {
        if (isCorrect === false) {
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
    // Include all questions in results, including "validate-later"
    state.results = textInput.questions.map((q, idx) => {
      const userAnswer = userAnswers[q.id] || '';
      const isValidateLater = q.validation && q.validation.kind === 'validate-later';
      const isCorrect = isValidateLater ? null : validateAnswer(q);
      
      return {
        text: `Question ${idx + 1}`,
        selected: userAnswer,
        correct: q.correctAnswer,
        validateLater: isValidateLater
      };
    });
    
    // Count answered questions (excluding "validate-later" questions)
    state.index = Object.entries(userAnswers).filter(([questionId, answer]) => {
      const question = textInput.questions.find(q => q.id === parseInt(questionId, 10));
      return answer && answer.trim().length > 0 && 
             !(question && question.validation && question.validation.kind === 'validate-later');
    }).length;
    
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

  // Register "Open in new tab" tool when URL-based content opts in via [openInNewTab]
  const contentUrl = textInput.content?.url;
  const showOpenInNewTab = textInput.content?.openInNewTab === true;
  if (hasContent && contentUrl && showOpenInNewTab) {
    toolbar.registerTool('text-input-open-url', {
      icon: 'icon-globe-bold',
      title: 'Open content in new tab',
      onClick: (e) => {
        e.preventDefault();
        window.open(contentUrl, '_blank', 'noopener,noreferrer');
      },
      enabled: true
    });
  }
  
  // Add static top padding to position first question near the top
  elQuestions.style.paddingTop = '2rem';
  
  return {
    cleanup: () => {
      if (hasContent && contentUrl && showOpenInNewTab) {
        toolbar.unregisterTool('text-input-open-url');
      }
      toolbar.unregisterTool('text-input-clear-all');
      if (splitPanel) {
        splitPanel.destroy();
        splitPanel = null;
      }
      if (hasContent) {
        // Restore document scrolling
        if (scrollPreventionCleanup) {
          scrollPreventionCleanup();
        }
      }
      elContainer.innerHTML = '';
    },
    validate: validateAnswers
  };
}

