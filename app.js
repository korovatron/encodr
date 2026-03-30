// Suppress pull-to-refresh and rubber-band bounce when the page has no
// scrollable overflow. Allows normal scroll + edge bounce on longer pages.
window.addEventListener('touchmove', (e) => {
  if (e.touches && e.touches.length > 1) return; // allow pinch-zoom
  // Allow scroll inside an open <dialog> (it manages its own scroll)
  if (document.querySelector('dialog[open]')) return;
  if (document.documentElement.scrollHeight <= document.documentElement.clientHeight) {
    e.preventDefault();
  }
}, { passive: false, capture: true });
