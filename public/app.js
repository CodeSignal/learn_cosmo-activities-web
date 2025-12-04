import { initSwipe } from './modules/swipe.js';
import { initSort } from './modules/sort.js';
import { initFib } from './modules/fib.js';
import { initMcq } from './modules/mcq.js';

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
      return { answers: data.answers || null, type: data.type || null };
    } catch (error) {
      console.error('Error loading answers:', error);
      return { answers: null, type: null };
    }
  }

  function validatePersistedAnswers(activity, persistedData) {
    if (!persistedData || !persistedData.answers || !persistedData.type) {
      return null;
    }

    // Check that types match
    const currentType = activity.type || '';
    const persistedType = persistedData.type || '';
    
    if (!/^multiple choice$/i.test(currentType) && !/^fill in the blanks$/i.test(currentType)) {
      // Only validate MCQ and FIB for now
      return null;
    }

    // Type must match exactly
    const typeMatches = 
      (/^multiple choice$/i.test(currentType) && /^multiple choice$/i.test(persistedType)) ||
      (/^fill in the blanks$/i.test(currentType) && /^fill in the blanks$/i.test(persistedType));

    if (!typeMatches) {
      return null;
    }

    // Validate structure matches
    if (/^multiple choice$/i.test(currentType)) {
      // For MCQ: validate that question IDs exist and match
      if (!activity.mcq || !activity.mcq.questions) {
        return null;
      }
      const validQuestionIds = new Set(activity.mcq.questions.map(q => q.id));
      const persistedQuestionIds = Object.keys(persistedData.answers).map(id => parseInt(id, 10));
      
      // All persisted question IDs must exist in current questions
      const allIdsValid = persistedQuestionIds.every(id => validQuestionIds.has(id));
      if (!allIdsValid) {
        return null;
      }
      
      // Return only answers for valid question IDs
      const validatedAnswers = {};
      persistedQuestionIds.forEach(id => {
        if (validQuestionIds.has(id)) {
          validatedAnswers[id] = persistedData.answers[id];
        }
      });
      return validatedAnswers;
    } else if (/^fill in the blanks$/i.test(currentType)) {
      // For FIB: validate that blank indices exist
      if (!activity.fib || !activity.fib.blanks) {
        return null;
      }
      const validBlankIndices = new Set(activity.fib.blanks.map(b => b.index));
      const persistedBlankIndices = Object.keys(persistedData.answers).map(idx => parseInt(idx, 10));
      
      // All persisted blank indices must exist in current blanks
      const allIndicesValid = persistedBlankIndices.every(idx => validBlankIndices.has(idx));
      if (!allIndicesValid) {
        return null;
      }
      
      // Return only answers for valid blank indices
      const validatedAnswers = {};
      persistedBlankIndices.forEach(idx => {
        if (validBlankIndices.has(idx)) {
          validatedAnswers[idx] = persistedData.answers[idx];
        }
      });
      return validatedAnswers;
    }

    return null;
  }

  function initActivity(activity, persistedAnswers = null) {
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

  async function start() {
    try {
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
      const validatedAnswers = validatePersistedAnswers(activity, persistedData);
      initActivity(activity, validatedAnswers);
      bindRestart();
      
      // Connect WebSocket after activity is initialized
      connectWebSocket();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  start();
})();
