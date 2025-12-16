import HorizontalCards from '../design-system/components/horizontal-cards/horizontal-cards.js';
import toolbar from '../components/toolbar.js';

export function initMatching({ activity, state, postResults, persistedAnswers = null }) {
  const elContainer = document.getElementById('activity-container');
  const matching = activity.matching;
  
  if (!matching || !matching.items || matching.items.length === 0) {
    elContainer.innerHTML = '<div class="error">No matching items found</div>';
    return () => {
      elContainer.innerHTML = '';
    };
  }
  
  // Create the matching container
  elContainer.innerHTML = `
    <div id="matching" class="matching">
      <div class="matching-header">
        <div class="matching-heading heading-small"></div>
      </div>
      <div id="matching-cards-container" class="matching-cards-container"></div>
      <div id="matching-choices" class="matching-choices" role="listbox" aria-label="Answer choices"></div>
    </div>
  `;
  
  const elMatching = document.getElementById('matching');
  const elMatchingHeader = elMatching.querySelector('.matching-header');
  const elMatchingHeading = elMatching.querySelector('.matching-heading');
  const elMatchingCardsContainer = document.getElementById('matching-cards-container');
  const elMatchingChoices = document.getElementById('matching-choices');
  
  // Set the prompt content as the heading if it exists
  if (elMatchingHeading && (matching.promptHtml || matching.prompt)) {
    elMatchingHeading.innerHTML = matching.promptHtml || matching.prompt;
    // Check if content is actually present after setting
    const hasContent = elMatchingHeading.textContent.trim().length > 0;
    if (!hasContent && elMatchingHeader) {
      elMatchingHeader.style.display = 'none';
    }
  } else {
    // Hide header if no prompt data
    if (elMatchingHeader) {
      elMatchingHeader.style.display = 'none';
    }
  }
  
  // Selection state - initialize with persisted answers if available
  const selectedByItemIdx = matching.items.map((_, idx) => {
    if (persistedAnswers && persistedAnswers[idx] !== undefined) {
      return persistedAnswers[idx];
    }
    return '';
  });
  
  let activeCardIndex = null; // Index of currently active card
  let horizontalCardsInstance = null;
  
  // Track usage counts for answer choices
  const totalCounts = new Map();
  matching.choices.forEach(c => totalCounts.set(c, (totalCounts.get(c) || 0) + 1));
  
  // Get used counts (excluding a specific item index)
  function getUsedCounts(exceptIdx) {
    const used = new Map();
    selectedByItemIdx.forEach((val, i) => {
      if (val && i !== exceptIdx) {
        used.set(val, (used.get(val) || 0) + 1);
      }
    });
    return used;
  }
  
  // Check if a choice is available
  function isChoiceAvailable(choice, exceptIdx) {
    const used = getUsedCounts(exceptIdx);
    const total = totalCounts.get(choice) || 0;
    const usedCount = used.get(choice) || 0;
    return usedCount < total;
  }
  
  // Create action HTML for a card
  function createActionHtml(itemIndex) {
    const selected = selectedByItemIdx[itemIndex];
    if (selected) {
      return `<div class="matching-selection-area matched button button-primary body-large" data-item-index="${itemIndex}">${selected}</div>`;
    } else {
      return `<div class="matching-selection-area empty body-xxsmall" data-item-index="${itemIndex}">Best response</div>`;
    }
  }
  
  // Build cards data for HorizontalCards component
  function buildCardsData() {
    return matching.items.map((item, idx) => {
      // Extract title from item text (e.g., "**Subtle Cue 1**: ..." -> "Subtle Cue 1")
      let title = '';
      const titleMatch = item.text.match(/\*\*([^*]+)\*\*/);
      if (titleMatch) {
        title = titleMatch[1];
      } else {
        // Fallback: use "Item 1", "Item 2", etc.
        title = `Item ${idx + 1}`;
      }
      
      // Remove title from description
      // Since item.textHtml is HTML, we need to remove the HTML version of the title
      let description = item.textHtml || item.text;
      if (titleMatch && title) {
        // Escape the title text for regex (handle special regex characters)
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Remove the HTML version from HTML text
        // Match patterns like: <p><strong>Subtle Cue 1</strong>: or <strong>Subtle Cue 1</strong>:
        const htmlPatterns = [
          new RegExp(`<p>\\s*<strong>${escapedTitle}</strong>\\s*:\\s*`, 'gi'),
          new RegExp(`<strong>${escapedTitle}</strong>\\s*:\\s*`, 'gi')
        ];
        
        htmlPatterns.forEach(pattern => {
          description = description.replace(pattern, '');
        });
        
        // Also remove the markdown version if we're using raw text
        if (!item.textHtml) {
          description = description.replace(new RegExp(`\\*\\*${escapedTitle}\\*\\*:\\s*`), '');
        }
        
        // Clean up empty paragraph tags and whitespace
        description = description.replace(/^<p>\s*<\/p>\s*/i, '');
        description = description.trim();
      }
      
      return {
        title: title,
        description: description,
        actionHtml: createActionHtml(idx)
      };
    });
  }
  
  // Initialize HorizontalCards component
  function initializeCards() {
    const cardsData = buildCardsData();
    
    horizontalCardsInstance = new HorizontalCards('#matching-cards-container', {
      cards: cardsData,
      onCardChange: (index, card) => {
        // Update active card index
        activeCardIndex = index;
        updateChoicesDisplay();
        updateSelectionAreaListeners();
      }
    });
    
    // Add click handlers to selection areas after cards are created
    setTimeout(() => {
      updateSelectionAreaListeners();
    }, 100);
  }
  
  // Update selection area listeners
  function updateSelectionAreaListeners() {
    const selectionAreas = elMatchingCardsContainer.querySelectorAll('.matching-selection-area');
    selectionAreas.forEach(area => {
      // Remove existing listeners by cloning
      const newArea = area.cloneNode(true);
      area.parentNode.replaceChild(newArea, area);
      
      const itemIndex = parseInt(newArea.getAttribute('data-item-index'), 10);
      
      newArea.addEventListener('click', () => {
        if (selectedByItemIdx[itemIndex]) {
          // Clear selection
          setSelection(itemIndex, '');
        } else {
          // Activate this card (scroll to it if needed, and set as active)
          if (horizontalCardsInstance) {
            const currentIndex = horizontalCardsInstance.getCurrentIndex();
            if (currentIndex !== itemIndex) {
              horizontalCardsInstance.scrollToIndex(itemIndex);
            }
          }
          activeCardIndex = itemIndex;
          updateChoicesDisplay();
        }
      });
      
      newArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          newArea.click();
        }
      });
      
      // Make focusable
      newArea.setAttribute('tabindex', '0');
      newArea.setAttribute('role', 'button');
      newArea.setAttribute('aria-label', `Selection area for ${itemIndex + 1}`);
    });
  }
  
  // Render answer choices at bottom
  function renderChoices() {
    elMatchingChoices.innerHTML = '';
    matching.choices.forEach((choice, idx) => {
      const choiceButton = document.createElement('button');
      choiceButton.className = 'matching-choice-button button button-primary body-large';
      choiceButton.textContent = choice;
      choiceButton.setAttribute('role', 'option');
      choiceButton.setAttribute('aria-label', `Select ${choice}`);
      
      // Check if this choice is available
      const available = isChoiceAvailable(choice, activeCardIndex);
      if (!available) {
        choiceButton.classList.add('used');
        choiceButton.disabled = true;
      }
      
      choiceButton.addEventListener('click', () => {
        // If there's an active card, use it; otherwise get the currently highlighted card
        let targetIndex = activeCardIndex;
        if (targetIndex === null && horizontalCardsInstance) {
          targetIndex = horizontalCardsInstance.getCurrentIndex();
        }
        
        if (targetIndex !== null && targetIndex >= 0 && targetIndex < matching.items.length) {
          // Re-check availability for the target index
          const isAvailable = isChoiceAvailable(choice, targetIndex);
          if (isAvailable) {
            setSelection(targetIndex, choice);
          }
        }
      });
      
      elMatchingChoices.appendChild(choiceButton);
    });
  }
  
  // Update choices display (enable/disable based on active card)
  function updateChoicesDisplay() {
    const choiceButtons = elMatchingChoices.querySelectorAll('.matching-choice-button');
    
    // Get the current active card index (either explicitly set or from horizontal-cards)
    let currentActiveIndex = activeCardIndex;
    if (currentActiveIndex === null && horizontalCardsInstance) {
      currentActiveIndex = horizontalCardsInstance.getCurrentIndex();
    }
    
    choiceButtons.forEach((button, idx) => {
      const choice = matching.choices[idx];
      const available = isChoiceAvailable(choice, currentActiveIndex);
      
      if (!available) {
        button.classList.add('used');
        button.disabled = true;
      } else {
        button.classList.remove('used');
        button.disabled = false;
      }
    });
  }
  
  // Set selection for an item
  function setSelection(idx, choice) {
    selectedByItemIdx[idx] = choice;
    
    // Deactivate card
    activeCardIndex = null;
    
    // Update the card's selection area directly in the DOM (avoid rebuilding to prevent jumpiness)
    const selectionArea = elMatchingCardsContainer.querySelector(`.matching-selection-area[data-item-index="${idx}"]`);
    if (selectionArea) {
      if (choice) {
        selectionArea.textContent = choice;
        // Remove empty state classes
        selectionArea.classList.remove('empty', 'body-xxsmall');
        // Add matched state classes (button styling)
        selectionArea.classList.add('matched', 'button', 'button-primary', 'body-large');
      } else {
        selectionArea.textContent = 'Best response';
        // Remove matched state classes
        selectionArea.classList.remove('matched', 'button', 'button-primary', 'body-large');
        // Add empty state classes
        selectionArea.classList.add('empty', 'body-xxsmall');
      }
    }
    
    updateChoicesDisplay();
    updateResultsAndPost();
    
    // Auto-scroll to next unanswered card if selection was made
    if (choice && horizontalCardsInstance) {
      setTimeout(() => {
        // Find next unanswered card
        let nextIndex = -1;
        for (let i = idx + 1; i < matching.items.length; i++) {
          if (!selectedByItemIdx[i] || !selectedByItemIdx[i].trim()) {
            nextIndex = i;
            break;
          }
        }
        
        // If no unanswered card after current, find first unanswered
        if (nextIndex === -1) {
          for (let i = 0; i < idx; i++) {
            if (!selectedByItemIdx[i] || !selectedByItemIdx[i].trim()) {
              nextIndex = i;
              break;
            }
          }
        }
        
        if (nextIndex !== -1 && horizontalCardsInstance) {
          horizontalCardsInstance.scrollToIndex(nextIndex);
        }
      }, 300);
    }
  }
  
  // Update results and post
  function updateResultsAndPost() {
    state.results = [];
    matching.items.forEach((item, idx) => {
      const selected = selectedByItemIdx[idx] || '';
      const correct = item.answer || '';
      state.results.push({
        text: `Item ${idx + 1}`,
        selected: selected,
        correct: correct
      });
    });
    state.index = selectedByItemIdx.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    postResults();
  }
  
  // Initial render
  initializeCards();
  renderChoices();
  
  // Sync state with persisted answers if they exist
  if (persistedAnswers) {
    setTimeout(() => {
      // Rebuild cards to show persisted selections
      if (horizontalCardsInstance) {
        horizontalCardsInstance.destroy();
        initializeCards();
      }
      updateResultsAndPost();
    }, 100);
  }
  
  // Center the first unanswered card on initial load
  setTimeout(() => {
    let cardToCenter = 0;
    for (let i = 0; i < matching.items.length; i++) {
      if (!selectedByItemIdx[i] || !selectedByItemIdx[i].trim()) {
        cardToCenter = i;
        break;
      }
    }
    
    if (horizontalCardsInstance) {
      horizontalCardsInstance.scrollToIndex(cardToCenter);
    }
  }, 200);
  
  // Clear all answers function
  function clearAllAnswers() {
    // Clear all selections
    matching.items.forEach((_, idx) => {
      selectedByItemIdx[idx] = '';
    });
    activeCardIndex = null;
    
    // Rebuild cards
    if (horizontalCardsInstance) {
      horizontalCardsInstance.destroy();
      initializeCards();
    }
    
    updateChoicesDisplay();
    updateResultsAndPost();
    
    // Scroll back to first card
    setTimeout(() => {
      if (horizontalCardsInstance) {
        horizontalCardsInstance.scrollToIndex(0);
      }
    }, 100);
  }
  
  // Register "Clear All" tool in global toolbar
  toolbar.registerTool('matching-clear-all', {
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
      toolbar.unregisterTool('matching-clear-all');
      if (horizontalCardsInstance) {
        horizontalCardsInstance.destroy();
      }
      elContainer.innerHTML = '';
    }
  };
}
