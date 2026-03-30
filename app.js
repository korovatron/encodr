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

  // Page has no meaningful scroll room: block all rubber-banding.
  // Use a 2px tolerance for sub-pixel rounding differences across devices.
  // Scrollable pages fall through and get native iOS behaviour.
  const root = document.documentElement;
  if (root.scrollHeight - root.clientHeight < 2) {
    e.preventDefault();
  }
}, { passive: false, capture: true });

