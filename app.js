// Track swipe direction for pull-to-refresh detection
let _touchStartY = 0;
window.addEventListener('touchstart', (e) => {
  _touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (e.touches && e.touches.length > 1) return; // allow pinch-zoom

  // When a dialog is open, block ALL page touchmoves to prevent the iOS
  // rubber-band effect from visually nudging the dialog. Only allow the
  // gesture through if it's inside the dialog's own scrollable content.
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog) {
    const dlgScroll = e.target.closest('.modal');
    if (dlgScroll && dlgScroll.scrollHeight > dlgScroll.clientHeight) return;
    e.preventDefault();
    return;
  }

  const dy = e.touches[0].clientY - _touchStartY;

  // Prevent pull-to-refresh: downward swipe when already at the very top.
  // This catches it even when scrollHeight exceeds clientHeight by a
  // fractional pixel (rounding issue in the simple <= comparison).
  if (dy > 0 && window.scrollY <= 0) {
    e.preventDefault();
    return;
  }

  // Prevent rubber-band on pages with no meaningful scroll room (+1px tolerance).
  if (document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1) {
    e.preventDefault();
  }
}, { passive: false, capture: true });
