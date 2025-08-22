export function initFib({ activity, state, updateHud }) {
  const elDeck = document.getElementById('deck');
  const elSort = document.getElementById('sort');
  const elFib = document.getElementById('fib');
  const elFibContent = document.getElementById('fib-content');
  const elFibChoices = document.getElementById('fib-choices');
  const elSummary = document.getElementById('summary');
  const elSummaryStats = document.getElementById('summary-stats');
  const elMistakes = document.getElementById('mistakes');
  const fib = activity.fib;
  
  // Hide other activity containers
  elDeck.classList.add('hidden');
  elSort.classList.add('hidden');
  elFib.classList.remove('hidden');
  elFibContent.innerHTML = '';
  elFibChoices.innerHTML = '';

  // Convert simple markdown-ish to HTML with blanks widgets
  let html = fib.htmlWithPlaceholders;
  // Escape basic HTML
  html = html.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  // Convert blockquote lines starting with '>' to <blockquote>
  const lines = html.split(/\r?\n/);
  let inQuote = false;
  const out = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) {
      if (!inQuote) { out.push('<blockquote>'); inQuote = true; }
      out.push(line.replace(/^\s*>\s?/, ''));
    } else {
      if (inQuote) { out.push('</blockquote>'); inQuote = false; }
      out.push(line);
    }
  }
  if (inQuote) out.push('</blockquote>');
  html = out.join('\n');

  // Replace placeholders with blank elements
  fib.blanks.forEach(b => {
    const placeholder = `__BLANK_${b.index}__`;
    const blankEl = `<span class="blank" data-blank="${b.index}" aria-label="blank ${b.index+1}" tabindex="0"></span>`;
    html = html.split(placeholder).join(blankEl);
  });

  elFibContent.innerHTML = html
    .replace(/\n\n+/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  // Build choices chips
  fib.choices.forEach((choice, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = choice;
    chip.setAttribute('draggable', 'true');
    chip.dataset.choice = choice;
    chip.dataset.idx = String(idx);
    elFibChoices.appendChild(chip);
  });

  // Drag handlers
  function onDragStart(e) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains('chip')) return;
    t.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', t.dataset.choice || '');
  }
  
  function onDragEnd(e) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    t.classList.remove('dragging');
  }
  
  function onDragOver(e) {
    if (!(e.currentTarget instanceof HTMLElement)) return;
    e.preventDefault();
    e.currentTarget.classList.add('over');
  }
  
  function onDragLeave(e) {
    if (!(e.currentTarget instanceof HTMLElement)) return;
    e.currentTarget.classList.remove('over');
  }
  
  function onDrop(e) {
    if (!(e.currentTarget instanceof HTMLElement)) return;
    e.preventDefault();
    const choice = e.dataTransfer.getData('text/plain');
    if (!choice) return;
    const existing = e.currentTarget.querySelector('.chip');
    if (existing) elFibChoices.appendChild(existing);
    const fromChip = document.querySelector(`.chip.dragging[data-choice="${CSS.escape(choice)}"]`) || elFibChoices.querySelector(`.chip[data-choice="${CSS.escape(choice)}"]`);
    if (fromChip instanceof HTMLElement) {
      e.currentTarget.appendChild(fromChip);
    }
    e.currentTarget.classList.remove('over');
    checkFibCompletion();
  }

  function checkFibCompletion() {
    const blanks = Array.from(elFibContent.querySelectorAll('.blank'));
    const total = blanks.length;
    let filled = 0;
    blanks.forEach(b => { if (b.querySelector('.chip')) filled += 1; });
    if (filled !== total) { updateHud(); return; }
    // evaluate
    let correct = 0;
    const mistakes = [];
    blanks.forEach((bEl, i) => {
      const idx = parseInt(bEl.getAttribute('data-blank') || '-1', 10);
      const correctAnswer = fib.blanks.find(x => x.index === idx)?.answer || '';
      const chip = bEl.querySelector('.chip');
      const chosen = chip ? chip.dataset.choice || '' : '';
      if (chosen && correctAnswer && chosen.toLowerCase() === correctAnswer.toLowerCase()) {
        correct += 1;
      } else {
        mistakes.push({ text: `Blank ${i+1}: ${chosen || '(empty)'}`, correct: correctAnswer });
      }
    });
    state.correctCount = correct;
    state.index = total;
    state.mistakes = mistakes.map(m => ({ text: m.text, correct: 'left' })); // reuse summary format
    updateHud();
    // Improve summary text for FIB
    elSummaryStats.textContent = `You filled ${correct} / ${total} correctly.`;
    elMistakes.innerHTML = '';
    mistakes.forEach(m => {
      const li = document.createElement('li');
      li.textContent = `${m.text} — Correct: ${m.correct}`;
      elMistakes.appendChild(li);
    });
    elSummary.classList.remove('hidden');
  }

  elFibChoices.addEventListener('dragstart', onDragStart);
  elFibChoices.addEventListener('dragend', onDragEnd);
  const blanks = elFibContent.querySelectorAll('.blank');
  blanks.forEach(blank => {
    blank.addEventListener('dragover', onDragOver);
    blank.addEventListener('dragleave', onDragLeave);
    blank.addEventListener('drop', onDrop);
  });

  return () => {
    elFibChoices.removeEventListener('dragstart', onDragStart);
    elFibChoices.removeEventListener('dragend', onDragEnd);
    const blanks = elFibContent.querySelectorAll('.blank');
    blanks.forEach(blank => {
      blank.removeEventListener('dragover', onDragOver);
      blank.removeEventListener('dragleave', onDragLeave);
      blank.removeEventListener('drop', onDrop);
    });
  };
}
