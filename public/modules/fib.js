export function initFib({ activity, state, postResults }) {
  const elContainer = document.getElementById('activity-container');
  const fib = activity.fib;
  
  // Create the fib container
  elContainer.innerHTML = `
    <div id="fib" class="fib">
      ${fib.prompt ? `<div id="fib-prompt" class="fib-prompt"></div>` : ''}
      <div id="fib-content" class="fib-content"></div>
      <div class="pool">
        <div class="pool-title">Choices</div>
        <div id="fib-choices" class="pool-body"></div>
      </div>
    </div>
  `;
  
  const elFib = document.getElementById('fib');
  const elFibPrompt = document.getElementById('fib-prompt');
  const elFibContent = document.getElementById('fib-content');
  const elFibChoices = document.getElementById('fib-choices');

  // Set the prompt content if it exists (already HTML from server)
  if (elFibPrompt && (fib.promptHtml || fib.prompt)) {
    elFibPrompt.innerHTML = fib.promptHtml || fib.prompt;
  }

  // Content HTML is provided by server with embedded blank spans
  elFibContent.innerHTML = fib.htmlWithPlaceholders;

  // Build choices chips
  fib.choices.forEach((choice, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = choice;
    chip.dataset.choice = choice;
    chip.dataset.idx = String(idx);
    chip.dataset.used = 'false';
    elFibChoices.appendChild(chip);
  });

  // State for linear progression
  let currentBlankIndex = 0;
  
  // Get all blanks and sort by their index
  const blanks = Array.from(elFibContent.querySelectorAll('.blank')).sort((a, b) => {
    const aIdx = parseInt(a.getAttribute('data-blank') || '0', 10);
    const bIdx = parseInt(b.getAttribute('data-blank') || '0', 10);
    return aIdx - bIdx;
  });
  
  function updateBlankHighlighting() {
    blanks.forEach((blank, i) => {
      blank.classList.toggle('current', i === currentBlankIndex && !blank.querySelector('.chip'));
    });
  }
  
  function getNextEmptyBlankIndex() {
    for (let i = 0; i < blanks.length; i++) {
      if (!blanks[i].querySelector('.chip')) {
        return i;
      }
    }
    return -1; // All filled
  }
  
  function onChoiceClick(e) {
    const chip = e.target;
    if (!(chip instanceof HTMLElement) || !chip.classList.contains('chip')) return;
    if (chip.dataset.used === 'true') return; // Already used
    
    const nextEmptyIndex = getNextEmptyBlankIndex();
    if (nextEmptyIndex === -1) return; // All blanks filled
    
    const targetBlank = blanks[nextEmptyIndex];
    
    // Move chip to blank
    const chipClone = chip.cloneNode(true);
    chipClone.classList.add('filled');
    targetBlank.appendChild(chipClone);
    
    // Mark original chip as used
    chip.dataset.used = 'true';
    chip.classList.add('used');
    
    // Update current blank index
    currentBlankIndex = getNextEmptyBlankIndex();
    updateBlankHighlighting();
    
    // Add click handler to filled chip for undo
    chipClone.addEventListener('click', onFilledChipClick);
    
    checkFibCompletion();
  }
  
  function onFilledChipClick(e) {
    e.stopPropagation();
    const filledChip = e.target;
    if (!(filledChip instanceof HTMLElement)) return;
    
    const choice = filledChip.dataset.choice;
    const originalChip = elFibChoices.querySelector(`.chip[data-choice="${CSS.escape(choice)}"]`);
    
    if (originalChip) {
      // Re-enable the original chip
      originalChip.dataset.used = 'false';
      originalChip.classList.remove('used');
      
      // Remove the filled chip
      filledChip.remove();
      
      // Update highlighting to first empty blank
      currentBlankIndex = getNextEmptyBlankIndex();
      updateBlankHighlighting();
    }
  }

  function checkFibCompletion() {
    const blanks = Array.from(elFibContent.querySelectorAll('.blank'));
    const total = blanks.length;
    let filled = 0;
    blanks.forEach(b => { if (b.querySelector('.chip')) filled += 1; });
    if (filled !== total) { return; }
    // evaluate and record results
    blanks.forEach((bEl, i) => {
      const idx = parseInt(bEl.getAttribute('data-blank') || '-1', 10);
      const correctAnswer = fib.blanks.find(x => x.index === idx)?.answer || '';
      const chip = bEl.querySelector('.chip');
      const chosen = chip ? chip.dataset.choice || '' : '';
      state.results.push({
        text: `Blank ${i+1}`,
        selected: chosen,
        correct: correctAnswer
      });
    });
    state.index = total;

    postResults();
  }

  // Initialize highlighting and add click event listeners
  currentBlankIndex = 0;
  updateBlankHighlighting();
  
  elFibChoices.addEventListener('click', onChoiceClick);

  return () => {
    elFibChoices.removeEventListener('click', onChoiceClick);
    elContainer.innerHTML = ''; // Remove the dynamically created fib container
  };
}
