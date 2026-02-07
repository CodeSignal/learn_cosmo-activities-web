import { initSwipe } from './modules/swipe.js';
import { initSort } from './modules/sort.js';
import { initFib } from './modules/fib.js';
import { initMcq } from './modules/mcq.js';
import { initMatching } from './modules/matching.js';
import { initTextInput } from './modules/text-input.js';
import toolbar from './components/toolbar.js';

(() => {
  'use strict';

  // Shared DOM references only

  const state = {
    items: [],
    index: 0,
    results: [],
  };

  let currentActivity = null;
  let currentActivityData = null;
  let socket = null;
  let validationHandler = null;

  async function postResults() {
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: state.results,
          activity: currentActivityData,
          completedAt: new Date().toISOString()
        })
      });
      if (!response.ok) {
        throw new Error('Failed to save results');
      }
    } catch (error) {
      console.error('Error saving results:', error);
    }
  }

  function reset() {
    state.index = 0;
    state.results = [];
    validationHandler = null;
    // Clear toolbar when resetting
    toolbar.clear();
    if (currentActivity) {
      if (typeof currentActivity === 'function') {
        currentActivity(); // Old cleanup function style
      } else if (currentActivity.cleanup) {
        currentActivity.cleanup(); // New object style
      }
      currentActivity = null;
    }

  }

  async function loadActivityJson() {
    const url = '/api/activity';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return await res.json();
  }

  async function loadAnswers() {
    try {
      const url = '/api/answers';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
      const data = await res.json();
      return { answers: data.answers || null, type: data.type || null, explanations: data.explanations || null };
    } catch (error) {
      console.error('Error loading answers:', error);
      return { answers: null, type: null, explanations: null };
    }
  }

  function validatePersistedAnswers(activity, persistedData) {
    if (!persistedData || !persistedData.answers || !persistedData.type) {
      return { answers: null, explanations: null };
    }

    // Check that types match
    const currentType = activity.type || '';
    const persistedType = persistedData.type || '';
    
    if (!/^multiple choice$/i.test(currentType) && !/^fill in the blanks$/i.test(currentType) && !/^matching$/i.test(currentType) && !/^text input$/i.test(currentType)) {
      // Only validate MCQ, FIB, Matching, and Text Input for now
      return { answers: null, explanations: null };
    }

    // Type must match exactly
    const typeMatches = 
      (/^multiple choice$/i.test(currentType) && /^multiple choice$/i.test(persistedType)) ||
      (/^fill in the blanks$/i.test(currentType) && /^fill in the blanks$/i.test(persistedType)) ||
      (/^matching$/i.test(currentType) && /^matching$/i.test(persistedType)) ||
      (/^text input$/i.test(currentType) && /^text input$/i.test(persistedType));

    if (!typeMatches) {
      return { answers: null, explanations: null };
    }

    // Validate structure matches
    if (/^multiple choice$/i.test(currentType)) {
      // For MCQ: validate that question IDs exist and match
      if (!activity.mcq || !activity.mcq.questions) {
        return { answers: null, explanations: null };
      }
      const validQuestionIds = new Set(activity.mcq.questions.map(q => q.id));
      const persistedQuestionIds = Object.keys(persistedData.answers).map(id => parseInt(id, 10));
      
      // All persisted question IDs must exist in current questions
      const allIdsValid = persistedQuestionIds.every(id => validQuestionIds.has(id));
      if (!allIdsValid) {
        return { answers: null, explanations: null };
      }
      
      // Return only answers for valid question IDs
      const validatedAnswers = {};
      persistedQuestionIds.forEach(id => {
        if (validQuestionIds.has(id)) {
          validatedAnswers[id] = persistedData.answers[id];
        }
      });
      
      // Also validate and return explanations if present
      const validatedExplanations = {};
      if (persistedData.explanations) {
        Object.keys(persistedData.explanations).forEach(id => {
          const questionId = parseInt(id, 10);
          if (validQuestionIds.has(questionId)) {
            validatedExplanations[questionId] = persistedData.explanations[id];
          }
        });
      }
      
      return { answers: validatedAnswers, explanations: validatedExplanations };
    } else if (/^fill in the blanks$/i.test(currentType)) {
      // For FIB: validate that blank indices exist
      if (!activity.fib || !activity.fib.blanks) {
        return { answers: null, explanations: null };
      }
      const validBlankIndices = new Set(activity.fib.blanks.map(b => b.index));
      const persistedBlankIndices = Object.keys(persistedData.answers).map(idx => parseInt(idx, 10));
      
      // All persisted blank indices must exist in current blanks
      const allIndicesValid = persistedBlankIndices.every(idx => validBlankIndices.has(idx));
      if (!allIndicesValid) {
        return { answers: null, explanations: null };
      }
      
      // Return only answers for valid blank indices
      const validatedAnswers = {};
      persistedBlankIndices.forEach(idx => {
        if (validBlankIndices.has(idx)) {
          validatedAnswers[idx] = persistedData.answers[idx];
        }
      });
      return { answers: validatedAnswers, explanations: null };
    } else if (/^matching$/i.test(currentType)) {
      // For Matching: validate that item indices exist
      if (!activity.matching || !activity.matching.items) {
        return { answers: null, explanations: null };
      }
      const validItemIndices = new Set(activity.matching.items.map((item, idx) => idx));
      const persistedItemIndices = Object.keys(persistedData.answers).map(idx => parseInt(idx, 10));
      
      // All persisted item indices must exist in current items
      const allIndicesValid = persistedItemIndices.every(idx => validItemIndices.has(idx));
      if (!allIndicesValid) {
        return { answers: null, explanations: null };
      }
      
      // Return only answers for valid item indices
      const validatedAnswers = {};
      persistedItemIndices.forEach(idx => {
        if (validItemIndices.has(idx)) {
          validatedAnswers[idx] = persistedData.answers[idx];
        }
      });
      return { answers: validatedAnswers, explanations: null };
    } else if (/^text input$/i.test(currentType)) {
      // For Text Input: validate that question IDs exist
      if (!activity.textInput || !activity.textInput.questions) {
        return { answers: null, explanations: null };
      }
      const validQuestionIds = new Set(activity.textInput.questions.map(q => q.id));
      const persistedQuestionIds = Object.keys(persistedData.answers).map(id => parseInt(id, 10));
      
      // All persisted question IDs must exist in current questions
      const allIdsValid = persistedQuestionIds.every(id => validQuestionIds.has(id));
      if (!allIdsValid) {
        return { answers: null, explanations: null };
      }
      
      // Return only answers for valid question IDs
      const validatedAnswers = {};
      persistedQuestionIds.forEach(id => {
        if (validQuestionIds.has(id)) {
          validatedAnswers[id] = persistedData.answers[id];
        }
      });
      return { answers: validatedAnswers, explanations: null };
    }

    return { answers: null, explanations: null };
  }

  function initActivity(activity, persistedAnswers = null, persistedExplanations = null) {
    if (/^fill in the blanks$/i.test(activity.type)) {
      currentActivity = initFib({ activity, state, postResults, persistedAnswers });
    } else if (/^sort into boxes$/i.test(activity.type)) {
      currentActivity = initSort({ 
        items: state.items, 
        labels: activity.labels,
        question: activity.question,
        state, 
        postResults 
      });
    } else if (/^multiple choice$/i.test(activity.type)) {
      currentActivity = initMcq({ 
        activity, 
        state, 
        postResults,
        persistedAnswers,
        persistedExplanations
      });
      // Store validation function reference
      if (currentActivity && typeof currentActivity.validate === 'function') {
        validationHandler = currentActivity.validate;
      }
    } else if (/^matching$/i.test(activity.type)) {
      currentActivity = initMatching({ 
        activity, 
        state, 
        postResults,
        persistedAnswers
      });
    } else if (/^text input$/i.test(activity.type)) {
      currentActivity = initTextInput({ 
        activity, 
        state, 
        postResults,
        persistedAnswers
      });
      // Store validation function reference
      if (currentActivity && typeof currentActivity.validate === 'function') {
        validationHandler = currentActivity.validate;
      }
    } else {
      currentActivity = initSwipe({ 
        items: state.items, 
        labels: activity.labels || { left: 'Left', right: 'Right' },
        question: activity.question,
        state, 
        postResults 
      });
    }
  }

  function bindRestart() {
    const elRestart = document.getElementById('restart');
    if (!elRestart) return;
    // Skip binding for FIB activities - they handle "Clear All" themselves
    if (currentActivityData && /^fill in the blanks$/i.test(currentActivityData.type)) {
      return;
    }
    elRestart.addEventListener('click', async (e) => {
      e.preventDefault();
      reset();
      const activity2 = await loadActivityJson();
      currentActivityData = activity2; // Update activity data for results
      state.items = /^fill in the blanks$/i.test(activity2.type)
        ? new Array(activity2.fib.blanks.length).fill(null)
        : activity2.items;
      // Don't load persisted answers on restart - start fresh
      initActivity(activity2, null);
      bindRestart(); // re-bind for the newly rendered DOM
    });
  }

  // Initialize WebSocket connection
  function connectWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}`);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'validate') {
            if (validationHandler) {
              validationHandler();
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        // Try to reconnect after a few seconds
        setTimeout(connectWebSocket, 5000);
        socket = null;
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
      // Try to reconnect after a few seconds
      setTimeout(connectWebSocket, 5000);
    }
  }

  function initScrollIndicator() {
    // Create scroll indicator element
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.innerHTML = `
      <div class="scroll-indicator-gradient"></div>
      <div class="scroll-indicator-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    `;
    document.body.appendChild(scrollIndicator);

    // Track if user has reached the bottom at least once
    let hasReachedBottom = false;

    function checkScrollPosition() {
      // Don't show indicator for activities that handle their own scrolling
      const hasTextInputWithContent = document.querySelector('.text-input-with-content');
      const hasMatching = document.querySelector('.matching');
      
      if (hasTextInputWithContent || hasMatching) {
        scrollIndicator.classList.remove('visible');
        return;
      }

      // If user has already reached bottom, don't show indicator again
      if (hasReachedBottom) {
        scrollIndicator.classList.remove('visible');
        return;
      }

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      
      // Check if there's more content below (with a small threshold to account for rounding)
      const isAtBottom = scrollTop + windowHeight >= documentHeight - 10;
      
      // Mark that user has reached bottom
      if (isAtBottom) {
        hasReachedBottom = true;
        scrollIndicator.classList.remove('visible');
        return;
      }
      
      // Only show if there's scrollable content and we're not at the bottom
      const hasScrollableContent = documentHeight > windowHeight;
      
      if (hasScrollableContent && !isAtBottom) {
        scrollIndicator.classList.add('visible');
      } else {
        scrollIndicator.classList.remove('visible');
      }
    }

    // Check on scroll, resize, and initial load
    window.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition, { passive: true });
    
    // Initial check after a short delay to ensure DOM is ready
    setTimeout(checkScrollPosition, 100);
    
    // Also check when activity changes (for dynamic content)
    const observer = new MutationObserver(() => {
      setTimeout(checkScrollPosition, 100);
    });
    
    const activityContainer = document.getElementById('activity-container');
    if (activityContainer) {
      observer.observe(activityContainer, { childList: true, subtree: true });
    }
  }

  // Prevent browser scroll restoration on reload
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Ensure page starts at top on load
  window.addEventListener('load', () => {
    window.scrollTo(0, 0);
  });

  async function start() {
    try {
      // Ensure we're at the top before loading activity
      window.scrollTo(0, 0);
      
      const [activity, persistedData] = await Promise.all([
        loadActivityJson(),
        loadAnswers()
      ]);
      currentActivityData = activity; // Store activity data for results
      state.items = /^fill in the blanks$/i.test(activity.type)
        ? new Array(activity.fib.blanks.length).fill(null)
        : activity.items;
      reset();
      
      // Validate persisted answers match current activity
      const validated = validatePersistedAnswers(activity, persistedData);
      // For backward compatibility, handle both old format (just answers) and new format ({ answers, explanations })
      const persistedAnswers = validated && validated.answers ? validated.answers : validated;
      const persistedExplanations = validated && validated.explanations ? validated.explanations : null;
      initActivity(activity, persistedAnswers, persistedExplanations);
      bindRestart();
      
      // Initialize scroll indicator
      initScrollIndicator();
      
      // Ensure we're still at top after activity loads
      window.scrollTo(0, 0);
      
      // Connect WebSocket after activity is initialized
      connectWebSocket();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  start();
})();
