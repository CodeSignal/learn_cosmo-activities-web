import { initSwipe } from './modules/swipe.js';
import { initSort } from './modules/sort.js';
import { initFib } from './modules/fib.js';
import { initMcq } from './modules/mcq.js';
import { initMatching } from './modules/matching.js';
import { initTextInput } from './modules/text-input.js';
import { initMatrix } from './modules/matrix.js';
import toolbar from './components/toolbar.js';
import { mountActivityContentShell } from './utils/activity-content-shell.js';

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
  let contentShellCleanup = null;
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
    if (contentShellCleanup) {
      contentShellCleanup();
      contentShellCleanup = null;
    }
    toolbar.clear();
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
    
    if (!/^multiple choice$/i.test(currentType) && !/^fill in the blanks$/i.test(currentType) && !/^matching$/i.test(currentType) && !/^text input$/i.test(currentType) && !/^matrix$/i.test(currentType)) {
      // Only validate persisted answers for types that support them
      return { answers: null, explanations: null };
    }

    // Type must match exactly
    const typeMatches = 
      (/^multiple choice$/i.test(currentType) && /^multiple choice$/i.test(persistedType)) ||
      (/^fill in the blanks$/i.test(currentType) && /^fill in the blanks$/i.test(persistedType)) ||
      (/^matching$/i.test(currentType) && /^matching$/i.test(persistedType)) ||
      (/^text input$/i.test(currentType) && /^text input$/i.test(persistedType)) ||
      (/^matrix$/i.test(currentType) && /^matrix$/i.test(persistedType));

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
    } else if (/^matrix$/i.test(currentType)) {
      if (!activity.matrix || !activity.matrix.rows) {
        return { answers: null, explanations: null };
      }
      const cols = activity.matrix.columns || [];
      const validRowIndices = new Set(activity.matrix.rows.map((_, idx) => idx));
      const persistedRowIndices = Object.keys(persistedData.answers).map(id => parseInt(id, 10));
      const allIndicesValid = persistedRowIndices.every(idx => validRowIndices.has(idx));
      if (!allIndicesValid) {
        return { answers: null, explanations: null };
      }
      const validatedAnswers = {};
      persistedRowIndices.forEach(idx => {
        if (!validRowIndices.has(idx)) return;
        const raw = persistedData.answers[idx];
        const label = Array.isArray(raw) ? raw[0] : raw;
        if (typeof label === 'string' && cols.includes(label)) {
          validatedAnswers[idx] = label;
        }
      });
      const validatedExplanations = {};
      if (persistedData.explanations) {
        Object.keys(persistedData.explanations).forEach(id => {
          const i = parseInt(id, 10);
          if (i >= 0 && i < activity.matrix.rows.length) {
            validatedExplanations[i] = persistedData.explanations[id];
          }
        });
      }
      return { answers: validatedAnswers, explanations: validatedExplanations };
    }

    return { answers: null, explanations: null };
  }

  function initActivity(activity, persistedAnswers = null, persistedExplanations = null) {
    const activityContainer = document.getElementById('activity-container');
    const sideContent = activity.content;
    const hasSideContent = sideContent && (sideContent.url || sideContent.markdown);
    let elContainer = activityContainer;
    if (hasSideContent) {
      const shell = mountActivityContentShell({ container: activityContainer, content: sideContent });
      contentShellCleanup = shell.cleanup;
      elContainer = shell.mainMount;
    } else {
      contentShellCleanup = null;
    }

    if (/^fill in the blanks$/i.test(activity.type)) {
      currentActivity = initFib({ activity, state, postResults, persistedAnswers, elContainer });
    } else if (/^sort into boxes$/i.test(activity.type)) {
      currentActivity = initSort({
        items: state.items,
        labels: activity.labels,
        question: activity.question,
        state,
        postResults,
        elContainer
      });
    } else if (/^multiple choice$/i.test(activity.type)) {
      currentActivity = initMcq({
        activity,
        state,
        postResults,
        persistedAnswers,
        persistedExplanations,
        elContainer
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
        persistedAnswers,
        elContainer
      });
    } else if (/^text input$/i.test(activity.type)) {
      currentActivity = initTextInput({
        activity,
        state,
        postResults,
        persistedAnswers,
        elContainer
      });
      // Store validation function reference
      if (currentActivity && typeof currentActivity.validate === 'function') {
        validationHandler = currentActivity.validate;
      }
    } else if (/^matrix$/i.test(activity.type)) {
      currentActivity = initMatrix({
        activity,
        state,
        postResults,
        persistedAnswers,
        persistedExplanations,
        elContainer
      });
      if (currentActivity && typeof currentActivity.validate === 'function') {
        validationHandler = currentActivity.validate;
      }
    } else {
      currentActivity = initSwipe({
        items: state.items,
        labels: activity.labels || { left: 'Left', right: 'Right' },
        question: activity.question,
        state,
        postResults,
        elContainer
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

    // Track if user has reached the bottom at least once (window vs. shell main pane)
    let hasReachedBottom = false;
    let shellScrollHost = null;
    let shellHasReachedBottom = false;

    const SHELL_SENTINEL_CLASS = 'activity-scroll-bottom-sentinel';
    let shellBottomIO = null;
    let shellIOScrollPane = null;
    let shellObservedSentinel = null;
    let shellBottomInView = false;

    function ensureShellBottomSentinelAndIO() {
      const hasSide = document.querySelector('.activity-with-side-content');
      const scrollPane = document.querySelector('.activity-main-pane-scroll');
      if (!hasSide || !scrollPane) {
        if (shellBottomIO) {
          shellBottomIO.disconnect();
          shellBottomIO = null;
        }
        shellIOScrollPane = null;
        shellObservedSentinel = null;
        shellBottomInView = false;
        return;
      }

      let sentinel = scrollPane.querySelector(`.${SHELL_SENTINEL_CLASS}`);
      if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.className = SHELL_SENTINEL_CLASS;
        sentinel.setAttribute('aria-hidden', 'true');
        sentinel.style.cssText =
          'width:100%;height:1px;margin:0;padding:0;flex-shrink:0;pointer-events:none;visibility:hidden';
      }
      if (sentinel.parentElement !== scrollPane || scrollPane.lastElementChild !== sentinel) {
        scrollPane.appendChild(sentinel);
      }

      const needReconnect =
        !shellBottomIO ||
        shellIOScrollPane !== scrollPane ||
        shellObservedSentinel !== sentinel;

      if (needReconnect) {
        if (shellBottomIO) {
          shellBottomIO.disconnect();
        }
        shellBottomInView = false;
        shellIOScrollPane = scrollPane;
        shellObservedSentinel = sentinel;
        shellBottomIO = new IntersectionObserver(
          (entries) => {
            const e = entries[0];
            shellBottomInView = !!(e && e.isIntersecting);
            checkScrollPosition();
          },
          {
            root: scrollPane,
            threshold: 0,
            // Treat content as “at bottom” when the sentinel is within one row of the visible edge (padding / subpixel).
            rootMargin: '0px 0px 64px 0px'
          }
        );
        shellBottomIO.observe(sentinel);
      }
    }

    function syncScrollIndicatorParent() {
      const hasSideContentLayout = document.querySelector('.activity-with-side-content');
      const mainPane = document.querySelector('.activity-main-pane');
      const mountInPane = !!(hasSideContentLayout && mainPane);

      if (mountInPane) {
        if (scrollIndicator.parentElement !== mainPane) {
          mainPane.appendChild(scrollIndicator);
        }
        scrollIndicator.classList.add('scroll-indicator--in-pane');
      } else {
        scrollIndicator.classList.remove('scroll-indicator--in-pane');
        if (scrollIndicator.parentElement !== document.body) {
          document.body.appendChild(scrollIndicator);
        }
      }
    }

    function syncShellScrollListener() {
      const scrollPane = document.querySelector('.activity-main-pane-scroll');
      if (scrollPane === shellScrollHost) {
        return;
      }
      if (shellScrollHost) {
        shellScrollHost.removeEventListener('scroll', checkScrollPosition);
      }
      shellScrollHost = scrollPane;
      shellHasReachedBottom = false;
      if (shellScrollHost) {
        shellScrollHost.addEventListener('scroll', checkScrollPosition, { passive: true });
      }
    }

    function checkScrollPosition() {
      syncShellScrollListener();
      syncScrollIndicatorParent();
      ensureShellBottomSentinelAndIO();

      const hasSideContentLayout = document.querySelector('.activity-with-side-content');
      const hasMatching = document.querySelector('.matching');

      if (hasMatching) {
        scrollIndicator.classList.remove('visible');
        return;
      }

      // Activity Content Shell: scroll lives in .activity-main-pane-scroll; indicator mounts on .activity-main-pane.
      // Activity init replaces innerHTML and removes any prior nodes — use a bottom sentinel + IntersectionObserver
      // so "at bottom" does not depend on fragile scrollTop vs scrollHeight math.
      if (hasSideContentLayout) {
        const scrollPane = document.querySelector('.activity-main-pane-scroll');
        if (!scrollPane) {
          scrollIndicator.classList.remove('visible');
          return;
        }
        const clientHeight = scrollPane.clientHeight;
        const scrollHeight = scrollPane.scrollHeight;
        const scrollTop = scrollPane.scrollTop;
        const hasScrollableContent = scrollHeight > clientHeight;
        if (!hasScrollableContent) {
          scrollIndicator.classList.remove('visible');
          return;
        }
        if (shellHasReachedBottom) {
          scrollIndicator.classList.remove('visible');
          return;
        }
        const atBottomByScroll = scrollTop + clientHeight >= scrollHeight - 8;
        if (shellBottomInView || atBottomByScroll) {
          shellHasReachedBottom = true;
          scrollIndicator.classList.remove('visible');
          return;
        }
        scrollIndicator.classList.add('visible');
        return;
      }

      if (hasReachedBottom) {
        scrollIndicator.classList.remove('visible');
        return;
      }

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      const isAtBottom = scrollTop + windowHeight >= documentHeight - 10;

      if (isAtBottom) {
        hasReachedBottom = true;
        scrollIndicator.classList.remove('visible');
        return;
      }

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
