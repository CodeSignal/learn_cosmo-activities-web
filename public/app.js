import { initSwipe } from './modules/swipe.js';
import { initSort } from './modules/sort.js';
import { initFib } from './modules/fib.js';

(() => {
  'use strict';

  // Shared DOM references only
  const elRestart = document.getElementById('restart');

  const state = {
    items: [],
    index: 0,
    results: [],
  };

  let currentActivity = null;
  let currentActivityData = null;

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

  function initActivity(activity) {
    if (/^fill in the blanks$/i.test(activity.type)) {
      currentActivity = initFib({ activity, state, postResults });
    } else if (/^sort into boxes$/i.test(activity.type)) {
      currentActivity = initSort({ 
        items: state.items, 
        labels: activity.labels, 
        state, 
        postResults 
      });
    } else {
      currentActivity = initSwipe({ 
        items: state.items, 
        labels: activity.labels || { left: 'Left', right: 'Right' },
        state, 
        postResults 
      });
    }
  }

  async function start() {
    try {
      const activity = await loadActivityJson();
      currentActivityData = activity; // Store activity data for results
      state.items = /^fill in the blanks$/i.test(activity.type)
        ? new Array(activity.fib.blanks.length).fill(null)
        : activity.items;
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
