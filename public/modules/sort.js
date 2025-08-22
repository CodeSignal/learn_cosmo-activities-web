export function initSort({ items, labels, state, updateHud, postResults }) {
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
    updateHud();
    postResults();
  }

  [elBox1Body, elBox2Body, elPoolBody].forEach(zone => {
    zone.addEventListener('dragover', onDragOver);
    zone.addEventListener('dragleave', onDragLeave);
    zone.addEventListener('drop', onDrop);
  });
  elPoolBody.addEventListener('dragstart', onDragStart);
  elPoolBody.addEventListener('dragend', onDragEnd);

  return () => {
    [elBox1Body, elBox2Body, elPoolBody].forEach(zone => {
      zone.removeEventListener('dragover', onDragOver);
      zone.removeEventListener('dragleave', onDragLeave);
      zone.removeEventListener('drop', onDrop);
    });
    elPoolBody.removeEventListener('dragstart', onDragStart);
    elPoolBody.removeEventListener('dragend', onDragEnd);
    elContainer.innerHTML = ''; // Remove the dynamically created sort container
  };
}
