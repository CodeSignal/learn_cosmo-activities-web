export function initSort({ items, labels, state, postResults }) {
  const elContainer = document.getElementById('activity-container');
  
  // Create the sort container
  elContainer.innerHTML = `
    <div id="sort" class="sort">
      <div class="dropzones">
        <div class="dropzone" data-box="first">
          <div class="dz-title" id="box1-title"></div>
          <div class="dz-body" id="box1-body"></div>
        </div>
        <div class="dropzone" data-box="second">
          <div class="dz-title" id="box2-title"></div>
          <div class="dz-body" id="box2-body"></div>
        </div>
      </div>
      <div class="pool">
        <div class="pool-title">Items</div>
        <div id="pool-body" class="pool-body"></div>
      </div>
    </div>
  `;
  
  const elSort = document.getElementById('sort');
  const elBox1Title = document.getElementById('box1-title');
  const elBox2Title = document.getElementById('box2-title');
  const elBox1Body = document.getElementById('box1-body');
  const elBox2Body = document.getElementById('box2-body');
  const elPoolBody = document.getElementById('pool-body');

  elBox1Title.textContent = labels.first || 'First Box';
  elBox2Title.textContent = labels.second || 'Second Box';
  elBox1Body.innerHTML = '';
  elBox2Body.innerHTML = '';
  elPoolBody.innerHTML = '';

  items.forEach((item, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = item.text;
    // Note: No longer using draggable attribute - using custom mouse-based drag
    chip.dataset.index = String(idx);
    elPoolBody.appendChild(chip);
  });

  let dragStarted = false;
  let currentSide = null; // Track which side we're on: 'left' or 'right'
  let customDragElement = null;
  let dragOffset = { x: 0, y: 0 };

  function createDragImageWithRotation(target, rotation) {
    // Create a container for the drag image
    const dragContainer = document.createElement('div');
    dragContainer.style.position = 'absolute';
    dragContainer.style.top = '-1000px';
    dragContainer.style.left = '-1000px';
    dragContainer.style.pointerEvents = 'none';
    
    // Create the rotated content inside the container
    const dragContent = target.cloneNode(true);
    dragContent.style.transform = `scale(0.98) rotate(${rotation})`;
    dragContent.style.borderRadius = '0.5rem';
    dragContent.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
    
    dragContainer.appendChild(dragContent);
    document.body.appendChild(dragContainer);
    
    // Force a reflow to ensure styles are applied
    dragContainer.offsetHeight;
    
    return dragContainer;
  }

  function onMouseDown(e) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('chip')) return;
    
    e.preventDefault(); // Prevent default drag
    
    dragStarted = true;
    currentSide = null;
    
    // Add dragging state to disable chip hover effects
    document.body.classList.add('is-dragging');
    
    // Calculate drag offset
    const rect = target.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    // Create custom drag element
    customDragElement = document.createElement('div');
    customDragElement.style.position = 'fixed';
    customDragElement.style.pointerEvents = 'none';
    customDragElement.style.zIndex = '10000';
    customDragElement.style.opacity = '0.9';
    customDragElement.style.transform = 'scale(0.98)';
    customDragElement.style.transition = 'transform 0.1s ease-out';
    
    // Clone the content
    const dragContent = target.cloneNode(true);
    dragContent.style.borderRadius = '0.5rem';
    dragContent.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
    customDragElement.appendChild(dragContent);
    
    // Position at mouse
    customDragElement.style.left = (e.clientX - dragOffset.x) + 'px';
    customDragElement.style.top = (e.clientY - dragOffset.y) + 'px';
    
    document.body.appendChild(customDragElement);
    
    // Mark original as dragging
    target.classList.add('dragging');
    
    // Add mouse move and up listeners
    document.addEventListener('mousemove', onCustomDragMove);
    document.addEventListener('mouseup', onCustomDragEnd);
    
    // Store reference to dragged element
    customDragElement.dataset.originalIndex = target.dataset.index || '';
  }
  
  function onCustomDragEnd(e) {
    if (!dragStarted) return;
    
    // Find drop target
    const elementsBelow = document.elementsFromPoint(e.clientX, e.clientY);
    const dropZone = elementsBelow.find(el => el.closest('.dropzone'));
    
    if (dropZone) {
      const actualDropZone = dropZone.closest('.dropzone');
      const dzBody = actualDropZone.querySelector('.dz-body');
      
      // Find the original dragged element
      const originalElement = document.querySelector('.chip.dragging');
      if (originalElement && dzBody) {
        dzBody.appendChild(originalElement);
        checkCompletion();
      }
    }
    
    // Clean up
    if (customDragElement && customDragElement.parentNode) {
      customDragElement.parentNode.removeChild(customDragElement);
      customDragElement = null;
    }
    
    // Remove dragging class from all elements
    document.querySelectorAll('.chip.dragging').forEach(chip => {
      chip.classList.remove('dragging');
    });
    
    // Remove all dropzone highlighting
    document.querySelectorAll('.dropzone.over').forEach(dz => {
      dz.classList.remove('over');
    });
    
    // Remove event listeners
    document.removeEventListener('mousemove', onCustomDragMove);
    document.removeEventListener('mouseup', onCustomDragEnd);
    
    // Remove dragging state to re-enable chip hover effects
    document.body.classList.remove('is-dragging');
    
    // Reset state
    dragStarted = false;
    currentSide = null;
  }

  function onCustomDragMove(e) {
    if (!dragStarted || !customDragElement) return;
    
    // Update position
    customDragElement.style.left = (e.clientX - dragOffset.x) + 'px';
    customDragElement.style.top = (e.clientY - dragOffset.y) + 'px';
    
    // Calculate rotation based on proximity to dropzones
    const dropzones = document.querySelectorAll('.dropzone');
    if (dropzones.length >= 2) {
      const leftBox = Array.from(dropzones).find(dz => dz.getAttribute('data-box') === 'first');
      const rightBox = Array.from(dropzones).find(dz => dz.getAttribute('data-box') === 'second');
      
      if (leftBox && rightBox) {
        const leftRect = leftBox.getBoundingClientRect();
        const rightRect = rightBox.getBoundingClientRect();
        const leftCenterX = leftRect.left + leftRect.width / 2;
        const rightCenterX = rightRect.left + rightRect.width / 2;
        
        const distanceToLeft = Math.abs(e.clientX - leftCenterX);
        const distanceToRight = Math.abs(e.clientX - rightCenterX);
        
        const newSide = distanceToLeft < distanceToRight ? 'left' : 'right';
        const rotation = newSide === 'left' ? '-8deg' : '8deg';
        
        // Apply rotation to the content
        const dragContent = customDragElement.firstChild;
        if (dragContent) {
          dragContent.style.transform = `scale(0.98) rotate(${rotation})`;
        }
        
        if (newSide !== currentSide) {
          console.log('Side changed from', currentSide, 'to', newSide);
          currentSide = newSide;
        }
      }
    }
    
    // Update dropzone highlighting
    const elementsBelow = document.elementsFromPoint(e.clientX, e.clientY);
    
    // Remove previous highlights
    document.querySelectorAll('.dropzone.over').forEach(dz => dz.classList.remove('over'));
    
    // Add highlight to current dropzone
    const dropZone = elementsBelow.find(el => el.closest('.dropzone'));
    if (dropZone) {
      const actualDropZone = dropZone.closest('.dropzone');
      actualDropZone.classList.add('over');
    }
  }
  
  // Note: Old HTML5 drag and drop functions removed - now using custom drag system

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

      return;
    }
    // evaluate and record results
    placed.forEach(chip => {
      const index = parseInt(chip.dataset.index || '-1', 10);
      const item = items[index];
      const parent = chip.parentElement;
      const inBox = parent === elBox1Body ? 'first' : parent === elBox2Body ? 'second' : 'pool';
      if (item) {
        state.results.push({
          text: item.text,
          selected: inBox,
          correct: item.correct
        });
      }
    });
    state.index = total;

    postResults();
  }



  // Note: No longer using HTML5 drag and drop events - using custom mouse-based drag
  // Use event delegation on the sort container to handle mouse events for all chips
  elSort.addEventListener('mousedown', onMouseDown);

  return () => {
    // Note: No longer using HTML5 drag and drop events - using custom mouse-based drag
    elSort.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onCustomDragMove);
    document.removeEventListener('mouseup', onCustomDragEnd);
    
    elContainer.innerHTML = ''; // Remove the dynamically created sort container
  };
}
