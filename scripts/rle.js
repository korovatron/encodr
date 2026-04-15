(function () {
  var MAX_INPUT_CHARS = 200;
  var Quiz = {
    mode: 'mixed',
    current: null,
    questionNo: 0,
    correct: 0,
    wrong: 0,
    total: 0,
    locked: false,
    initialized: false,
    selectedEffect: '',
    gridState: []
  };

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

  function buildExampleGridHtml(cols, grid) {
    var html = '<div class="rle-bmp-example" style="grid-template-columns:repeat(' + cols + ',20px)">';
    for (var i = 0; i < grid.length; i++) {
      html += '<span class="rle-bmp-ex-cell ' + grid[i].toLowerCase() + '"></span>';
    }
    html += '</div>';
    return html;
  }

  function buildBitmapGrid(cols, rows) {
    var container = byId('rle-bitmap-grid-container');
    if (!container) return;
    Quiz.gridState = [];
    for (var i = 0; i < rows * cols; i++) Quiz.gridState.push('W');
    var grid = document.createElement('div');
    grid.className = 'rle-bitmap-grid';
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Bitmap grid, ' + cols + ' columns by ' + rows + ' rows');
    for (var i = 0; i < rows * cols; i++) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'rle-pixel w';
      cell.setAttribute('data-idx', String(i));
      cell.setAttribute('aria-pressed', 'false');
      cell.setAttribute('aria-label', 'Row ' + (Math.floor(i / cols) + 1) + ' col ' + (i % cols + 1));
      cell.addEventListener('click', function () {
        if (Quiz.locked) return;
        var idx = parseInt(this.getAttribute('data-idx'), 10);
        var newColor = Quiz.gridState[idx] === 'B' ? 'W' : 'B';
        Quiz.gridState[idx] = newColor;
        this.className = 'rle-pixel ' + newColor.toLowerCase();
        this.setAttribute('aria-pressed', newColor === 'B' ? 'true' : 'false');
      });
      grid.appendChild(cell);
    }
    container.innerHTML = '';
    container.appendChild(grid);
  }

  function parseWholeNumber(raw) {
    var s = String(raw || '').trim();
    if (!/^-?\d+$/.test(s)) return null;
    return Number(s);
  }

  function normaliseCompactRle(raw) {
    return String(raw || '')
      .toUpperCase()
      .replace(/[\s,;:()\[\]{}]+/g, '');
  }

  function normaliseDecodedText(raw) {
    return String(raw || '')
      .toUpperCase()
      .replace(/\s+/g, '');
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

    var html = runs.map(function (run) {
      var displaySym = escapeHtml(symbolLabel(run.symbol));
      var pairText = '(' + escapeHtml(run.symbol === ' ' ? '\u00b7' : run.symbol) + ', ' + run.count + ')';
      return (
        '<div class="rle-run-block" style="flex:' + run.count + ' 0 42px">' +
          '<span class="rle-run-sym">' + displaySym + '</span>' +
          '<span class="rle-run-cnt">&times;' + run.count + '</span>' +
          '<span class="rle-run-pair">' + pairText + '</span>' +
        '</div>'
      );
    }).join('');

    host.innerHTML = html;
  }

  function setMode(mode) {
    var tabExplore = byId('tab-explore');
    var tabQuiz = byId('tab-quiz');
    var exploreSection = byId('explore-section');
    var quizSection = byId('quiz-section');
    var isExplore = mode === 'explore';

    if (tabExplore) tabExplore.classList.toggle('active', isExplore);
    if (tabQuiz) tabQuiz.classList.toggle('active', !isExplore);
    if (tabExplore) tabExplore.setAttribute('aria-selected', isExplore ? 'true' : 'false');
    if (tabQuiz) tabQuiz.setAttribute('aria-selected', isExplore ? 'false' : 'true');
    if (exploreSection) exploreSection.hidden = !isExplore;
    if (quizSection) quizSection.hidden = isExplore;
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

  function updateQuizScore() {
    setText('rle-q-correct', Quiz.correct);
    setText('rle-q-wrong', Quiz.wrong);
    setText('rle-q-total', Quiz.total);
  }

  function clearQuizFeedback() {
    var el = byId('rle-q-modal-feedback');
    if (!el) return;
    el.className = 'modal-feedback';
    el.innerHTML = '';
  }

  function setQuizFeedback(correct, html) {
    var el = byId('rle-q-modal-feedback');
    if (!el) return;
    el.className = 'modal-feedback' + (correct ? '' : ' modal-feedback-wrong');
    el.innerHTML = html;
  }

  function openQuizModal() {
    var modal = byId('rle-q-modal');
    if (modal && typeof modal.showModal === 'function' && !modal.open) modal.showModal();
  }

  function closeQuizModal() {
    var modal = byId('rle-q-modal');
    if (modal && modal.open) modal.close();
  }

  function setQuestionTypeView(type) {
    var type1 = byId('rle-type1-area');
    var type2 = byId('rle-type2-area');
    var type3 = byId('rle-type3-area');
    var type4 = byId('rle-type4-area');
    var type1Controls = document.querySelectorAll('#rle-type1-area input, #rle-type1-area button');
    var type2Controls = document.querySelectorAll('#rle-type2-area input, #rle-type2-area button');
    var type3Controls = document.querySelectorAll('#rle-type3-area button');
    var type4Controls = document.querySelectorAll('#rle-type4-area input, #rle-type4-area button');

    var showType1 = type === 'type1';
    var showType2 = type === 'type2';
    var showType3 = type === 'type3';
    var showType4 = type === 'type4';

    if (type1) {
      type1.hidden = !showType1;
      type1.style.display = showType1 ? '' : 'none';
    }
    if (type2) {
      type2.hidden = !showType2;
      type2.style.display = showType2 ? '' : 'none';
    }
    if (type3) {
      type3.hidden = !showType3;
      type3.style.display = showType3 ? '' : 'none';
    }
    if (type4) {
      type4.hidden = !showType4;
      type4.style.display = showType4 ? '' : 'none';
    }

    type1Controls.forEach(function (control) {
      control.disabled = !showType1 || Quiz.locked;
    });
    type2Controls.forEach(function (control) {
      control.disabled = !showType2 || Quiz.locked;
    });
    type3Controls.forEach(function (control) {
      control.disabled = !showType3 || Quiz.locked;
    });
    type4Controls.forEach(function (control) {
      control.disabled = !showType4 || Quiz.locked;
    });

    if (type === 'type2') {
      setText('rle-q-type-badge', 'Decode Pairs');
      return;
    }
    if (type === 'type3') {
      setText('rle-q-type-badge', 'Decode Bitmap');
      return;
    }
    if (type === 'type4') {
      setText('rle-q-type-badge', 'Encode Bitmap');
      return;
    }
    setText('rle-q-type-badge', 'Compact Notation');
  }

  function setEffectSelection(effect) {
    Quiz.selectedEffect = effect || '';
    document.querySelectorAll('[data-rle-effect]').forEach(function (btn) {
      var active = btn.getAttribute('data-rle-effect') === Quiz.selectedEffect;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.style.borderColor = active ? '' : 'rgba(255,255,255,.20)';
    });
  }

  function clearAnswerInputErrors() {
    var V = window.EncodrValidation;
    document.querySelectorAll('#rle-answer-card input').forEach(function (input) {
      if (V) {
        V.clearInputError(input);
      } else {
        input.style.borderColor = '';
      }
    });
    if (V) {
      V.clearGroupError(byId('rle-effect-toggle'));
      V.clearSummary('rle-q-submit');
    }
    document.querySelectorAll('[data-rle-effect]').forEach(function (btn) {
      btn.style.borderColor = btn.classList.contains('active') ? '' : 'rgba(255,255,255,.20)';
    });
  }

  function markInvalidInput(input, message) {
    if (!input) return;
    var V = window.EncodrValidation;
    if (V) {
      V.setInputError(input, message || 'Please fix this field.');
      V.setSummary('rle-q-submit', 'Please fix the highlighted field.');
    } else {
      input.style.borderColor = '#ffff00';
    }
    if (typeof input.focus === 'function') input.focus();
  }

  function markEffectInvalid(message) {
    var V = window.EncodrValidation;
    var effectToggle = byId('rle-effect-toggle');
    if (V && effectToggle) {
      V.setGroupError(effectToggle, message || 'Choose whether the result is compressed or expanded.');
      V.setSummary('rle-q-submit', 'Please fix the highlighted field.');
    }
    document.querySelectorAll('[data-rle-effect]').forEach(function (btn) {
      btn.style.borderColor = '#ffff00';
    });
  }

  function clearQuizAnswers() {
    var encodedInput = byId('rle-q-encoded');
    var encodedBitmapInput = byId('rle-q-encoded-bitmap');
    var decodedInput = byId('rle-q-decoded');
    var inputLen = byId('rle-q-input-length');
    var compressedLen = byId('rle-q-compressed-length');
    if (encodedInput) encodedInput.value = '';
    if (encodedBitmapInput) encodedBitmapInput.value = '';
    if (decodedInput) decodedInput.value = '';
    if (inputLen) inputLen.value = '';
    if (compressedLen) compressedLen.value = '';
    setEffectSelection('');
  }

  function generateQuestion() {
    var generators = window.EncodrQuizGenerators;
    if (!generators || !generators.rle || typeof generators.rle.generate !== 'function') {
      throw new Error('RLE generator is unavailable. Ensure quiz-generators.js is loaded before rle.js.');
    }

    var generated = generators.rle.generate(Quiz.mode);
    var data = generated.data;
    var example = generated.example;

    Quiz.questionNo += 1;
    Quiz.current = {
      type: generated.currentType,
      data: data,
      example: example
    };

    setText('rle-q-num', 'Question ' + Quiz.questionNo);
    setQuestionTypeView(generated.currentType);

    if (generated.currentType === 'type2') {
      byId('rle-q-text').innerHTML =
        'The string <span class="rle-inline-code">' + escapeHtml(example.text) + '</span> can be compressed with RLE into <span class="rle-inline-code">' + escapeHtml(example.encoded) + '</span>.' +
        '<br><br>Using this notation, expand <span class="rle-inline-code">' + escapeHtml(data.encoded) + '</span> back into the original string.';
    } else if (generated.currentType === 'type3') {
      var exGrid = [];
      for (var exI = 0; exI < 15; exI++) exGrid.push('B');
      for (var exI = 0; exI < 9; exI++) exGrid.push('W');
      byId('rle-q-text').innerHTML =
        'Reading left-to-right, top-to-bottom, this 3\u2009\u00d7\u20098 bitmap grid can be encoded using RLE as <span class="rle-inline-code">B15W9</span>:' +
        '<div style="margin:10px 0 14px;">' + buildExampleGridHtml(8, exGrid) + '</div>' +
        'Decode <span class="rle-inline-code">' + escapeHtml(data.encoded) + '</span> by clicking the bitmap grid below. ' +
        'The grid is ' + data.rows + '\u2009\u00d7\u2009' + data.cols + '.';
      buildBitmapGrid(data.cols, data.rows);
    } else if (generated.currentType === 'type4') {
      var exGrid2 = [];
      for (var exJ = 0; exJ < 15; exJ++) exGrid2.push('B');
      for (var exJ = 0; exJ < 9; exJ++) exGrid2.push('W');
      byId('rle-q-text').innerHTML =
        'Reading left-to-right, top-to-bottom, this 3\u2009\u00d7\u20098 bitmap grid can be encoded using RLE as <span class="rle-inline-code">B15W9</span>:' +
        '<div style="margin:10px 0 14px;">' + buildExampleGridHtml(8, exGrid2) + '</div>' +
        'Using the same notation, encode this ' + data.rows + '\u2009\u00d7\u2009' + data.cols + ' bitmap grid:' +
        '<div style="margin:10px 0 14px;">' + buildExampleGridHtml(data.cols, data.grid) + '</div>';
    } else {
      byId('rle-q-text').innerHTML =
        'The text <span class="rle-inline-code">' + escapeHtml(example.text) + '</span> (' + example.inputLength + ' chars) can be compressed with RLE into <span class="rle-inline-code">' + escapeHtml(example.encoded) + '</span> (' + example.encodedLength + ' chars), saving ' + example.saved + ' chars.' +
        '<br><br>Using this notation, apply RLE to the string <span class="rle-inline-code">' + escapeHtml(data.text) + '</span>';
    }

    clearQuizFeedback();
    closeQuizModal();
    clearQuizAnswers();
    clearAnswerInputErrors();
    setQuizLocked(false);

    var firstInput = generated.currentType === 'type2'
      ? byId('rle-q-decoded')
      : generated.currentType === 'type4'
      ? byId('rle-q-encoded-bitmap')
      : byId('rle-q-encoded');
    if (firstInput) firstInput.focus();
  }

  function setQuizLocked(locked) {
    Quiz.locked = locked;
    var submitBtn = byId('rle-q-submit');
    if (submitBtn) submitBtn.disabled = locked;

    setQuestionTypeView(Quiz.current ? Quiz.current.type : 'type1');
  }

  function checkCurrentAnswer() {
    if (!Quiz.current || Quiz.locked) return;

    clearAnswerInputErrors();

    var data = Quiz.current.data;

    if (Quiz.current.type === 'type2') {
      var decodedInput = byId('rle-q-decoded');
      var decodedValue = normaliseDecodedText(decodedInput ? decodedInput.value : '');
      if (!decodedValue.length) {
        markInvalidInput(decodedInput, 'Enter the uncompressed string.');
        return;
      }

      var type2Correct = decodedValue === normaliseDecodedText(data.text);
      var type2Feedback = (type2Correct ? '<span class="fb-correct">Correct.</span>' : '<span class="fb-wrong">Not quite.</span>') +
        '<br>Compressed pairs: <strong>' + escapeHtml(data.encoded) + '</strong>' +
        '<br>Original string: <strong>' + escapeHtml(data.text) + '</strong>';

      Quiz.total += 1;
      if (type2Correct) Quiz.correct += 1;
      else Quiz.wrong += 1;
      updateQuizScore();
      setQuizFeedback(type2Correct, type2Feedback);
      setQuizLocked(true);
      openQuizModal();
      return;
    }

    if (Quiz.current.type === 'type3') {
      var t3Correct = true;
      var correctGrid = data.grid;
      if (Quiz.gridState.length !== correctGrid.length) {
        t3Correct = false;
      } else {
        for (var gi = 0; gi < correctGrid.length; gi++) {
          if (Quiz.gridState[gi] !== correctGrid[gi]) { t3Correct = false; break; }
        }
      }
      var t3Feedback = (t3Correct ? '<span class="fb-correct">Correct.</span>' : '<span class="fb-wrong">Not quite.</span>') +
        '<br>Encoded string: <strong>' + escapeHtml(data.encoded) + '</strong>' +
        '<br>Correct grid:<div>' + buildExampleGridHtml(data.cols, data.grid) + '</div>';
      Quiz.total += 1;
      if (t3Correct) Quiz.correct += 1;
      else Quiz.wrong += 1;
      updateQuizScore();
      setQuizFeedback(t3Correct, t3Feedback);
      setQuizLocked(true);
      openQuizModal();
      return;
    }

    if (Quiz.current.type === 'type4') {
      var encodedBitmapInput = byId('rle-q-encoded-bitmap');
      var encodedBitmapValue = normaliseCompactRle(encodedBitmapInput ? encodedBitmapInput.value : '');
      if (!encodedBitmapValue.length) {
        markInvalidInput(encodedBitmapInput, 'Enter the RLE encoded bitmap string.');
        return;
      }

      var t4Correct = encodedBitmapValue === data.encoded;
      var t4Feedback = (t4Correct ? '<span class="fb-correct">Correct.</span>' : '<span class="fb-wrong">Not quite.</span>') +
        '<br>Correct RLE: <strong>' + escapeHtml(data.encoded) + '</strong>' +
        '<br>Grid:<div>' + buildExampleGridHtml(data.cols, data.grid) + '</div>';
      Quiz.total += 1;
      if (t4Correct) Quiz.correct += 1;
      else Quiz.wrong += 1;
      updateQuizScore();
      setQuizFeedback(t4Correct, t4Feedback);
      setQuizLocked(true);
      openQuizModal();
      return;
    }

    var encodedInput = byId('rle-q-encoded');
    var inputLenInput = byId('rle-q-input-length');
    var compressedLenInput = byId('rle-q-compressed-length');

    var encodedValue = normaliseCompactRle(encodedInput ? encodedInput.value : '');
    var inputLength = parseWholeNumber(inputLenInput ? inputLenInput.value : '');
    var compressedLength = parseWholeNumber(compressedLenInput ? compressedLenInput.value : '');
    var effect = Quiz.selectedEffect;

    if (!encodedValue.length) {
      markInvalidInput(encodedInput, 'Enter the compressed string.');
      return;
    }
    if (inputLength === null) {
      markInvalidInput(inputLenInput, 'Enter a whole number for initial char count.');
      return;
    }
    if (compressedLength === null) {
      markInvalidInput(compressedLenInput, 'Enter a whole number for compressed char count.');
      return;
    }
    if (!effect) {
      markEffectInvalid('Choose whether the result is compressed or expanded.');
      return;
    }

    var correct = encodedValue === data.encoded && inputLength === data.inputLength && compressedLength === data.encodedLength && effect === data.effect;
    var feedback = (correct ? '<span class="fb-correct">Correct.</span>' : '<span class="fb-wrong">Not quite.</span>') +
      '<br>Compressed string: <strong>' + escapeHtml(data.encoded) + '</strong>' +
      '<br>Initial char count: <strong>' + data.inputLength + '</strong>' +
      '<br>Compressed char count: <strong>' + data.encodedLength + '</strong>' +
      '<br>Result: <strong>' + data.effect + '</strong>';

    Quiz.total += 1;
    if (correct) Quiz.correct += 1;
    else Quiz.wrong += 1;
    updateQuizScore();
    setQuizFeedback(correct, feedback);
    setQuizLocked(true);
    openQuizModal();
  }

  function initQuiz() {
    if (Quiz.initialized) return;

    document.querySelectorAll('[data-rle-effect]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (Quiz.locked) return;
        setEffectSelection(btn.getAttribute('data-rle-effect'));
        var V = window.EncodrValidation;
        if (V) {
          V.clearGroupError(byId('rle-effect-toggle'));
          V.clearSummary('rle-q-submit');
        }
      });
    });

    var submitBtn = byId('rle-q-submit');
    var nextBtn = byId('rle-q-next');
    var resetBtn = byId('rle-q-reset-score');
    var clearGridBtn = byId('rle-q3-clear');

    [byId('rle-q-encoded'), byId('rle-q-encoded-bitmap')].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () {
        var V = window.EncodrValidation;
        if (normaliseCompactRle(input.value).length) {
          V.clearInputError(input);
          V.maybeClearSummary('rle-q-submit');
        }
      });
    });

    [byId('rle-q-input-length'), byId('rle-q-compressed-length')].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () {
        var V = window.EncodrValidation;
        if (parseWholeNumber(input.value) !== null) {
          V.clearInputError(input);
          V.maybeClearSummary('rle-q-submit');
        }
      });
    });

    var decodedInput = byId('rle-q-decoded');
    if (decodedInput) {
      decodedInput.addEventListener('input', function () {
        var V = window.EncodrValidation;
        if (normaliseDecodedText(decodedInput.value).length) {
          V.clearInputError(decodedInput);
          V.maybeClearSummary('rle-q-submit');
        }
      });
    }

    if (submitBtn) submitBtn.addEventListener('click', checkCurrentAnswer);
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        closeQuizModal();
        generateQuestion();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        Quiz.correct = 0;
        Quiz.wrong = 0;
        Quiz.total = 0;
        updateQuizScore();
        closeQuizModal();
        generateQuestion();
      });
    }
    if (clearGridBtn) {
      clearGridBtn.addEventListener('click', function () {
        if (Quiz.locked) return;
        Quiz.gridState = Quiz.gridState.map(function () { return 'W'; });
        document.querySelectorAll('#rle-bitmap-grid-container .rle-pixel').forEach(function (cell) {
          cell.className = 'rle-pixel w';
          cell.setAttribute('aria-pressed', 'false');
        });
      });
    }

    updateQuizScore();
    generateQuestion();
    Quiz.initialized = true;
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', function () {
    var inputEl = byId('rle-input');
    if (!inputEl) return;

    var tabExplore = byId('tab-explore');
    var tabQuiz = byId('tab-quiz');

    if (tabExplore) {
      tabExplore.addEventListener('click', function () {
        closeQuizModal();
        setMode('explore');
      });
    }
    if (tabQuiz) {
      tabQuiz.addEventListener('click', function () {
        setMode('quiz');
        initQuiz();
      });
    }

    inputEl.value = SAMPLES.colors;
    inputEl.addEventListener('input', renderAll);

    wireSamples();
    setMode('explore');
    renderAll();
  });
})();
