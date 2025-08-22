export function initSwipe({ items, labels, state, updateHud, showSummary }) {
  const elContainer = document.getElementById('activity-container');
  const elLeftLabel = document.getElementById('left-label');
  const elRightLabel = document.getElementById('right-label');
  
  // Set the labels for this swipe activity
  elLeftLabel.textContent = labels.left || 'Left';
  elRightLabel.textContent = labels.right || 'Right';
  
  // Create the deck container
  elContainer.innerHTML = '<div id="deck" class="deck"></div>';
  const elDeck = document.getElementById('deck');

  function createCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    const p = document.createElement('p');
    p.textContent = item.text;
    card.appendChild(p);
    const hintLeft = document.createElement('div');
    hintLeft.className = 'hint left';
    hintLeft.textContent = elLeftLabel?.textContent || 'Left';
    hintLeft.style.opacity = '0';
    const hintRight = document.createElement('div');
    hintRight.className = 'hint right';
    hintRight.textContent = elRightLabel?.textContent || 'Right';
    hintRight.style.opacity = '0';
    card.appendChild(hintLeft);
    card.appendChild(hintRight);
    return card;
  }

  function mountDeck(items) {
    elDeck.innerHTML = '';
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
    card.style.transform = `translate(calc(-50% + ${toX}px), -50%) rotate(${toRot}deg)`;
    card.style.opacity = '0';
    setTimeout(() => {
      card.remove();
    }, 220);
  }

  function animateBack(card) {
    card.style.transition = 'transform 180ms ease-out';
    card.style.transform = 'translate(-50%, -50%) rotate(0deg)';
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
      currentCard.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg)`;
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
    function onKeyDown(e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const top = getTopCard();
      if (!top) return;
      const item = state.items[state.index];
      const dir = e.key === 'ArrowLeft' ? 'left' : 'right';
      animateOut(top, dir);
      handleDecision(item, dir);
    }
    window.addEventListener('keydown', onKeyDown);

    return () => {
      elDeck.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }

  mountDeck(items);
  updateHud();
  
  const cleanup = attachInteractions();
  
  // Return cleanup function and a way to get current label text
  return {
    cleanup: () => {
      cleanup();
      elContainer.innerHTML = ''; // Remove the dynamically created deck
    },
    getLabels: () => ({
      left: elLeftLabel.textContent,
      right: elRightLabel.textContent
    })
  };
}
