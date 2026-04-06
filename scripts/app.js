window.addEventListener('touchmove', (e) => {
  if (e.touches && e.touches.length > 1) return; // allow pinch-zoom

  // When a dialog is open, block page rubber-banding so the dialog doesn't
  // shift. Allow gestures inside the dialog's own scrollable content.
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog) {
    const dlgScroll = e.target.closest('.modal');
    if (dlgScroll && dlgScroll.scrollHeight > dlgScroll.clientHeight) return;
    e.preventDefault();
    return;
  }

  // Use visualViewport.height (not clientHeight) — on iPhone, clientHeight
  // excludes the Safari browser chrome so the page always appears "scrollable"
  // even when it isn't. visualViewport.height reflects the true visible area.
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );
  if (scrollHeight - viewportHeight < 2) {
    e.preventDefault();
  }
}, { passive: false, capture: true });

// Suppress iOS drag-preview on links (the floating link icon on long-press).
// -webkit-touch-callout:none handles the callout sheet; this handles the drag.
document.addEventListener('dragstart', (e) => {
  if (e.target.closest('a')) e.preventDefault();
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    const isNestedPage = window.location.pathname.includes('/pages/');
    const swPath = isNestedPage ? '../sw.js' : './sw.js';
    const swScope = isNestedPage ? '../' : './';

    navigator.serviceWorker.register(swPath, { scope: swScope }).catch(() => {
      // Keep this silent in production UI; PWA is progressive enhancement.
    });
  });
}

window.EncodrValidation = (function () {
  function ensureFieldErrorEl(baseEl, kind) {
    if (!baseEl || !baseEl.id) return null;
    var id = baseEl.id + '-' + kind + '-error';
    var existing = document.getElementById(id);
    if (existing) return existing;

    var el = document.createElement('div');
    el.id = id;
    el.className = 'q-field-error';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;

    if (baseEl.parentNode) {
      baseEl.parentNode.insertBefore(el, baseEl.nextSibling);
    }
    return el;
  }

  function setInputError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add('q-input-invalid');
    inputEl.setAttribute('aria-invalid', 'true');
    var err = ensureFieldErrorEl(inputEl, 'input');
    if (!err) return;
    err.textContent = message;
    err.hidden = false;
  }

  function clearInputError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('q-input-invalid');
    inputEl.removeAttribute('aria-invalid');
    if (!inputEl.id) return;
    var err = document.getElementById(inputEl.id + '-input-error');
    if (!err) return;
    err.textContent = '';
    err.hidden = true;
  }

  function setGroupError(groupEl, message) {
    if (!groupEl) return;
    groupEl.classList.add('q-choice-invalid');
    var err = ensureFieldErrorEl(groupEl, 'group');
    if (!err) return;
    err.textContent = message;
    err.hidden = false;
  }

  function clearGroupError(groupEl) {
    if (!groupEl) return;
    groupEl.classList.remove('q-choice-invalid');
    if (!groupEl.id) return;
    var err = document.getElementById(groupEl.id + '-group-error');
    if (!err) return;
    err.textContent = '';
    err.hidden = true;
  }

  function ensureSummaryEl(submitButtonId) {
    var btn = document.getElementById(submitButtonId);
    if (!btn || !btn.parentElement) return null;
    var host = btn.parentElement;
    var el = host.querySelector('.quiz-validation-msg');
    if (el) return el;

    el = document.createElement('div');
    el.className = 'quiz-validation-msg';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    host.appendChild(el);
    return el;
  }

  function setSummary(submitButtonId, message) {
    var el = ensureSummaryEl(submitButtonId);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function clearSummary(submitButtonId) {
    var el = ensureSummaryEl(submitButtonId);
    if (!el) return;
    el.textContent = '';
    el.hidden = true;
  }

  function maybeClearSummary(submitButtonId) {
    var hasInvalid = !!document.querySelector('.q-input-invalid, .q-choice-invalid');
    if (!hasInvalid) clearSummary(submitButtonId);
  }

  function clearAllSummaries() {
    document.querySelectorAll('.quiz-validation-msg').forEach(function (el) {
      el.textContent = '';
      el.hidden = true;
    });
  }

  // Global fallback: if a user edits an invalid field, clear its visible error
  // immediately; submit-time validators will re-flag if still invalid.
  document.addEventListener('input', function (event) {
    var target = event.target;
    if (!target || typeof target.matches !== 'function') return;
    if (target.matches('input, textarea') && target.classList.contains('q-input-invalid')) {
      clearInputError(target);
      if (!document.querySelector('.q-input-invalid, .q-choice-invalid')) {
        clearAllSummaries();
      }
    }
  }, true);

  // Global fallback for invalid choice groups (e.g., yes/no toggles).
  document.addEventListener('click', function (event) {
    var trigger = event.target;
    if (!trigger || typeof trigger.closest !== 'function') return;
    var group = trigger.closest('.q-choice-invalid');
    if (!group) return;
    clearGroupError(group);
    if (!document.querySelector('.q-input-invalid, .q-choice-invalid')) {
      clearAllSummaries();
    }
  }, true);

  return {
    setInputError: setInputError,
    clearInputError: clearInputError,
    setGroupError: setGroupError,
    clearGroupError: clearGroupError,
    setSummary: setSummary,
    clearSummary: clearSummary,
    maybeClearSummary: maybeClearSummary,
    clearAllSummaries: clearAllSummaries
  };
})();