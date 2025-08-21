(() => {
  'use strict';

  /**
   * Parse the custom markdown format into a structured activity.
   * Expected sections: __Type__, __Practice Question__, __Labels__, __Left Label Items__, __Right Label Items__
   */
  function parseActivityMarkdown(markdownText) {
    const lines = markdownText.split(/\r?\n/);

    const sections = new Map();
    let currentKey = null;
    let buffer = [];

    function flush() {
      if (currentKey !== null) {
        sections.set(currentKey, buffer.join('\n').trim());
      }
      buffer = [];
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const headerMatch = line.match(/^__([^_]+)__$/);
      if (headerMatch) {
        flush();
        currentKey = headerMatch[1].trim();
      } else {
        buffer.push(rawLine);
      }
    }
    flush();

    function readList(sectionName) {
      const content = sections.get(sectionName) || '';
      const items = [];
      for (const rawLine of content.split(/\r?\n/)) {
        const m = rawLine.match(/^\s*[-*]\s+(.*)$/);
        if (m) items.push(m[1].trim());
      }
      return items;
    }

    const type = (sections.get('Type') || '').trim();
    const question = (sections.get('Practice Question') || '').trim();
    const labelsRaw = readList('Labels');

    if (/^fill in the blanks$/i.test(type)) {
      // Parse FIB
      const fibMarkdown = (sections.get('Markdown With Blanks') || '').trim();
      const suggested = readList('Suggested Answers');
      // Extract blanks [[blank:token]]
      const blanks = [];
      let idx = 0;
      const html = fibMarkdown.replace(/\[\[blank:([^\]]+)\]\]/gi, (_, token) => {
        const trimmed = String(token).trim();
        const placeholder = `__BLANK_${idx}__`;
        blanks.push({ index: idx, answer: trimmed });
        idx += 1;
        return placeholder;
      });
      // Build items/choices: include all suggested answers; ensure all correct answers present
      const choiceSet = new Set(suggested.map(s => s.trim()));
      blanks.forEach(b => choiceSet.add(b.answer));
      const choices = Array.from(choiceSet);
      // Shuffle choices
      const seed = markdownText.length % 2147483647;
      let s = seed || 1337;
      function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      return { type, question, fib: { raw: fibMarkdown, htmlWithPlaceholders: html, blanks, choices } };
    } else if (/^sort into boxes$/i.test(type)) {
      let firstLabel = '';
      let secondLabel = '';
      for (const entry of labelsRaw) {
        const [key, ...rest] = entry.split(':');
        const value = rest.join(':').trim();
        const normalizedKey = (key || '').toLowerCase();
        if (normalizedKey.includes('first')) firstLabel = value;
        if (normalizedKey.includes('second')) secondLabel = value;
      }

      const firstItems = readList('First Box Items');
      const secondItems = readList('Second Box Items');
      const items = [
        ...firstItems.map(text => ({ text, correct: 'first' })),
        ...secondItems.map(text => ({ text, correct: 'second' })),
      ];
      // shuffle
      const seed = markdownText.length % 2147483647;
      let s = seed || 1337;
      function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return { type, question, labels: { first: firstLabel, second: secondLabel }, items };
    } else {
      // default: swipe left/right
      let leftLabel = '';
      let rightLabel = '';
      for (const entry of labelsRaw) {
        const [key, ...rest] = entry.split(':');
        const value = rest.join(':').trim();
        const normalizedKey = (key || '').toLowerCase();
        if (normalizedKey.includes('left')) leftLabel = value;
        if (normalizedKey.includes('right')) rightLabel = value;
      }

      const leftItems = readList('Left Label Items');
      const rightItems = readList('Right Label Items');
      const items = [
        ...leftItems.map(text => ({ text, correct: 'left' })),
        ...rightItems.map(text => ({ text, correct: 'right' })),
      ];
      const seed = markdownText.length % 2147483647;
      let s = seed || 1337;
      function rand() { s = (s * 48271) % 2147483647; return s / 2147483647; }
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return { type, question, labels: { left: leftLabel, right: rightLabel }, items };
    }
  }

  // DOM references
  const elType = document.getElementById('activity-type');
  const elQuestion = document.getElementById('practice-question');
  const elLeftLabel = document.getElementById('left-label');
  const elRightLabel = document.getElementById('right-label');
  const elDeck = document.getElementById('deck');
  const elSort = document.getElementById('sort');
  const elBox1Title = document.getElementById('box1-title');
  const elBox2Title = document.getElementById('box2-title');
  const elBox1Body = document.getElementById('box1-body');
  const elBox2Body = document.getElementById('box2-body');
  const elPoolBody = document.getElementById('pool-body');
  const elProgress = document.getElementById('progress');
  const elScore = document.getElementById('score');
  const elSummary = document.getElementById('summary');
  const elSummaryStats = document.getElementById('summary-stats');
  const elMistakes = document.getElementById('mistakes');
  const elRestart = document.getElementById('restart');
  const elFib = document.getElementById('fib');
  const elFibContent = document.getElementById('fib-content');
  const elFibChoices = document.getElementById('fib-choices');

  const state = {
    items: [],
    index: 0,
    correctCount: 0,
    mistakes: [],
  };

  function renderHeader(activity) {
    elType.textContent = activity.type || 'Swipe Activity';
    elQuestion.textContent = activity.question || '';
    if (/^sort into boxes$/i.test(activity.type)) {
      elLeftLabel.textContent = '';
      elRightLabel.textContent = '';
      elBox1Title.textContent = activity.labels.first || 'First Box';
      elBox2Title.textContent = activity.labels.second || 'Second Box';
    } else if (/^fill in the blanks$/i.test(activity.type)) {
      elLeftLabel.textContent = '';
      elRightLabel.textContent = '';
    } else {
      elLeftLabel.textContent = activity.labels.left || 'Left';
      elRightLabel.textContent = activity.labels.right || 'Right';
    }
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
      li.textContent = `${m.text} — Correct: ${m.correct === 'left' ? elLeftLabel.textContent : elRightLabel.textContent}`;
      elMistakes.appendChild(li);
    }
    elSummary.classList.remove('hidden');
  }

  function reset() {
    state.index = 0;
    state.correctCount = 0;
    state.mistakes = [];
    elDeck.innerHTML = '';
    elSummary.classList.add('hidden');
    updateHud();
  }

  function createCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    const p = document.createElement('p');
    p.textContent = item.text;
    card.appendChild(p);
    const hintLeft = document.createElement('div');
    hintLeft.className = 'hint left';
    hintLeft.textContent = document.getElementById('left-label').textContent || 'Left';
    hintLeft.style.opacity = '0';
    const hintRight = document.createElement('div');
    hintRight.className = 'hint right';
    hintRight.textContent = document.getElementById('right-label').textContent || 'Right';
    hintRight.style.opacity = '0';
    card.appendChild(hintLeft);
    card.appendChild(hintRight);
    return card;
  }

  function mountDeck(items) {
    // Add in reverse order so the first item is on top
    for (let i = items.length - 1; i >= 0; i--) {
      const card = createCard(items[i]);
      elDeck.appendChild(card);
    }
  }

  function getTopCard() {
    const cards = elDeck.querySelectorAll('.card');
    if (!cards.length) return null;
    return cards[cards.length - 1];
  }

  function animateOut(card, direction) {
    const toX = direction === 'left' ? -window.innerWidth : window.innerWidth;
    const toRot = direction === 'left' ? -30 : 30;
    card.style.transition = 'transform 220ms ease-out, opacity 220ms ease-out';
    card.style.transform = `translate(${toX}px, 0px) rotate(${toRot}deg)`;
    card.style.opacity = '0';
    setTimeout(() => {
      card.remove();
    }, 220);
  }

  function animateBack(card) {
    card.style.transition = 'transform 180ms ease-out';
    card.style.transform = 'translate(0px, 0px) rotate(0deg)';
    const hints = card.querySelectorAll('.hint');
    hints.forEach(h => h.style.opacity = '0');
  }

  function handleDecision(item, direction) {
    const isCorrect = item.correct === direction;
    if (isCorrect) {
      state.correctCount += 1;
    } else {
      state.mistakes.push(item);
    }
    state.index += 1;
    updateHud();
    if (state.index >= state.items.length) {
      setTimeout(showSummary, 250);
    }
  }

  function attachInteractions() {
    if (elSort && !elSort.classList.contains('hidden')) return; // only attach once for swipe
    let startX = 0;
    let startY = 0;
    let currentCard = null;
    let currentItem = null;
    let dragging = false;

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return; // left click only
      const top = getTopCard();
      if (!top) return;
      currentCard = top;
      currentItem = state.items[state.index];
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      currentCard.setPointerCapture(e.pointerId);
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!dragging || !currentCard) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const rot = Math.max(-20, Math.min(20, dx / 10));
      currentCard.style.transition = 'none';
      currentCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
      const hints = currentCard.querySelectorAll('.hint');
      const leftHint = hints[0];
      const rightHint = hints[1];
      const t = Math.min(1, Math.abs(dx) / 100);
      if (dx < 0) {
        leftHint.style.opacity = String(t);
        rightHint.style.opacity = '0';
      } else if (dx > 0) {
        rightHint.style.opacity = String(t);
        leftHint.style.opacity = '0';
      } else {
        leftHint.style.opacity = '0';
        rightHint.style.opacity = '0';
      }
    }

    function onPointerUp(e) {
      if (!dragging || !currentCard) return;
      const dx = e.clientX - startX;
      const absDx = Math.abs(dx);
      const direction = dx < 0 ? 'left' : 'right';
      const threshold = 90;
      const decided = absDx > threshold;
      const decidedItem = currentItem;
      const decidedCard = currentCard;

      dragging = false;
      currentCard.releasePointerCapture(e.pointerId);
      currentCard = null;
      currentItem = null;

      if (decided) {
        animateOut(decidedCard, direction);
        handleDecision(decidedItem, direction);
      } else {
        animateBack(decidedCard);
      }
    }

    elDeck.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Keyboard accessibility
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const top = getTopCard();
      if (!top) return;
      const item = state.items[state.index];
      const dir = e.key === 'ArrowLeft' ? 'left' : 'right';
      animateOut(top, dir);
      handleDecision(item, dir);
    });
  }

  function renderSort(items, labels) {
    elDeck.classList.add('hidden');
    elSort.classList.remove('hidden');
    elBox1Title.textContent = labels.first || 'First Box';
    elBox2Title.textContent = labels.second || 'Second Box';
    elBox1Body.innerHTML = '';
    elBox2Body.innerHTML = '';
    elPoolBody.innerHTML = '';

    items.forEach((item, idx) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = item.text;
      chip.setAttribute('draggable', 'true');
      chip.dataset.index = String(idx);
      elPoolBody.appendChild(chip);
    });

    function onDragStart(e) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains('chip')) return;
      target.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', target.dataset.index || '');
    }
    function onDragEnd(e) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      target.classList.remove('dragging');
    }
    function onDragOver(e) {
      if (!(e.currentTarget instanceof HTMLElement)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      e.currentTarget.classList.add('over');
    }
    function onDragLeave(e) {
      if (!(e.currentTarget instanceof HTMLElement)) return;
      e.currentTarget.classList.remove('over');
    }
    function onDrop(e) {
      if (!(e.currentTarget instanceof HTMLElement)) return;
      e.preventDefault();
      const idxStr = e.dataTransfer.getData('text/plain');
      const idx = parseInt(idxStr, 10);
      if (Number.isNaN(idx)) return;
      const chip = elPoolBody.querySelector(`.chip[data-index="${idx}"]`) || document.querySelector(`.chip[data-index="${idx}"]`);
      if (!(chip instanceof HTMLElement)) return;
      e.currentTarget.classList.remove('over');
      e.currentTarget.appendChild(chip);
      checkCompletion();
    }

    [elBox1Body, elBox2Body, elPoolBody].forEach(zone => {
      zone.addEventListener('dragover', onDragOver);
      zone.addEventListener('dragleave', onDragLeave);
      zone.addEventListener('drop', onDrop);
    });
    elPoolBody.addEventListener('dragstart', onDragStart);
    elPoolBody.addEventListener('dragend', onDragEnd);

    function checkCompletion() {
      const placed = document.querySelectorAll('.chip');
      const total = items.length;
      let placedCount = 0;
      placed.forEach(chip => {
        const parent = chip.parentElement;
        if (!parent) return;
        if (parent === elBox1Body || parent === elBox2Body) placedCount += 1;
      });
      if (placedCount !== total) {
        updateHud();
        return;
      }
      // evaluate
      let correct = 0;
      const mistakes = [];
      placed.forEach(chip => {
        const index = parseInt(chip.dataset.index || '-1', 10);
        const item = items[index];
        const parent = chip.parentElement;
        const inBox = parent === elBox1Body ? 'first' : parent === elBox2Body ? 'second' : 'pool';
        if (item && (inBox === item.correct)) correct += 1; else if (item) mistakes.push(item);
      });
      state.correctCount = correct;
      state.index = total;
      state.mistakes = mistakes;
      updateHud();
      showSummary();
    }
  }

  function renderFib(fib) {
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

    elFibChoices.addEventListener('dragstart', onDragStart);
    elFibChoices.addEventListener('dragend', onDragEnd);
    const blanks = elFibContent.querySelectorAll('.blank');
    blanks.forEach(blank => {
      blank.addEventListener('dragover', onDragOver);
      blank.addEventListener('dragleave', onDragLeave);
      blank.addEventListener('drop', onDrop);
    });

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
  }

  async function loadActivityMarkdown(pathname) {
    const res = await fetch(pathname, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${pathname}: ${res.status}`);
    return await res.text();
  }

  async function start() {
    try {
      const params = new URLSearchParams(location.search);
      const file = params.get('file') || 'question.md';
      const md = await loadActivityMarkdown('/' + file);
      const activity = parseActivityMarkdown(md);
      if (/^fill in the blanks$/i.test(activity.type)) {
        state.items = new Array(activity.fib.blanks.length).fill(null);
      } else {
        state.items = activity.items;
      }
      renderHeader(activity);
      reset();
      if (/^fill in the blanks$/i.test(activity.type)) {
        renderFib(activity.fib);
      } else if (/^sort into boxes$/i.test(activity.type)) {
        elDeck.classList.add('hidden');
        renderSort(state.items, activity.labels);
      } else {
        elSort.classList.add('hidden');
        elFib.classList.add('hidden');
        elDeck.classList.remove('hidden');
        mountDeck(state.items);
        updateHud();
        attachInteractions();
      }
      elRestart.addEventListener('click', () => {
        reset();
        const activity2 = parseActivityMarkdown(md + String(Date.now() % 1000));
        if (/^fill in the blanks$/i.test(activity.type)) {
          state.items = new Array(activity2.fib.blanks.length).fill(null);
          renderFib(activity2.fib);
        } else if (/^sort into boxes$/i.test(activity.type)) {
          state.items = activity2.items;
          renderSort(state.items, activity.labels);
        } else {
          elSort.classList.add('hidden');
          elFib.classList.add('hidden');
          elDeck.classList.remove('hidden');
          state.items = activity2.items;
          mountDeck(state.items);
          updateHud();
        }
      });
    } catch (err) {
      elQuestion.textContent = 'Failed to load activity.';
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  start();
})();


