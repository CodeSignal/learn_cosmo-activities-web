import toolbar from '../components/toolbar.js';
import { renderMath } from '../utils/katex-render.js';

export function initFib({ activity, state, postResults, persistedAnswers = null }) {
  const elContainer = document.getElementById('activity-container');
  const fib = activity.fib;
  
  // Create the fib container
  elContainer.innerHTML = `
    <div id="fib" class="fib">
      <div class="fib-header">
        <h2 class="fib-heading heading-xsmall"></h2>
      </div>
      <div id="fib-content" class="fib-content body-large"></div>
    </div>
  `;
  
  const elFib = document.getElementById('fib');
  const elFibHeading = elFib.querySelector('.fib-heading');
  const elFibContent = document.getElementById('fib-content');

  // Set static heading text
  if (elFibHeading) {
    elFibHeading.textContent = 'Fill in the blanks';
  }

  // Content HTML is provided by server with embedded blank spans
  elFibContent.innerHTML = fib.htmlWithPlaceholders;
  // Render LaTeX math expressions
  renderMath(elFibContent);

  // Wrap each question (p containing a blank) in div.fib-question
  const questionParagraphs = Array.from(elFibContent.querySelectorAll('p')).filter((p) => p.querySelector('.blank'));
  const wrappers = [];
  const questionStyleClass = fib.questionStyle ? ' ' + String(fib.questionStyle).trim() : '';
  questionParagraphs.forEach((p) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'fib-question' + questionStyleClass;
    p.parentNode.insertBefore(wrapper, p);
    wrapper.appendChild(p);
    wrappers.push(wrapper);
  });
  while (elFibContent.firstChild) {
    elFibContent.removeChild(elFibContent.firstChild);
  }
  wrappers.forEach((w) => elFibContent.appendChild(w));

  // Build dropdowns in each blank and synchronize options across all blanks
  const blanks = Array.from(elFibContent.querySelectorAll('.blank')).sort((a, b) => {
    const aIdx = parseInt(a.getAttribute('data-blank') || '0', 10);
    const bIdx = parseInt(b.getAttribute('data-blank') || '0', 10);
    return aIdx - bIdx;
  });

  // Selection state - initialize with persisted answers if available
  const selectedByBlankIdx = blanks.map((_, idx) => {
    if (persistedAnswers && persistedAnswers[idx] !== undefined) {
      return persistedAnswers[idx];
    }
    return '';
  });
  let openDropdown = null; // { container, blank, idx }
  const totalCounts = new Map();
  fib.choices.forEach(c => totalCounts.set(c, (totalCounts.get(c) || 0) + 1));

  // Prepare blanks to be clickable triggers
  blanks.forEach((blank) => {
    const idx = parseInt(blank.getAttribute('data-blank') || '0', 10);
    blank.setAttribute('role', 'button');
    blank.setAttribute('aria-haspopup', 'listbox');
    blank.setAttribute('aria-expanded', 'false');
    blank.tabIndex = 0;
    blank.textContent = '...';
    blank.addEventListener('click', () => {
      if (selectedByBlankIdx[idx]) {
        setSelection(idx, '');
        return;
      }
      openMenuForBlank(blank, idx);
    });
    blank.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (selectedByBlankIdx[idx]) {
          setSelection(idx, '');
        } else {
          openMenuForBlank(blank, idx);
        }
      }
    });
  });

  function getUsedCounts(exceptIdx) {
    const used = new Map();
    selectedByBlankIdx.forEach((val, i) => {
      if (val && i !== exceptIdx) {
        used.set(val, (used.get(val) || 0) + 1);
      }
    });
    return used;
  }

  function updateBlankDisplays() {
    blanks.forEach((blank, i) => {
      const value = selectedByBlankIdx[i];
      blank.textContent = value || '';
      blank.classList.toggle('empty', !value);
    });
  }

  function closeMenu() {
    if (!openDropdown) return;
    const { container, blank } = openDropdown;
    if (container && container.parentNode) container.parentNode.removeChild(container);
    blank.setAttribute('aria-expanded', 'false');
    blank.classList.remove('dropdown-open');
    document.removeEventListener('mousedown', handleOutside);
    window.removeEventListener('resize', closeMenu);
    window.removeEventListener('scroll', closeMenu, true);
    openDropdown = null;
  }

  function handleOutside(e) {
    if (!openDropdown) return;
    const { container, blank } = openDropdown;
    // Keep dropdown open if clicking inside dropdown or blank
    if (container.contains(e.target) || blank.contains(e.target)) return;
    closeMenu();
  }
  
  function handleDropdownMouseEnter() {
    if (!openDropdown) return;
    // Ensure hover state is maintained when mouse enters dropdown
    openDropdown.blank.classList.add('dropdown-open');
  }
  
  function handleDropdownMouseLeave() {
    if (!openDropdown) return;
    // Don't remove the class immediately - let closeMenu handle it
    // This prevents flickering when moving between blank and dropdown
  }

  function openMenuForBlank(blank, idx) {
    if (openDropdown && openDropdown.blank === blank) { closeMenu(); return; }
    closeMenu();
    const used = getUsedCounts(idx);
    const current = selectedByBlankIdx[idx];

    const rect = blank.getBoundingClientRect();
    
    // Build available list preserving duplicates but respecting remaining counts
    const availCounts = new Map();
    totalCounts.forEach((total, key) => {
      const usedCount = used.get(key) || 0;
      availCounts.set(key, Math.max(0, total - usedCount));
    });
    const available = [];
    fib.choices.forEach(choice => {
      const left = availCounts.get(choice) || 0;
      if (left > 0) {
        available.push(choice);
        availCounts.set(choice, left - 1);
      }
    });
    
    const menu = document.createElement('div');
    menu.className = 'fib-dropdown';
    menu.setAttribute('role', 'listbox');
    menu.style.position = 'absolute';
    menu.style.minWidth = Math.max(rect.width, 220) + 'px';

    const docX = rect.left + window.scrollX;
    const docY = rect.bottom + window.scrollY + 4;
    menu.style.left = docX + 'px';
    menu.style.top = docY + 'px';
    
    // Add class to blank to keep hover effect active
    blank.classList.add('dropdown-open');

    available.forEach(choice => {
      const opt = document.createElement('div');
      opt.className = 'fib-option';
      opt.setAttribute('role', 'option');
      opt.textContent = choice;
      
      if (choice === current) {
        opt.setAttribute('aria-selected', 'true');
        opt.classList.add('selected');
      }
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        setSelection(idx, choice);
        closeMenu();
      });
      menu.appendChild(opt);
    });

    document.body.appendChild(menu);
    blank.setAttribute('aria-expanded', 'true');
    openDropdown = { container: menu, blank, idx };
    
    // Add mouse event listeners to maintain hover state
    menu.addEventListener('mouseenter', handleDropdownMouseEnter);
    menu.addEventListener('mouseleave', handleDropdownMouseLeave);
    blank.addEventListener('mouseenter', () => {
      if (openDropdown && openDropdown.blank === blank) {
        blank.classList.add('dropdown-open');
      }
    });
    
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
  }

  function setSelection(idx, choice) {
    selectedByBlankIdx[idx] = choice;
    updateBlankDisplays();
    updateResultsAndPost();
  }

  function updateResultsAndPost() {
    const total = selectedByBlankIdx.length;
    state.results = [];
    blanks.forEach((_, i) => {
      const idx = i;
      const correctAnswer = fib.blanks.find(x => x.index === idx)?.answer || '';
      const chosen = selectedByBlankIdx[i] || '';
      state.results.push({
        text: `Blank ${i+1}`,
        selected: chosen,
        correct: correctAnswer
      });
    });
    state.index = selectedByBlankIdx.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    postResults();
  }

  updateBlankDisplays();
  
  // Sync state with persisted answers if they exist
  if (persistedAnswers) {
    updateResultsAndPost();
  }

  // Register "Clear All" tool in global toolbar
  toolbar.registerTool('fib-clear-all', {
    icon: 'icon-eraser',
    title: 'Clear All',
    onClick: (e) => {
      e.preventDefault();
      // Clear all selections
      blanks.forEach((_, idx) => {
        selectedByBlankIdx[idx] = '';
      });
      updateBlankDisplays();
      updateResultsAndPost(); // Persist the cleared state
    },
    enabled: true
  });

  return () => {
    closeMenu();
    toolbar.unregisterTool('fib-clear-all');
    elContainer.innerHTML = ''; // Remove the dynamically created fib container
  };
}
