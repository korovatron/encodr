(function () {
  var MAX_INPUT_CHARS = 100;

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
      return '<tr><td>' + escapeHtml(printableChar(row.symbol)) + '</td><td>' + row.freq + '</td><td>' + escapeHtml(code) + '</td><td>' + (row.freq * code.length) + '</td></tr>';
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

  function drawTree(root) {
    var svg = byId('hf-tree');
    if (!svg) return;

    if (!root) {
      svg.setAttribute('viewBox', '0 0 640 320');
      svg.innerHTML = '<text x="20" y="36" fill="#c0d0ff" font-size="16" font-family="Consolas, monospace">Enter text to generate a Huffman tree.</text>';
      return;
    }

    var layout = prepareTreeLayout(root);
    var width = Math.max(640, layout.leaves * 120);
    var height = Math.max(320, (layout.maxDepth + 1) * 110 + 40);
    var paddingX = 40;
    var stepX = layout.leaves > 1 ? (width - paddingX * 2) / (layout.leaves - 1) : 0;
    var stepY = 100;

    function pos(node, depth) {
      return {
        x: paddingX + node.xIndex * stepX,
        y: 30 + depth * stepY
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
      nodes.push('<g>\n' +
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + nodeRadius + '" fill="' + circleFill + '" stroke="rgba(255,255,255,.8)" />\n' +
        '<text x="' + p.x + '" y="' + (p.y + 6) + '" text-anchor="middle" fill="#ffffff" font-size="17" font-weight="700" font-family="Consolas, monospace">' + node.freq + '</text>\n' +
        (symbolText ? '<text x="' + p.x + '" y="' + (p.y + 38) + '" text-anchor="middle" fill="#fff36b" stroke="#0f0a24" stroke-width="3" paint-order="stroke fill" font-size="14" font-weight="700" font-family="Consolas, monospace">' + escapeHtml(symbolText) + '</text>' : '') +
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
    var freqMap = countFrequencies(text);
    var rows = sortedSymbols(freqMap);

    if (!text.length) {
      updateKpis(0, 0, 0);
      encodedEl.textContent = 'Encoded bits will appear here.';
      renderCodeTable([], {});
      drawTree(null);
      return;
    }

    var tree = buildTree(freqMap);
    var codes = {};
    buildCodes(tree, '', codes);

    var encoded = encode(text, codes);
    var asciiBits = text.length * 8;
    var huffmanBits = bitsForHuffman(freqMap, codes);

    encodedEl.textContent = encoded;
    updateKpis(text.length, asciiBits, huffmanBits);
    renderCodeTable(rows, codes);
    drawTree(tree);
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

    var samples = {
      banana: 'banana bandana',
      science: 'gcse computer science'
    };

    document.querySelectorAll('[data-hf-sample]').forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-hf-sample');
        if (key === 'clear') {
          input.value = '';
          renderAll();
          input.focus();
          return;
        }

        if (Object.prototype.hasOwnProperty.call(samples, key)) {
          input.value = samples[key];
          renderAll();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = byId('hf-input');
    if (!input) return;

    byId('tab-explore').addEventListener('click', function () { setMode('explore'); });
    byId('tab-quiz').addEventListener('click', function () { setMode('quiz'); });

    input.value = 'banana bandana';
    input.addEventListener('input', renderAll);

    wireSamples();
    setMode('explore');
    renderAll();
  });
})();
