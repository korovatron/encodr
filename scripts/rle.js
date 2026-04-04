(function () {
  var MAX_INPUT_CHARS = 200;

  var RUN_COLOURS = [
    '#ff6b6b', '#ffd166', '#06d6a0', '#118ab2',
    '#a78bfa', '#f97316', '#ec4899', '#14b8a6',
    '#84cc16', '#f59e0b', '#6366f1', '#10b981'
  ];

  function byId(id) { return document.getElementById(id); }

  function setText(id, value) {
    var el = byId(id);
    if (el) el.textContent = String(value);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function symbolLabel(ch) {
    if (ch === ' ')  return '\u00b7';  // middle dot for space
    if (ch === '\n') return '\u21b5';  // return arrow for newline
    if (ch === '\t') return '\u2192';  // right arrow for tab
    return ch;
  }

  // ---------- Core RLE algorithm ----------
  function runLengthEncode(text) {
    var runs = [];
    if (!text.length) return runs;
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      var count = 1;
      while (i + count < text.length && text[i + count] === ch) {
        count++;
      }
      runs.push({ symbol: ch, count: count });
      i += count;
    }
    return runs;
  }

  function formatPairs(runs) {
    return runs.map(function (r) {
      return '(' + r.symbol + ', ' + r.count + ')';
    }).join('  ');
  }

  // ---------- Visual run strip ----------
  function renderVisual(runs) {
    var host = byId('rle-visual');
    if (!host) return;

    if (!runs.length) {
      host.innerHTML = '<span class="rle-empty-hint">Enter some text above to see the run breakdown.</span>';
      return;
    }

    var html = runs.map(function (run, idx) {
      var colour = RUN_COLOURS[idx % RUN_COLOURS.length];
      var bg = colour + '1a';
      var displaySym = escapeHtml(symbolLabel(run.symbol));
      var pairText = '(' + escapeHtml(run.symbol === ' ' ? '\u00b7' : run.symbol) + ', ' + run.count + ')';
      return (
        '<div class="rle-run-block" style="flex:' + run.count + ' 0 42px;border-color:' + colour + ';background:' + bg + '">' +
          '<span class="rle-run-sym">' + displaySym + '</span>' +
          '<span class="rle-run-cnt">&times;' + run.count + '</span>' +
          '<span class="rle-run-pair">' + pairText + '</span>' +
        '</div>'
      );
    }).join('');

    host.innerHTML = html;
  }

  // ---------- Main render ----------
  function renderAll() {
    var inputEl  = byId('rle-input');
    var encodedEl = byId('rle-encoded');
    if (!inputEl || !encodedEl) return;

    var text = inputEl.value || '';
    if (text.length > MAX_INPUT_CHARS) {
      text = text.slice(0, MAX_INPUT_CHARS);
      inputEl.value = text;
    }

    if (!text.length) {
      encodedEl.textContent = 'Encoded pairs will appear here.';
      setText('rle-input-len', 0);
      setText('rle-pairs-count', 0);
      setText('rle-net-size', '0');
      var noteEl = byId('rle-net-note');
      if (noteEl) { noteEl.textContent = '\u2014'; noteEl.style.color = ''; }
      var netEl = byId('rle-net-size');
      if (netEl) netEl.style.color = '';
      renderVisual([]);
      return;
    }

    var runs       = runLengthEncode(text);
    var inputLen   = text.length;
    var encodedLen = runs.length * 2;  // symbol + count per pair
    var saving     = inputLen - encodedLen;

    encodedEl.textContent = formatPairs(runs);
    setText('rle-input-len', inputLen);
    setText('rle-pairs-count', runs.length);
    setText('rle-net-size', (saving >= 0 ? '+' : '') + saving);

    var noteEl = byId('rle-net-note');

    if (saving > 0) {
      if (noteEl)  noteEl.textContent = 'compressed by ' + saving + ' unit' + (saving === 1 ? '' : 's');
    } else if (saving < 0) {
      if (noteEl)  noteEl.textContent = 'expanded by ' + Math.abs(saving) + ' unit' + (Math.abs(saving) === 1 ? '' : 's');
    } else {
      if (noteEl)  noteEl.textContent = 'no change';
    }

    renderVisual(runs);
  }

  // ---------- Tab switching ----------
  // ---------- Sample presets ----------
  var SAMPLES = {
    colors: 'BBGGGRRRRW',
    text:   'AAARRRRGGGHH',
    altseq: 'ABCDEFGHIJ'
  };

  function wireSamples() {
    var inputEl = byId('rle-input');
    if (!inputEl) return;
    var btns = Array.from(document.querySelectorAll('[data-rle-sample]'));

    function setActive(key) {
      btns.forEach(function (b) {
        b.classList.toggle('btn-submit', b.getAttribute('data-rle-sample') === key);
      });
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-rle-sample');
        if (key === 'clear') {
          setActive(null);
          inputEl.value = '';
          renderAll();
          inputEl.focus();
          return;
        }
        if (Object.prototype.hasOwnProperty.call(SAMPLES, key)) {
          setActive(key);
          inputEl.value = SAMPLES[key];
          renderAll();
          inputEl.focus();
        }
      });
    });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', function () {
    var inputEl  = byId('rle-input');
    if (!inputEl) return;

    inputEl.value = SAMPLES.colors;
    inputEl.addEventListener('input', renderAll);

    wireSamples();
    renderAll();
  });
})();
