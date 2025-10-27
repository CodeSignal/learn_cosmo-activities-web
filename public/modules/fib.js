export function initFib({ activity, state, postResults }) {
  const elContainer = document.getElementById('activity-container');
  const fib = activity.fib;
  
  // Create the fib container
  elContainer.innerHTML = `
    <div id="fib" class="fib">
      ${fib.prompt ? `<div id="fib-prompt" class="fib-prompt"></div>` : ''}
      <div id="fib-content" class="fib-content"></div>
    </div>
  `;
  
  const elFib = document.getElementById('fib');
  const elFibPrompt = document.getElementById('fib-prompt');
  const elFibContent = document.getElementById('fib-content');

  // Set the prompt content if it exists (already HTML from server)
  if (elFibPrompt && (fib.promptHtml || fib.prompt)) {
    elFibPrompt.innerHTML = fib.promptHtml || fib.prompt;
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

  // Prepare blanks to be clickable triggers
  blanks.forEach((blank) => {
    const idx = parseInt(blank.getAttribute('data-blank') || '0', 10);
    blank.setAttribute('role', 'button');
    blank.setAttribute('aria-haspopup', 'listbox');
    blank.setAttribute('aria-expanded', 'false');
    blank.tabIndex = 0;
    blank.textContent = 'Choose…';
    blank.addEventListener('click', () => openMenuForBlank(blank, idx));
    blank.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenuForBlank(blank, idx);
      }
    });
  });

  function getUsedChoices(exceptIdx) {
    const used = new Set();
    selectedByBlankIdx.forEach((val, i) => {
      if (val && i !== exceptIdx) used.add(val);
    });
    return used;
  }

  function updateBlankDisplays() {
    blanks.forEach((blank, i) => {
      const value = selectedByBlankIdx[i];
      blank.textContent = value || 'Choose…';
      blank.classList.toggle('empty', !value);
    });
  }

  function closeMenu() {
    if (!openDropdown) return;
    const { container, blank } = openDropdown;
    if (container && container.parentNode) container.parentNode.removeChild(container);
    blank.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', handleOutside);
    window.removeEventListener('resize', closeMenu);
    window.removeEventListener('scroll', closeMenu, true);
    openDropdown = null;
  }

  function handleOutside(e) {
    if (!openDropdown) return;
    const { container, blank } = openDropdown;
    if (container.contains(e.target) || blank.contains(e.target)) return;
    closeMenu();
  }

  function openMenuForBlank(blank, idx) {
    if (openDropdown && openDropdown.blank === blank) { closeMenu(); return; }
    closeMenu();
    const used = getUsedChoices(idx);
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

    const available = fib.choices.filter(choice => !used.has(choice) || choice === current);
    if (current) {
      const optClear = document.createElement('div');
      optClear.className = 'fib-option clear';
      optClear.setAttribute('role', 'option');
      optClear.textContent = 'Clear selection';
      optClear.addEventListener('mousedown', (e) => {
        e.preventDefault();
        setSelection(idx, '');
        closeMenu();
      });
      menu.appendChild(optClear);
      const hr = document.createElement('div');
      hr.style.height = '1px';
      hr.style.background = 'var(--bespoke-stroke)';
      hr.style.margin = '4px 2px';
      menu.appendChild(hr);
    }
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
        checkFibCompletion();
      });
      menu.appendChild(opt);
    });

    document.body.appendChild(menu);
    blank.setAttribute('aria-expanded', 'true');
    openDropdown = { container: menu, blank, idx };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
  }

  function setSelection(idx, choice) {
    selectedByBlankIdx[idx] = choice;
    updateBlankDisplays();
  }

  function checkFibCompletion() {
    const total = selectedByBlankIdx.length;
    const selectedCount = selectedByBlankIdx.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    if (selectedCount !== total) return;
    // evaluate and record results
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
    state.index = total;
    postResults();
  }

  updateBlankDisplays();

  return () => {
    closeMenu();
    elContainer.innerHTML = ''; // Remove the dynamically created fib container
  };
}
