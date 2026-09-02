import { renderMath } from './katex-render.js';

export const ACTIVITY_TYPE_NAME = {
  fib: 'Fill in the blanks',
  matching: 'Matching',
  matrix: 'Matrix',
  mcq: 'Multiple Choice',
  textInput: 'Text Input',
  sort: 'Sort into Boxes'
};

const AUTHORED_HEADING_CLASS =
  'text-input-heading box non-interactive input-group text-input-question-text body-large markdown-content';

function hasAuthoredHeading(heading) {
  return !!(heading && (heading.html || heading.markdown));
}

function fillAuthoredHeading(el, heading) {
  if (heading.html) {
    el.innerHTML = heading.html;
    if (el.children.length === 1 && el.firstElementChild.tagName === 'P') {
      el.replaceChildren(...el.firstElementChild.childNodes);
    }
  } else {
    el.textContent = heading.markdown;
  }
  renderMath(el);
}

/**
 * Mount one activity `h2`. Authored `heading` wins; otherwise the P10 type name.
 */
export function mountActivityHeading({ parent, heading, fallback, className = AUTHORED_HEADING_CLASS, before = null }) {
  const el = document.createElement('h2');
  if (hasAuthoredHeading(heading)) {
    el.className = className;
    fillAuthoredHeading(el, heading);
  } else {
    el.className = 'activity-type-heading heading-xsmall';
    el.textContent = fallback;
  }
  if (before) parent.insertBefore(el, before);
  else parent.appendChild(el);
  return el;
}
