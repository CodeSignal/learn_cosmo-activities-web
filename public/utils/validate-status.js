export const INCORRECT_ANSWER_TEXT = 'This answer is incorrect.';

export function setValidateStatus(hasIncorrect) {
  const el = document.getElementById('activity-status');
  if (!el) return;
  el.textContent = '';
  if (hasIncorrect) el.textContent = INCORRECT_ANSWER_TEXT;
}

export function setControlInvalid(el, errorId) {
  el.setAttribute('aria-invalid', 'true');
  if (errorId) el.setAttribute('aria-describedby', errorId);
}

export function clearControlInvalid(el) {
  el.removeAttribute('aria-invalid');
  el.removeAttribute('aria-describedby');
}

export function ensureErrorText(parent, id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('p');
    el.id = id;
    el.className = 'activity-error-text body-small';
    el.textContent = INCORRECT_ANSWER_TEXT;
    parent.appendChild(el);
  }
  return el;
}

export function removeErrorText(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
