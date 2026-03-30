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


