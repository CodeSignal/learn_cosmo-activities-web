import { initSwipe } from './modules/swipe.js';
import { initSort } from './modules/sort.js';
import { initFib } from './modules/fib.js';

(() => {
  'use strict';

  // Shared DOM references only
  const elType = document.getElementById('activity-type');
  const elQuestion = document.getElementById('practice-question');
  const elProgress = document.getElementById('progress');
  const elScore = document.getElementById('score');
  const elSummary = document.getElementById('summary');
  const elSummaryStats = document.getElementById('summary-stats');
  const elMistakes = document.getElementById('mistakes');
  const elRestart = document.getElementById('restart');

  const state = {
    items: [],
    index: 0,
    correctCount: 0,
    mistakes: [],
  };

  let currentActivity = null;

  function renderHeader(activity) {
    elType.textContent = activity.type || 'Swipe Activity';
    elQuestion.textContent = activity.question || '';
  }

  function updateHud() {
    const total = Array.isArray(state.items) ? state.items.length : 0;
    elProgress.textContent = `${Math.min(state.index, total)} / ${total}`;
    elScore.textContent = `Score: ${state.correctCount}`;
  }

  function showSummary() {
    elSummaryStats.textContent = `You got ${state.correctCount} / ${state.items.length} correct.`;
    elMistakes.innerHTML = '';
    for (const m of state.mistakes) {
      const li = document.createElement('li');
      let correctText = m.correct;
      // For swipe activities, try to get the actual label text
      if (currentActivity && currentActivity.getLabels && (m.correct === 'left' || m.correct === 'right')) {
        const labels = currentActivity.getLabels();
        correctText = m.correct === 'left' ? labels.left : labels.right;
      }
      li.textContent = `${m.text} — Correct: ${correctText}`;
      elMistakes.appendChild(li);
    }
    elSummary.classList.remove('hidden');
  }

  function reset() {
    state.index = 0;
    state.correctCount = 0;
    state.mistakes = [];
    elSummary.classList.add('hidden');
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
      currentActivity = initFib({ activity, state, updateHud });
    } else if (/^sort into boxes$/i.test(activity.type)) {
      currentActivity = initSort({ 
        items: state.items, 
        labels: activity.labels, 
        state, 
        updateHud, 
        showSummary 
      });
    } else {
      currentActivity = initSwipe({ 
        items: state.items, 
        labels: activity.labels || { left: 'Left', right: 'Right' },
        state, 
        updateHud, 
        showSummary 
      });
    }
  }

  async function start() {
    try {
      const activity = await loadActivityJson();
      state.items = /^fill in the blanks$/i.test(activity.type)
        ? new Array(activity.fib.blanks.length).fill(null)
        : activity.items;
      renderHeader(activity);
      reset();
      initActivity(activity);
      
      elRestart.addEventListener('click', async () => {
        reset();
        const activity2 = await loadActivityJson();
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
