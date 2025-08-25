import { initSwipe } from './modules/swipe.js';
import { initSort } from './modules/sort.js';
import { initFib } from './modules/fib.js';

(() => {
  'use strict';

  // Shared DOM references only
  const elType = document.getElementById('activity-type');
  const elQuestion = document.getElementById('practice-question');
  const elProgress = document.getElementById('progress');
  const elCompletion = document.getElementById('completion');
  const elRestart = document.getElementById('restart');

  const state = {
    items: [],
    index: 0,
    results: [],
  };

  let currentActivity = null;
  let currentActivityData = null;
  let ws = null;

  // Theme management
  async function initTheme() {
    try {
      const response = await fetch('/theme', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch theme');
      const { theme } = await response.json();
      
      applyTheme(theme);
    } catch (error) {
      console.error('Error loading theme:', error);
      // Fallback to system preference
      applyTheme('system');
    }
  }
  
  function applyTheme(theme) {
    if (theme === 'system') {
      // Remove any data-theme attribute to use CSS media queries
      document.documentElement.removeAttribute('data-theme');
    } else {
      // Set explicit theme
      document.documentElement.setAttribute('data-theme', theme);
    }
    console.log(`Applied theme: ${theme}`);
  }

  // WebSocket connection for real-time theme updates
  function initWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected for real-time theme updates');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'theme') {
            console.log(`Received theme update: ${data.theme}`);
            applyTheme(data.theme);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        // Attempt to reconnect after 3 seconds
        setTimeout(initWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  function renderHeader(activity) {
    elType.textContent = activity.type || 'Swipe Activity';
    elQuestion.textContent = activity.question || '';
  }

  function updateHud() {
    const total = Array.isArray(state.items) ? state.items.length : 0;
    elProgress.textContent = `${Math.min(state.index, total)} / ${total}`;
  }

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
      
      showCompletion();
    } catch (error) {
      console.error('Error saving results:', error);
      showCompletion(); // Still show completion even if save fails
    }
  }

  function showCompletion() {
    elCompletion.classList.remove('hidden');
  }

  function reset() {
    state.index = 0;
    state.results = [];
    elCompletion.classList.add('hidden');
    if (currentActivity) {
      if (typeof currentActivity === 'function') {
        currentActivity(); // Old cleanup function style
      } else if (currentActivity.cleanup) {
        currentActivity.cleanup(); // New object style
      }
      currentActivity = null;
    }
    updateHud();
  }

  async function loadActivityJson() {
    const url = '/api/activity';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return await res.json();
  }

  function initActivity(activity) {
    if (/^fill in the blanks$/i.test(activity.type)) {
      currentActivity = initFib({ activity, state, updateHud, postResults });
    } else if (/^sort into boxes$/i.test(activity.type)) {
      currentActivity = initSort({ 
        items: state.items, 
        labels: activity.labels, 
        state, 
        updateHud, 
        postResults 
      });
    } else {
      currentActivity = initSwipe({ 
        items: state.items, 
        labels: activity.labels || { left: 'Left', right: 'Right' },
        state, 
        updateHud, 
        postResults 
      });
    }
  }

  async function start() {
    // Initialize theme first
    await initTheme();
    
    // Initialize WebSocket for real-time theme updates
    initWebSocket();
    
    try {
      const activity = await loadActivityJson();
      currentActivityData = activity; // Store activity data for results
      state.items = /^fill in the blanks$/i.test(activity.type)
        ? new Array(activity.fib.blanks.length).fill(null)
        : activity.items;
      renderHeader(activity);
      reset();
      initActivity(activity);
      
      elRestart.addEventListener('click', async () => {
        reset();
        const activity2 = await loadActivityJson();
        currentActivityData = activity2; // Update activity data for results
        state.items = /^fill in the blanks$/i.test(activity2.type)
          ? new Array(activity2.fib.blanks.length).fill(null)
          : activity2.items;
        initActivity(activity2);
      });
    } catch (err) {
      elQuestion.textContent = 'Failed to load activity.';
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  start();
})();
