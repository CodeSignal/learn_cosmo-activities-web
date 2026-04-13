import toolbar from '../components/toolbar.js';
import { detectQuoteBlockquotes } from '../design-system/typography/typography.js';
import { renderMath } from '../utils/katex-render.js';

export function initMatrix({
  activity,
  state,
  postResults,
  persistedAnswers = null,
  persistedExplanations = null,
  elContainer = document.getElementById('activity-container')
}) {
  const matrix = activity.matrix;

  if (!matrix || !matrix.rows || !matrix.columns || matrix.rows.length === 0) {
    elContainer.innerHTML = '<div class="error">No matrix data found</div>';
    return () => {
      elContainer.innerHTML = '';
    };
  }

  const { columns, rows, correctColumnIndexByRow, explainAnswer, explainAnswerLabel } = matrix;
  const colCount = columns.length;
  const rowCount = rows.length;

  /** @type {(number|null)[]} */
  const selectedColIndexByRow = rows.map((_, rowIdx) => {
    if (persistedAnswers && persistedAnswers[rowIdx] !== undefined) {
      const raw = persistedAnswers[rowIdx];
      const label = Array.isArray(raw) ? raw[0] : raw;
      if (typeof label === 'string') {
        const ci = columns.indexOf(label);
        return ci >= 0 ? ci : null;
      }
    }
    return null;
  });

  let explanationText =
    explainAnswer && persistedExplanations && persistedExplanations[0] !== undefined
      ? String(persistedExplanations[0])
      : '';

  let isValidating = false;

  elContainer.innerHTML = `
    <div class="matrix-root" id="matrix-root">
      <div class="matrix-question body-large" id="matrix-question"></div>
      <div class="box card non-interactive matrix-table-outer">
        <div class="matrix-table-scroll">
          <table class="matrix-table" id="matrix-table" role="grid" aria-label="Matrix question">
            <thead id="matrix-thead"></thead>
            <tbody id="matrix-tbody"></tbody>
          </table>
        </div>
      </div>
      <div class="matrix-explain-host" id="matrix-explain-host"></div>
    </div>
  `;

  const elQuestion = elContainer.querySelector('#matrix-question');
  const elThead = elContainer.querySelector('#matrix-thead');
  const elTbody = elContainer.querySelector('#matrix-tbody');
  const elExplainHost = elContainer.querySelector('#matrix-explain-host');

  const matrixHeading = matrix.heading;
  if (matrixHeading && (matrixHeading.html || matrixHeading.markdown)) {
    const headingEl = document.createElement('div');
    headingEl.className =
      'text-input-heading box non-interactive input-group text-input-question-text body-large markdown-content';
    if (matrixHeading.html) {
      headingEl.innerHTML = matrixHeading.html;
    } else {
      headingEl.textContent = matrixHeading.markdown;
    }
    renderMath(headingEl);
    elQuestion.insertAdjacentElement('beforebegin', headingEl);
  }

  if (activity.questionHtml) {
    elQuestion.classList.add('markdown-content');
    elQuestion.innerHTML = activity.questionHtml;
    renderMath(elQuestion);
  } else if (activity.question) {
    elQuestion.textContent = activity.question;
  }

  const headerRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.className = 'matrix-corner heading-xsmall';
  corner.setAttribute('scope', 'col');
  corner.textContent = '';
  headerRow.appendChild(corner);

  columns.forEach((col, cIdx) => {
    const th = document.createElement('th');
    th.className = 'heading-xsmall';
    th.setAttribute('scope', 'col');
    th.id = `matrix-col-${cIdx}`;
    th.textContent = col;
    headerRow.appendChild(th);
  });
  elThead.appendChild(headerRow);

  rows.forEach((rowLabel, rowIdx) => {
    const tr = document.createElement('tr');
    tr.dataset.rowIndex = String(rowIdx);

    const th = document.createElement('th');
    th.className = 'matrix-row-label body-large';
    th.setAttribute('scope', 'row');
    th.id = `matrix-row-${rowIdx}`;
    th.textContent = rowLabel;
    tr.appendChild(th);

    for (let cIdx = 0; cIdx < colCount; cIdx++) {
      const td = document.createElement('td');
      td.className = 'input-radio-cell';

      const label = document.createElement('label');
      label.className = 'input-radio';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `matrix-row-${rowIdx}`;
      input.value = String(cIdx);
      input.id = `matrix-r${rowIdx}-c${cIdx}`;

      const circle = document.createElement('span');
      circle.className = 'input-radio-circle';
      const dot = document.createElement('span');
      dot.className = 'input-radio-dot';
      circle.appendChild(dot);

      /* Same structure as design-system/components/input/test.html "Radio States" */
      const labelText = document.createElement('span');
      labelText.className = 'input-radio-label input-radio-label-sr-only';
      labelText.textContent = `${rowLabel}: ${columns[cIdx]}`;

      if (selectedColIndexByRow[rowIdx] === cIdx) {
        input.checked = true;
      }

      input.addEventListener('change', () => {
        if (input.checked) {
          clearValidation();
          selectedColIndexByRow[rowIdx] = cIdx;
          tr.querySelectorAll(`input[name="matrix-row-${rowIdx}"]`).forEach(r => {
            if (r !== input) r.checked = false;
          });
          updateResultsAndPost();
        }
      });

      label.appendChild(input);
      label.appendChild(circle);
      label.appendChild(labelText);

      const wrap = document.createElement('div');
      wrap.className = 'input-radio-wrapper';
      wrap.appendChild(label);
      td.appendChild(wrap);
      tr.appendChild(td);
    }

    elTbody.appendChild(tr);
  });

  if (explainAnswer) {
    const explainPrompt =
      explainAnswerLabel && String(explainAnswerLabel).trim()
        ? String(explainAnswerLabel).trim()
        : 'Explain your answer';

    const wrap = document.createElement('div');
    wrap.className = 'matrix-explain-container';

    const lbl = document.createElement('label');
    lbl.className = 'body-large';
    lbl.textContent = explainPrompt;
    lbl.setAttribute('for', 'matrix-explain-textarea');

    const ta = document.createElement('textarea');
    ta.id = 'matrix-explain-textarea';
    ta.className = 'input matrix-explain-textarea';
    ta.placeholder = 'Enter your explanation...';
    ta.rows = 4;
    ta.value = explanationText;
    ta.setAttribute('aria-label', explainPrompt);

    explanationText = ta.value;
    ta.addEventListener('input', () => {
      explanationText = ta.value;
      updateResultsAndPost();
    });

    wrap.appendChild(lbl);
    wrap.appendChild(ta);
    elExplainHost.appendChild(wrap);
  }

  detectQuoteBlockquotes(elContainer.querySelector('#matrix-root'));

  function clearValidation() {
    if (!isValidating) return;
    isValidating = false;
    elTbody.querySelectorAll('tr').forEach(tr => {
      tr.classList.remove('matrix-row-incorrect');
    });
  }

  function validateAnswers() {
    isValidating = true;
    elTbody.querySelectorAll('tr').forEach((tr, idx) => {
      const sel = selectedColIndexByRow[idx];
      const correctIdx = correctColumnIndexByRow[idx];
      const ok = sel !== null && sel !== undefined && sel === correctIdx;
      tr.classList.toggle('matrix-row-incorrect', !ok);
    });
  }

  function updateResultsAndPost() {
    state.results = rows.map((rowLabel, rowIdx) => {
      const selIdx = selectedColIndexByRow[rowIdx];
      const selectedLabel = selIdx !== null && selIdx !== undefined ? columns[selIdx] : '';
      const correctIdx = correctColumnIndexByRow[rowIdx];
      const correctLabel = columns[correctIdx] ?? '';

      const result = {
        text: `Row ${rowIdx + 1}`,
        selected: selectedLabel,
        correct: correctLabel,
        isCorrect: Boolean(selectedLabel) && selectedLabel === correctLabel
      };

      if (explainAnswer && rowIdx === 0 && explanationText && explanationText.trim()) {
        result.explanation = explanationText.trim();
      }

      return result;
    });

    state.index = selectedColIndexByRow.filter(v => v !== null && v !== undefined).length;
    postResults();
  }

  function clearAllAnswers() {
    for (let i = 0; i < rowCount; i++) {
      selectedColIndexByRow[i] = null;
    }
    elTbody.querySelectorAll('input[type="radio"]').forEach(inp => {
      inp.checked = false;
    });
    explanationText = '';
    const ta = elContainer.querySelector('#matrix-explain-textarea');
    if (ta) ta.value = '';
    clearValidation();
    updateResultsAndPost();
  }

  updateResultsAndPost();

  toolbar.registerTool('matrix-clear-all', {
    icon: 'icon-eraser',
    title: 'Clear All',
    onClick: e => {
      e.preventDefault();
      clearAllAnswers();
    },
    enabled: true
  });

  return {
    cleanup: () => {
      toolbar.unregisterTool('matrix-clear-all');
      elContainer.innerHTML = '';
    },
    validate: validateAnswers
  };
}
