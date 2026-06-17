import { renderMath } from '../utils/katex-render.js';
import toolbar from '../components/toolbar.js';

/**
 * Categorization Sorting activity.
 *
 * Learners place each item from a tray into one of N category cards, by either
 * clicking (select an item, then click a category) or dragging the item onto a
 * category. Items placed in a category leave a dashed placeholder slot in the
 * tray. Clicking a placed item returns it to the tray.
 */
export function initSort({
  activity,
  state,
  postResults,
  persistedAnswers = null,
  elContainer = document.getElementById('activity-container')
}) {
  const categories = Array.isArray(activity.categories) ? activity.categories : [];
  const items = Array.isArray(activity.items) ? activity.items : [];

  if (categories.length === 0 || items.length === 0) {
    elContainer.innerHTML = '<div class="error">No categorization items found</div>';
    return () => {
      elContainer.innerHTML = '';
    };
  }

  const DRAG_MIME = 'application/x-cosmo-item';

  // placement[itemIndex] = category label, or '' when still in the tray.
  const placement = items.map((_, idx) => {
    if (persistedAnswers && persistedAnswers[idx] !== undefined && categories.includes(persistedAnswers[idx])) {
      return persistedAnswers[idx];
    }
    return '';
  });

  let activeItemIndex = null; // currently selected (click model)
  let validating = false; // true after a /validate request highlights mistakes

  // Build the static shell.
  elContainer.innerHTML = `
    <div id="categorization" class="categorization">
      <div class="categorization-question" hidden></div>
      <div class="categorization-categories" id="categorization-categories"></div>
      <div class="categorization-instructions">
        <span class="categorization-instructions-icon" aria-hidden="true">${instructionIconSvg()}</span>
        <p class="categorization-instructions-text">Click or drag the items onto the cards above</p>
      </div>
      <div class="categorization-tray" id="categorization-tray" role="list" aria-label="Items to sort"></div>
    </div>
  `;

  const elCategories = elContainer.querySelector('#categorization-categories');
  const elTray = elContainer.querySelector('#categorization-tray');
  const elQuestion = elContainer.querySelector('.categorization-question');

  // Optional practice question / prompt.
  if (activity.questionHtml || activity.question) {
    elQuestion.hidden = false;
    elQuestion.className =
      'categorization-question box non-interactive input-group body-large';
    if (activity.questionHtml) {
      elQuestion.innerHTML = activity.questionHtml;
    } else {
      elQuestion.textContent = activity.question;
    }
    renderMath(elQuestion);
  }

  function chipInnerHtml(item) {
    return item.textHtml || escapeHtml(item.text);
  }

  function dragHandleSvg() {
    return `<span class="categorization-chip-handle" aria-hidden="true"><svg viewBox="0 0 6 14" width="6" height="14" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="1.25" cy="1.25" r="1.25" fill="currentColor"/><circle cx="4.75" cy="1.25" r="1.25" fill="currentColor"/><circle cx="1.25" cy="7" r="1.25" fill="currentColor"/><circle cx="4.75" cy="7" r="1.25" fill="currentColor"/><circle cx="1.25" cy="12.75" r="1.25" fill="currentColor"/><circle cx="4.75" cy="12.75" r="1.25" fill="currentColor"/></svg></span>`;
  }

  function incorrectIconSvg() {
    return `<span class="categorization-chip-status" aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="8" fill="currentColor"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg></span>`;
  }

  function instructionIconSvg() {
    return `<svg viewBox="0 0 28 28" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2.5" y="6.5" width="14" height="11" rx="2.5" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/>
      <rect x="9.5" y="10.5" width="14" height="11" rx="2.5" fill="var(--Colors-Backgrounds-Main-Default, #f4f5f9)" stroke="currentColor" stroke-width="1.6"/>
    </svg>`;
  }

  function makeChip(itemIndex, { placed }) {
    const item = items[itemIndex];
    // Only mark chips that are placed in the wrong category; never flag the tray.
    const misplaced = placed && validating && placement[itemIndex] !== (item.correct || '');
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `categorization-chip${placed ? ' placed' : ''}${misplaced ? ' incorrect' : ''}`;
    chip.dataset.itemIndex = String(itemIndex);
    chip.setAttribute('draggable', 'true');
    if (misplaced) chip.setAttribute('aria-invalid', 'true');
    chip.innerHTML = `${placed ? '' : dragHandleSvg()}<span class="categorization-chip-label">${chipInnerHtml(item)}</span>${misplaced ? incorrectIconSvg() : ''}`;
    chip.setAttribute(
      'aria-label',
      placed
        ? `${item.text}, placed in ${placement[itemIndex]}.${misplaced ? ' This placement is incorrect.' : ''} Activate to return to the tray.`
        : `${item.text}. Activate to select, then choose a category.`
    );
    if (!placed && activeItemIndex === itemIndex) {
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');
    }
    renderMath(chip);

    chip.addEventListener('click', () => {
      if (placed) {
        // Return item to the tray.
        setPlacement(itemIndex, '');
        activeItemIndex = null;
      } else if (activeItemIndex === itemIndex) {
        activeItemIndex = null;
      } else {
        activeItemIndex = itemIndex;
      }
      render();
    });

    chip.addEventListener('dragstart', (e) => {
      chip.classList.add('dragging');
      activeItemIndex = itemIndex;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(DRAG_MIME, String(itemIndex));
        e.dataTransfer.setData('text/plain', item.text);
      }
    });
    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
    });

    return chip;
  }

  function getDraggedItemIndex(e) {
    let raw = '';
    if (e.dataTransfer) {
      raw = e.dataTransfer.getData(DRAG_MIME) || '';
    }
    if (raw === '' && activeItemIndex !== null) {
      return activeItemIndex;
    }
    const idx = parseInt(raw, 10);
    return Number.isNaN(idx) ? null : idx;
  }

  function wireDropZone(el, targetCategory) {
    // targetCategory === null means "the tray" (un-assign).
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget)) {
        el.classList.remove('drag-over');
      }
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const itemIndex = getDraggedItemIndex(e);
      if (itemIndex === null || itemIndex < 0 || itemIndex >= items.length) return;
      setPlacement(itemIndex, targetCategory || '');
      activeItemIndex = null;
      render();
    });
  }

  function renderCategories() {
    elCategories.innerHTML = '';
    categories.forEach((label) => {
      const card = document.createElement('div');
      card.className = 'categorization-category';

      const head = document.createElement('div');
      head.className = 'categorization-category-head heading-small';
      head.textContent = label;
      renderMath(head);

      const zone = document.createElement('div');
      zone.className = 'categorization-dropzone';
      zone.dataset.category = label;
      zone.setAttribute('role', 'group');
      zone.setAttribute('aria-label', `${label} category`);

      const placedIndexes = items
        .map((_, idx) => idx)
        .filter((idx) => placement[idx] === label);

      if (placedIndexes.length === 0) {
        zone.classList.add('empty');
      } else {
        placedIndexes.forEach((idx) => {
          zone.appendChild(makeChip(idx, { placed: true }));
        });
      }

      // Clicking an empty/active zone drops the selected item there.
      zone.addEventListener('click', (e) => {
        if (e.target.closest('.categorization-chip')) return;
        if (activeItemIndex !== null) {
          setPlacement(activeItemIndex, label);
          activeItemIndex = null;
          render();
        }
      });
      wireDropZone(zone, label);

      card.appendChild(head);
      card.appendChild(zone);
      elCategories.appendChild(card);
    });
  }

  function renderTray() {
    elTray.innerHTML = '';
    items.forEach((_, idx) => {
      if (placement[idx]) {
        // Leave a dashed placeholder slot where the item used to be.
        const slot = document.createElement('div');
        slot.className = 'categorization-slot empty';
        slot.setAttribute('aria-hidden', 'true');
        elTray.appendChild(slot);
      } else {
        const chip = makeChip(idx, { placed: false });
        chip.setAttribute('role', 'listitem');
        elTray.appendChild(chip);
      }
    });
    // The tray is also a drop target for returning items.
    elTray.classList.toggle('has-active', activeItemIndex !== null);
  }

  function render() {
    renderCategories();
    renderTray();
  }

  function setPlacement(itemIndex, category) {
    placement[itemIndex] = category || '';
    // Any change invalidates a previous validation pass.
    validating = false;
    updateResultsAndPost();
  }

  // Highlight placed chips that are in the wrong category. Triggered by a
  // POST to /validate (delivered via the WebSocket "validate" message).
  // Unplaced items are intentionally left untouched.
  function validateAnswers() {
    validating = true;
    render();
  }

  function updateResultsAndPost() {
    state.results = items.map((item, idx) => ({
      text: item.text,
      selected: placement[idx] || '',
      correct: item.correct || ''
    }));
    state.index = placement.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    postResults();
  }

  function clearAllAnswers() {
    items.forEach((_, idx) => {
      placement[idx] = '';
    });
    activeItemIndex = null;
    validating = false;
    render();
    updateResultsAndPost();
  }

  // Make the tray a drop zone for un-assigning items.
  wireDropZone(elTray, null);

  // Initial render + initial results (so partial/persisted state is recorded).
  render();
  updateResultsAndPost();

  toolbar.registerTool('sort-clear-all', {
    icon: 'icon-eraser',
    title: 'Clear All',
    onClick: (e) => {
      e.preventDefault();
      clearAllAnswers();
    },
    enabled: true
  });

  return {
    cleanup: () => {
      toolbar.unregisterTool('sort-clear-all');
      elContainer.innerHTML = '';
    },
    validate: validateAnswers
  };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
