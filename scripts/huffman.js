(function () {
  var MAX_INPUT_CHARS = 100;

  var Quiz = {
    mode: 'mixed',
    correct: 0,
    wrong: 0,
    total: 0,
    questionNo: 0,
    current: null,
    initialized: false,
    locked: false
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function printableChar(ch) {
    if (ch === ' ') return '[space]';
    if (ch === '\n') return '[newline]';
    if (ch === '\t') return '[tab]';
    return ch;
  }

  function countFrequencies(text) {
    var map = new Map();
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      map.set(ch, (map.get(ch) || 0) + 1);
    }
    return map;
  }

  function makeLeaf(symbol, freq) {
    return {
      symbol: symbol,
      freq: freq,
      left: null,
      right: null,
      minSymbol: symbol
    };
  }

  function makeNode(left, right) {
    var minSymbol = left.minSymbol < right.minSymbol ? left.minSymbol : right.minSymbol;
    return {
      symbol: null,
      freq: left.freq + right.freq,
      left: left,
      right: right,
      minSymbol: minSymbol
    };
  }

  function compareNodes(a, b) {
    if (a.freq !== b.freq) return a.freq - b.freq;
    return a.minSymbol.localeCompare(b.minSymbol);
  }

  function buildTree(freqMap) {
    var queue = [];
    freqMap.forEach(function (freq, symbol) {
      queue.push(makeLeaf(symbol, freq));
    });

    if (!queue.length) return null;

    queue.sort(compareNodes);

    if (queue.length === 1) {
      // Single-symbol input still needs a valid code path.
      var only = queue[0];
      var dummy = makeLeaf('', 0);
      return makeNode(only, dummy);
    }

    while (queue.length > 1) {
      queue.sort(compareNodes);
      var left = queue.shift();
      var right = queue.shift();
      queue.push(makeNode(left, right));
    }

    return queue[0];
  }

  function buildCodes(node, prefix, codes) {
    if (!node) return;
    if (!node.left && !node.right) {
      if (node.symbol !== '') {
        codes[node.symbol] = prefix || '0';
      }
      return;
    }
    buildCodes(node.left, prefix + '0', codes);
    buildCodes(node.right, prefix + '1', codes);
  }

  function encode(text, codes) {
    var bits = [];
    for (var i = 0; i < text.length; i++) {
      bits.push(codes[text[i]]);
    }
    return bits.join(' ');
  }

  function bitsForHuffman(freqMap, codes) {
    var total = 0;
    freqMap.forEach(function (freq, symbol) {
      total += freq * (codes[symbol] ? codes[symbol].length : 0);
    });
    return total;
  }

  function sortedSymbols(freqMap) {
    var list = [];
    freqMap.forEach(function (freq, symbol) {
      list.push({ symbol: symbol, freq: freq });
    });
    list.sort(function (a, b) {
      if (b.freq !== a.freq) return b.freq - a.freq;
      return a.symbol.localeCompare(b.symbol);
    });
    return list;
  }

  function renderCodeTable(rows, codes) {
    var body = byId('hf-code-table');
    if (!body) return;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4">Enter some text to build codes.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row) {
      var code = codes[row.symbol] || '';
      return '<tr>' +
        '<td><span class="hf-inline-symbol">' + escapeHtml(printableChar(row.symbol)) + '</span></td>' +
        '<td>' + row.freq + '</td>' +
        '<td><span class="hf-inline-symbol">' + escapeHtml(code) + '</span></td>' +
        '<td>' + (row.freq * code.length) + '</td>' +
        '</tr>';
    }).join('');
  }

  function prepareTreeLayout(root) {
    var leaves = 0;
    var maxDepth = 0;

    function walk(node, depth) {
      if (!node) return;
      if (depth > maxDepth) maxDepth = depth;
      if (!node.left && !node.right) {
        node.xIndex = leaves;
        leaves += 1;
        return;
      }
      walk(node.left, depth + 1);
      walk(node.right, depth + 1);
      var leftX = node.left ? node.left.xIndex : 0;
      var rightX = node.right ? node.right.xIndex : leftX;
      node.xIndex = (leftX + rightX) / 2;
    }

    walk(root, 0);
    return { leaves: Math.max(leaves, 1), maxDepth: maxDepth };
  }

  function drawTree(svgId, root, emptyText) {
    var svg = byId(svgId);
    if (!svg) return;

    if (!root) {
      svg.setAttribute('viewBox', '0 0 640 220');
      svg.innerHTML = '<text x="20" y="36" fill="#c0d0ff" font-size="16" font-family="Consolas, monospace">' + escapeHtml(emptyText || 'No tree.') + '</text>';
      return;
    }

    var layout = prepareTreeLayout(root);
    var width = Math.max(640, layout.leaves * 120);
    var stepY = 86;
    var topPad = 28;
    var bottomPad = 22;
    var height = Math.max(220, topPad + layout.maxDepth * stepY + 40 + bottomPad);
    var paddingX = 40;
    var stepX = layout.leaves > 1 ? (width - paddingX * 2) / (layout.leaves - 1) : 0;

    function pos(node, depth) {
      return {
        x: paddingX + node.xIndex * stepX,
        y: topPad + depth * stepY
      };
    }

    var lines = [];
    var labels = [];
    var nodes = [];
    var nodeRadius = 20;

    function lineEdgePoint(from, to, radius) {
      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len;
      var uy = dy / len;
      return {
        x: from.x + ux * radius,
        y: from.y + uy * radius
      };
    }

    function walk(node, depth) {
      if (!node) return;
      var p = pos(node, depth);

      if (node.left) {
        var lp = pos(node.left, depth + 1);
        var lStart = lineEdgePoint(p, lp, nodeRadius);
        var lEnd = lineEdgePoint(lp, p, nodeRadius);
        lines.push('<line x1="' + lStart.x + '" y1="' + lStart.y + '" x2="' + lEnd.x + '" y2="' + lEnd.y + '" stroke="rgba(255,255,255,.65)" stroke-width="2" />');
        labels.push('<text x="' + ((p.x + lp.x) / 2 - 10) + '" y="' + ((p.y + lp.y) / 2 - 4) + '" fill="#7dd3ff" font-size="14" font-family="Consolas, monospace">0</text>');
        walk(node.left, depth + 1);
      }

      if (node.right) {
        var rp = pos(node.right, depth + 1);
        var rStart = lineEdgePoint(p, rp, nodeRadius);
        var rEnd = lineEdgePoint(rp, p, nodeRadius);
        lines.push('<line x1="' + rStart.x + '" y1="' + rStart.y + '" x2="' + rEnd.x + '" y2="' + rEnd.y + '" stroke="rgba(255,255,255,.65)" stroke-width="2" />');
        labels.push('<text x="' + ((p.x + rp.x) / 2 + 6) + '" y="' + ((p.y + rp.y) / 2 - 4) + '" fill="#00ff00" font-size="14" font-family="Consolas, monospace">1</text>');
        walk(node.right, depth + 1);
      }

      var isLeaf = !node.left && !node.right;
      var symbolText = isLeaf ? printableChar(node.symbol) : '';
      var circleFill = isLeaf ? '#3b2f00' : '#1a1536';
      var symbolTag = '';
      if (symbolText) {
        var tagWidth = Math.max(28, symbolText.length * 8 + 14);
        var tagHeight = 22;
        var tagX = p.x - tagWidth / 2;
        var tagY = p.y + 24;
        symbolTag =
          '<rect x="' + tagX + '" y="' + tagY + '" width="' + tagWidth + '" height="' + tagHeight + '" rx="6" fill="#000000" stroke="rgba(255,255,255,.35)" />' +
          '<text x="' + p.x + '" y="' + (tagY + 15) + '" text-anchor="middle" fill="#ffff00" font-size="14" font-weight="700" font-family="Consolas, Courier New, monospace">' + escapeHtml(symbolText) + '</text>';
      }
      nodes.push('<g>\n' +
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + nodeRadius + '" fill="' + circleFill + '" stroke="rgba(255,255,255,.8)" />\n' +
        '<text x="' + p.x + '" y="' + (p.y + 6) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="700" font-family="Consolas, monospace">' + node.freq + '</text>\n' +
        symbolTag +
        '\n</g>');
    }

    walk(root, 0);
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.innerHTML = lines.join('') + labels.join('') + nodes.join('');
  }

  function setText(id, value) {
    var el = byId(id);
    if (el) el.textContent = String(value);
  }

  function huffmanDataForText(text) {
    var freqMap = countFrequencies(text);
    var rows = sortedSymbols(freqMap);
    var tree = buildTree(freqMap);
    var codes = {};
    buildCodes(tree, '', codes);
    var asciiBits = text.length * 8;
    var huffmanBits = bitsForHuffman(freqMap, codes);
    return {
      text: text,
      freqMap: freqMap,
      rows: rows,
      tree: tree,
      codes: codes,
      asciiBits: asciiBits,
      huffmanBits: huffmanBits,
      savedBits: asciiBits - huffmanBits
    };
  }

  function updateKpis(charCount, asciiBits, huffmanBits) {
    var saved = asciiBits - huffmanBits;
    var ratio = asciiBits > 0 ? (saved / asciiBits) * 100 : 0;

    setText('hf-ascii-bits', asciiBits);
    setText('hf-hf-bits', huffmanBits);
    setText('hf-saved-bits', saved);
    setText('hf-ratio', ratio.toFixed(1) + '% reduction across ' + charCount + ' chars');
  }

  function renderAll() {
    var input = byId('hf-input');
    var encodedEl = byId('hf-encoded');
    if (!input || !encodedEl) return;

    var text = input.value || '';
    if (text.length > MAX_INPUT_CHARS) {
      text = text.slice(0, MAX_INPUT_CHARS);
      input.value = text;
    }
    if (!text.length) {
      updateKpis(0, 0, 0);
      encodedEl.textContent = 'Encoded bits will appear here.';
      renderCodeTable([], {});
      drawTree('hf-tree', null, 'Enter text to generate a Huffman tree.');
      return;
    }

    var data = huffmanDataForText(text);
    var encoded = encode(text, data.codes);

    encodedEl.textContent = encoded;
    updateKpis(text.length, data.asciiBits, data.huffmanBits);
    renderCodeTable(data.rows, data.codes);
    drawTree('hf-tree', data.tree, 'Enter text to generate a Huffman tree.');
  }

  function setMode(mode) {
    var exploreBtn = byId('tab-explore');
    var quizBtn = byId('tab-quiz');
    var explore = byId('explore-section');
    var quiz = byId('quiz-section');
    var isExplore = mode === 'explore';

    if (exploreBtn) exploreBtn.classList.toggle('active', isExplore);
    if (quizBtn) quizBtn.classList.toggle('active', !isExplore);
    if (explore) explore.hidden = !isExplore;
    if (quiz) quiz.hidden = isExplore;
  }

  function wireSamples() {
    var input = byId('hf-input');
    if (!input) return;
    var sampleButtons = Array.from(document.querySelectorAll('[data-hf-sample]'));

    var samples = {
      binary: 'Binary Brain Drain',
      paranoid: 'Paranoid android'
    };

    function setActiveSampleButton(activeKey) {
      sampleButtons.forEach(function (btn) {
        var key = btn.getAttribute('data-hf-sample');
        btn.classList.toggle('btn-submit', key === activeKey);
      });
    }

    sampleButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-hf-sample');
        if (key === 'clear') {
          setActiveSampleButton(null);
          input.value = '';
          renderAll();
          input.focus();
          return;
        }

        if (Object.prototype.hasOwnProperty.call(samples, key)) {
          setActiveSampleButton(key);
          input.value = samples[key];
          renderAll();
        }
      });
    });
  }

  function updateQuizScore() {
    setText('hf-q-correct', Quiz.correct);
    setText('hf-q-wrong', Quiz.wrong);
    setText('hf-q-total', Quiz.total);
  }

  function clearQuizFeedback() {
    var fb = byId('hf-q-modal-feedback');
    if (!fb) return;
    fb.className = 'modal-feedback';
    fb.innerHTML = '';
  }

  function setQuizFeedback(correct, html) {
    var fb = byId('hf-q-modal-feedback');
    if (!fb) return;
    fb.className = 'modal-feedback ' + (correct ? 'modal-feedback-correct' : 'modal-feedback-wrong');
    fb.innerHTML = html;
  }

  function openQuizModal() {
    var dlg = byId('hf-q-modal');
    if (!dlg) return;
    if (!dlg.open) dlg.showModal();
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
  }

  function closeQuizModal() {
    var dlg = byId('hf-q-modal');
    if (dlg && dlg.open) dlg.close();
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
  }

  function formatSymbolList(symbols) {
    var names = symbols.map(function (sym) {
      return '<span class="hf-inline-symbol">' + escapeHtml(printableChar(sym)) + '</span>';
    });

    if (names.length <= 1) return names.join('');
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  function renderType1Inputs(symbols) {
    var host = byId('hf-code-inputs');
    if (!host) return;
    host.innerHTML = symbols.map(function (sym, idx) {
      var labelText = printableChar(sym);
      return '<div class="hf-answer-item">' +
        '<label for="hf-code-' + idx + '" aria-label="Code for ' + escapeHtml(labelText) + '"><span class="hf-inline-symbol">' + escapeHtml(labelText) + '</span></label>' +
        '<input id="hf-code-' + idx + '" data-hf-symbol="' + escapeHtml(sym) + '" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="Enter your answer" />' +
        '</div>';
    }).join('');
  }

  function setQuestionTypeView(type) {
    var type1 = byId('hf-type1-area');
    var type2 = byId('hf-type2-area');
    if (type1) type1.hidden = type !== 'type1';
    if (type2) type2.hidden = type !== 'type2';
    setText('hf-q-type-badge', type === 'type1' ? 'Read Codes' : 'Bit Counts');
  }

  function setQuizLocked(locked) {
    Quiz.locked = locked;
    var submitBtn = byId('hf-q-submit');
    if (submitBtn) submitBtn.disabled = locked;

    document.querySelectorAll('#hf-answer-card input').forEach(function (input) {
      input.disabled = locked;
    });
  }

  function generateQuestion() {
    var generators = window.EncodrQuizGenerators;
    if (!generators || !generators.huffman || typeof generators.huffman.generate !== 'function') {
      throw new Error('Huffman generator is unavailable. Ensure quiz-generators.js is loaded before huffman.js.');
    }

    var generated = generators.huffman.generate(Quiz.mode);
    var phrase = generated.phrase;
    var type = generated.currentType;
    var data = generated.data;
    var symbols = Array.isArray(generated.symbols) ? generated.symbols : [];

    Quiz.questionNo += 1;
    Quiz.current = {
      type: type,
      phrase: phrase,
      data: data,
      symbols: symbols
    };

    setText('hf-q-num', 'Question ' + Quiz.questionNo);
    drawTree('hf-quiz-tree', data.tree, 'Question tree will appear here.');
    clearQuizFeedback();
    closeQuizModal();
    setQuizLocked(false);
    setQuestionTypeView(type);
    clearAnswerInputErrors();

    if (type === 'type1') {
      renderType1Inputs(symbols);
      byId('hf-q-text').innerHTML = 'Phrase: <span class="hf-inline-symbol">' + escapeHtml(phrase) + '</span><br>Using the Huffman tree, enter the codes for ' + formatSymbolList(symbols) + '.';
      setText('hf-q-format-hint', '');
      var firstType1 = byId('hf-code-0');
      if (firstType1) firstType1.focus();
      return;
    }

    byId('hf-q-text').innerHTML = 'Phrase: <span class="hf-inline-symbol">' + escapeHtml(phrase) + '</span><br>Use the Huffman tree below to calculate the total number of ASCII bits, Huffman encoded bits, and bits saved.';
    setText('hf-q-format-hint', '');
    var asciiInput = byId('hf-in-ascii');
    var huffmanInput = byId('hf-in-huffman');
    var savedInput = byId('hf-in-saved');
    if (asciiInput) asciiInput.value = '';
    if (huffmanInput) huffmanInput.value = '';
    if (savedInput) savedInput.value = '';
    if (asciiInput) asciiInput.focus();
  }

  function readType1Answers() {
    var result = {};
    document.querySelectorAll('#hf-code-inputs input').forEach(function (input) {
      var sym = input.getAttribute('data-hf-symbol');
      result[sym] = (input.value || '').replace(/\s+/g, '');
    });
    return result;
  }

  function parseWholeNumber(raw) {
    var s = String(raw || '').trim();
    if (!/^[-]?\d+$/.test(s)) return null;
    return Number(s);
  }

  function clearAnswerInputErrors() {
    document.querySelectorAll('#hf-answer-card input').forEach(function (input) {
      input.style.borderColor = '';
    });
  }

  function markInvalidInput(input) {
    if (!input) return;
    input.style.borderColor = '#ffff00';
    input.focus();
  }

  function checkCurrentAnswer() {
    if (!Quiz.current || Quiz.locked) return;

    clearAnswerInputErrors();

    var correct = false;
    var feedback = '';
    var data = Quiz.current.data;

    if (Quiz.current.type === 'type1') {
      var answers = readType1Answers();
      var details = [];
      var allOk = true;

      for (var i = 0; i < Quiz.current.symbols.length; i++) {
        var requiredInput = byId('hf-code-' + i);
        var requiredValue = requiredInput ? String(requiredInput.value || '').replace(/\s+/g, '') : '';
        if (!requiredValue.length) {
          markInvalidInput(requiredInput);
          return;
        }
      }

      Quiz.current.symbols.forEach(function (sym) {
        var expected = data.codes[sym] || '';
        var got = answers[sym] || '';
        var ok = got === expected;
        if (!ok) allOk = false;
        details.push(escapeHtml(printableChar(sym)) + ': your answer <strong>' + escapeHtml(got || '(blank)') + '</strong>, correct <strong>' + escapeHtml(expected) + '</strong>');
      });

      correct = allOk;
      feedback = correct
        ? 'Correct.'
        : '<span class="fb-wrong">Not quite.</span><br>' + details.join('<br>');
    } else {
      var asciiEl = byId('hf-in-ascii');
      var huffmanEl = byId('hf-in-huffman');
      var savedEl = byId('hf-in-saved');

      var inAscii = parseWholeNumber(asciiEl ? asciiEl.value : '');
      var inHuffman = parseWholeNumber(huffmanEl ? huffmanEl.value : '');
      var inSaved = parseWholeNumber(savedEl ? savedEl.value : '');

      if (inAscii === null) {
        markInvalidInput(asciiEl);
        return;
      }
      if (inHuffman === null) {
        markInvalidInput(huffmanEl);
        return;
      }
      if (inSaved === null) {
        markInvalidInput(savedEl);
        return;
      }

      var asciiOk = inAscii === data.asciiBits;
      var huffmanOk = inHuffman === data.huffmanBits;
      var savedOk = inSaved === data.savedBits;
      correct = asciiOk && huffmanOk && savedOk;

      feedback = (correct ? 'Correct.' : '<span class="fb-wrong">Not quite.</span>') +
        '<br>ASCII bits: <strong>' + data.asciiBits + '</strong>' +
        '<br>Huffman bits: <strong>' + data.huffmanBits + '</strong>' +
        '<br>Bits saved: <strong>' + data.savedBits + '</strong>';
    }

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

    var submitBtn = byId('hf-q-submit');
    var nextBtn = byId('hf-q-next');
    var resetBtn = byId('hf-q-reset-score');

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

    updateQuizScore();
    generateQuestion();
    Quiz.initialized = true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = byId('hf-input');
    if (!input) return;

    byId('tab-explore').addEventListener('click', function () {
      closeQuizModal();
      setMode('explore');
    });
    byId('tab-quiz').addEventListener('click', function () {
      setMode('quiz');
      initQuiz();
    });

    input.value = 'Binary Brain Drain';
    input.addEventListener('input', renderAll);

    wireSamples();
    setMode('explore');
    renderAll();
  });
})();
