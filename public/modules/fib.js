export function initFib({ activity, state, postResults }) {
  const elContainer = document.getElementById('activity-container');
  const fib = activity.fib;
  
  // Create the fib container
  elContainer.innerHTML = `
    <div id="fib" class="fib">
      <div class="fib-header">
        <h2 class="fib-heading"></h2>
        <div class="fib-actions">
          <a id="restart" href="#" class="fib-clear-all">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2.5H8M7.5 2.5V8.5C7.5 8.77614 7.27614 9 7 9H3C2.72386 9 2.5 8.77614 2.5 8.5V2.5M3.5 2.5V1.5C3.5 1.22386 3.72386 1 4 1H6C6.27614 1 6.5 1.22386 6.5 1.5V2.5M4 4.5V7.5M6 4.5V7.5" stroke="#acb4c7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Clear all</span>
          </a>
        </div>
      </div>
      <div id="fib-content" class="fib-content"></div>
    </div>
  `;
  
  const elFib = document.getElementById('fib');
  const elFibHeading = elFib.querySelector('.fib-heading');
  const elFibContent = document.getElementById('fib-content');

  // Set the prompt content as the heading if it exists (already HTML from server)
  if (elFibHeading && (fib.promptHtml || fib.prompt)) {
    elFibHeading.innerHTML = fib.promptHtml || fib.prompt;
  }

  // Content HTML is provided by server with embedded blank spans
  elFibContent.innerHTML = fib.htmlWithPlaceholders;

  // Build dropdowns in each blank and synchronize options across all blanks
  const blanks = Array.from(elFibContent.querySelectorAll('.blank')).sort((a, b) => {
    const aIdx = parseInt(a.getAttribute('data-blank') || '0', 10);
    const bIdx = parseInt(b.getAttribute('data-blank') || '0', 10);
    return aIdx - bIdx;
  });

  // Selection state
  const selectedByBlankIdx = blanks.map(() => '');
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
    const menu = document.createElement('div');
    menu.className = 'fib-dropdown';
    menu.setAttribute('role', 'listbox');
    menu.style.position = 'absolute';
    menu.style.minWidth = Math.max(rect.width, 120) + 'px';
    menu.style.maxWidth = '320px';

    const docX = rect.left + window.scrollX;
    const docY = rect.bottom + window.scrollY + 4;
    menu.style.left = docX + 'px';
    menu.style.top = docY + 'px';
    
    // Add class to blank to keep hover effect active
    blank.classList.add('dropdown-open');

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

  return () => {
    closeMenu();
    elContainer.innerHTML = ''; // Remove the dynamically created fib container
  };
}
