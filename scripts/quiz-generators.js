(function () {
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function fmtBin(value, width) {
    return value.toString(2).padStart(width, '0');
  }

  function fmtHex(value, width) {
    const hex = value.toString(16).toUpperCase();
    return width ? hex.padStart(width, '0') : hex;
  }

  function fmtAnswer(n) {
    const frac = n - Math.floor(n);
    if (frac === 0) return String(n);
    if (frac === 0.5) return n < 1 ? '0.5' : Math.floor(n) + '.5';
    if (frac === 0.25) return n < 1 ? '0.25' : Math.floor(n) + '.25';
    if (frac === 0.75) return n < 1 ? '0.75' : Math.floor(n) + '.75';
    return String(n);
  }

  function bitsWithPoint(rawBits, leftBits) {
    return rawBits.slice(0, leftBits) + '.' + rawBits.slice(leftBits);
  }

  function fixedFormatNum(n) {
    if (n === 0) return '0';
    const rounded = parseFloat(n.toPrecision(12));
    if (Math.abs(rounded) >= 1e10 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
      return rounded.toExponential(6);
    }
    return rounded.toString();
  }

  function pickScaledSixteenth(maxValue, fracBits) {
    const maxU = Math.floor(maxValue * 16 + 1e-9);
    if (maxU <= 0) return 0;
    const needFactor = fracBits >= 4 ? 1 : 2 ** (4 - fracBits);
    let tries = 0;
    while (tries < 200) {
      const u = randInt(0, maxU);
      if (u % needFactor === 0) return u;
      tries++;
    }
    return Math.floor(maxU / needFactor) * needFactor;
  }

  function twosBitsFor(value, n) {
    const unsigned = value < 0 ? (2 ** n + value) : value;
    return unsigned.toString(2).padStart(n, '0');
  }

  function floatingMVal(bits) {
    let v = bits[0] ? -1 : 0;
    for (let i = 1; i < bits.length; i++) if (bits[i]) v += 2 ** -i;
    return v;
  }

  function floatingEVal(bits) {
    const n = bits.length;
    let v = bits[0] ? -(2 ** (n - 1)) : 0;
    for (let i = 1; i < n; i++) if (bits[i]) v += 2 ** (n - 1 - i);
    return v;
  }

  function randomBits(n) {
    return Array.from({ length: n }, function () { return Math.round(Math.random()); });
  }

  function dpCount(n) {
    const s = parseFloat(n.toPrecision(10)).toString();
    const d = s.indexOf('.');
    return d === -1 ? 0 : s.length - d - 1;
  }

  const E_LENS = [4, 4, 4, 5, 5, 6];

  function minBitsForColours(n) {
    return Math.ceil(Math.log2(n));
  }

  function niceFactors(pixels) {
    const nice = [100, 200, 400, 500, 800, 1000, 2000, 4000, 8000, 10000,
      40000, 80000, 100000, 400000, 800000, 1000000,
      4000000, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536,
      131072, 262144, 524288, 1048576];
    if (nice.includes(pixels)) return [pixels, null];
    const wSizes = [32, 64, 100, 128, 160, 200, 256, 320, 400, 500, 512, 640, 800, 1000, 1024, 1200, 1600, 2000, 2048, 3200, 4000, 4096];
    const candidates = [];
    for (let i = 0; i < wSizes.length; i++) {
      const w = wSizes[i];
      if (pixels % w === 0) {
        const h = pixels / w;
        const shortSide = Math.min(w, h);
        const longSide = Math.max(w, h);
        const aspectRatio = longSide / shortSide;
        if (h >= 32 && h <= 8000 && shortSide >= 32 && aspectRatio <= 16) {
          candidates.push([w, h]);
        }
      }
    }
    if (candidates.length) {
      candidates.sort(function (a, b) {
        const ratioA = Math.max(a[0], a[1]) / Math.min(a[0], a[1]);
        const ratioB = Math.max(b[0], b[1]) / Math.min(b[0], b[1]);
        return ratioA - ratioB;
      });
      return candidates[0];
    }
    return null;
  }

  const BITMAP_SI_UNITS = [
    { label: 'kB', factor: 8000 },
    { label: 'MB', factor: 8000000 },
    { label: 'GB', factor: 8000000000 },
    { label: 'TB', factor: 8000000000000 }
  ];
  const BITMAP_IEC_UNITS = [
    { label: 'kiB', factor: 8 * 1024 },
    { label: 'MiB', factor: 8 * 1048576 },
    { label: 'GiB', factor: 8 * 1073741824 },
    { label: 'TiB', factor: 8 * 1099511627776 }
  ];

  function bitmapUnits(mode) {
    if (mode === 'si') return BITMAP_SI_UNITS;
    if (mode === 'iec') return BITMAP_IEC_UNITS;
    return BITMAP_SI_UNITS.concat(BITMAP_IEC_UNITS);
  }

  const SOUND_RATES_HZ = [8000, 11025, 16000, 22050, 44100, 48000, 96000];
  const SOUND_RATES_SI = [8000, 16000, 32000, 48000, 96000];
  const SOUND_RATES_IEC = [8192, 16384, 32768];
  const SOUND_RATES_IEC_LARGE = [8192, 16384, 32768, 65536];
  const SOUND_DEPTHS = [4, 8, 12, 16, 24, 32];
  const SOUND_DURATIONS = [5, 10, 15, 20, 30, 60, 90, 120, 180, 300];
  const SOUND_SI_UNITS = [
    { label: 'kB', bitsPerUnit: 8000 },
    { label: 'MB', bitsPerUnit: 8000000 },
    { label: 'GB', bitsPerUnit: 8000000000 }
  ];
  const SOUND_IEC_UNITS = [
    { label: 'kiB', bitsPerUnit: 8 * 1024 },
    { label: 'MiB', bitsPerUnit: 8 * 1024 * 1024 },
    { label: 'GiB', bitsPerUnit: 8 * 1024 * 1024 * 1024 }
  ];

  function soundUnits(mode) {
    if (mode === 'si') return SOUND_SI_UNITS;
    if (mode === 'iec') return SOUND_IEC_UNITS;
    return SOUND_SI_UNITS.concat(SOUND_IEC_UNITS);
  }

  function fmtHz(hz) {
    return hz >= 1000 ? hz / 1000 + ' kHz' : hz + ' Hz';
  }

  function fmtSecs(s) {
    if (s >= 60 && s % 60 === 0) {
      const m = s / 60;
      return m + ' minute' + (m === 1 ? '' : 's');
    }
    return s + ' second' + (s === 1 ? '' : 's');
  }

  const HUFFMAN_PHRASE_POOL = [
    'stone tones onset',
    'tones onset stone',
    'alert later artel',
    'later artel alert',
    'spare spear pears',
    'pears spare spear',
    'crate cater trace',
    'trace crate cater',
    'stale steal tales',
    'tales stale steal',
    'angle glean angel',
    'angel angle glean',
    'react caret crate',
    'caret crate react',
    'rescue secure recuse',
    'recuse rescue secure',
    'player replay parley',
    'parley player replay',
    'finder friend redfin',
    'friend finder redfin',
    'cinema iceman anemic',
    'anemic cinema iceman',
    'dusty study',
    'study dusty',
    'binary brainy',
    'brainy binary',
    'code decode coding',
    'coding code decode',
    'vector covert',
    'covert vector',
    'socket stock',
    'stock socket',
    'parser sparse',
    'sparse parser',
    'little title',
    'title little',
    'more memory memo',
    'memory more memo',
    'array radar',
    'radar array',
    'class glass',
    'glass class',
    'mango among',
    'among mango',
    'planet panel',
    'panel planet',
    'stream master tamers',
    'master tamers stream',
    'night thing',
    'thing night'
  ];

  function huffmanCountFrequencies(text) {
    const map = new Map();
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      map.set(ch, (map.get(ch) || 0) + 1);
    }
    return map;
  }

  function huffmanMakeLeaf(symbol, freq) {
    return {
      symbol: symbol,
      freq: freq,
      left: null,
      right: null,
      minSymbol: symbol
    };
  }

  function huffmanMakeNode(left, right) {
    return {
      symbol: null,
      freq: left.freq + right.freq,
      left: left,
      right: right,
      minSymbol: left.minSymbol < right.minSymbol ? left.minSymbol : right.minSymbol
    };
  }

  function huffmanCompareNodes(a, b) {
    if (a.freq !== b.freq) return a.freq - b.freq;
    return a.minSymbol.localeCompare(b.minSymbol);
  }

  function huffmanBuildTree(freqMap) {
    const queue = [];
    freqMap.forEach(function (freq, symbol) {
      queue.push(huffmanMakeLeaf(symbol, freq));
    });

    if (!queue.length) return null;
    queue.sort(huffmanCompareNodes);

    if (queue.length === 1) {
      const only = queue[0];
      const dummy = huffmanMakeLeaf('', 0);
      return huffmanMakeNode(only, dummy);
    }

    while (queue.length > 1) {
      queue.sort(huffmanCompareNodes);
      const left = queue.shift();
      const right = queue.shift();
      queue.push(huffmanMakeNode(left, right));
    }

    return queue[0];
  }

  function huffmanBuildCodes(node, prefix, codes) {
    if (!node) return;
    if (!node.left && !node.right) {
      if (node.symbol !== '') {
        codes[node.symbol] = prefix || '0';
      }
      return;
    }
    huffmanBuildCodes(node.left, prefix + '0', codes);
    huffmanBuildCodes(node.right, prefix + '1', codes);
  }

  function huffmanBitsForEncoded(freqMap, codes) {
    let total = 0;
    freqMap.forEach(function (freq, symbol) {
      total += freq * (codes[symbol] ? codes[symbol].length : 0);
    });
    return total;
  }

  function huffmanSortedSymbols(freqMap) {
    const rows = [];
    freqMap.forEach(function (freq, symbol) {
      rows.push({ symbol: symbol, freq: freq });
    });
    rows.sort(function (a, b) {
      if (b.freq !== a.freq) return b.freq - a.freq;
      return a.symbol.localeCompare(b.symbol);
    });
    return rows;
  }

  function huffmanDataForText(text) {
    const freqMap = huffmanCountFrequencies(text);
    const tree = huffmanBuildTree(freqMap);
    const codes = {};
    huffmanBuildCodes(tree, '', codes);
    const asciiBits = text.length * 8;
    const huffmanBits = huffmanBitsForEncoded(freqMap, codes);
    return {
      text: text,
      freqMap: freqMap,
      rows: huffmanSortedSymbols(freqMap),
      tree: tree,
      codes: codes,
      asciiBits: asciiBits,
      huffmanBits: huffmanBits,
      savedBits: asciiBits - huffmanBits
    };
  }

  function huffmanShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function huffmanSymbolPoolForType1(codes) {
    const symbols = Object.keys(codes);
    const nonSpace = symbols.filter(function (s) { return s !== ' '; });
    let count = randInt(3, 4);
    const pool = nonSpace.length >= count ? nonSpace : symbols;
    count = Math.min(count, pool.length);
    return huffmanShuffle(pool.slice()).slice(0, count);
  }

  function rleEncodeCompact(text) {
    if (!text.length) return '';
    let out = '';
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      let count = 1;
      while (i + count < text.length && text[i + count] === ch) count++;
      out += ch + count;
      i += count;
    }
    return out;
  }

  function rleEncodePairs(text) {
    if (!text.length) return '';
    const parts = [];
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      let count = 1;
      while (i + count < text.length && text[i + count] === ch) count++;
      parts.push('(' + ch + ', ' + count + ')');
      i += count;
    }
    return parts.join(', ');
  }

  function rleGenerateType1Data() {
    const symbolPool = ['A', 'B', 'C', 'G', 'H', 'R', 'T', 'X', 'Y', 'Z'];

    for (let tries = 0; tries < 200; tries++) {
      const runCount = randInt(4, 7);
      const runs = [];
      let prev = '';
      let text = '';

      for (let i = 0; i < runCount; i++) {
        let symbol = pick(symbolPool);
        while (symbol === prev) symbol = pick(symbolPool);
        const count = randInt(1, 9);
        runs.push({ symbol: symbol, count: count });
        text += symbol.repeat(count);
        prev = symbol;
      }

      const encoded = runs.map(function (run) {
        return run.symbol + run.count;
      }).join('');
      const inputLength = text.length;
      const encodedLength = encoded.length;
      if (inputLength > 40) continue;
      if (inputLength === encodedLength) continue;

      return {
        text: text,
        runs: runs,
        encoded: encoded,
        inputLength: inputLength,
        encodedLength: encodedLength,
        effect: encodedLength < inputLength ? 'compressed' : 'expanded',
        netChange: inputLength - encodedLength
      };
    }

    const fallbackText = 'XXXXXYYZZZHHHH';
    return {
      text: fallbackText,
      runs: [
        { symbol: 'X', count: 5 },
        { symbol: 'Y', count: 2 },
        { symbol: 'Z', count: 3 },
        { symbol: 'H', count: 4 }
      ],
      encoded: rleEncodeCompact(fallbackText),
      inputLength: fallbackText.length,
      encodedLength: rleEncodeCompact(fallbackText).length,
      effect: 'compressed',
      netChange: fallbackText.length - rleEncodeCompact(fallbackText).length
    };
  }

  function rleGenerateType2Data() {
    const symbolPool = ['A', 'B', 'C', 'D', 'G', 'H', 'J', 'O', 'P', 'R', 'T', 'X', 'Y', 'Z'];

    for (let tries = 0; tries < 200; tries++) {
      const runCount = randInt(4, 7);
      const runs = [];
      let prev = '';
      let text = '';

      for (let i = 0; i < runCount; i++) {
        let symbol = pick(symbolPool);
        while (symbol === prev) symbol = pick(symbolPool);
        const count = randInt(1, 9);
        runs.push({ symbol: symbol, count: count });
        text += symbol.repeat(count);
        prev = symbol;
      }

      if (text.length >= 8 && text.length <= 32) {
        return {
          text: text,
          runs: runs,
          encoded: rleEncodePairs(text)
        };
      }
    }

    return {
      text: 'JJJOOPP',
      runs: [
        { symbol: 'J', count: 3 },
        { symbol: 'O', count: 2 },
        { symbol: 'P', count: 2 }
      ],
      encoded: '(J, 3), (O, 2), (P, 2)'
    };
  }

  function rleGenerateType3Data() {
    var colOptions = [6, 7, 8];
    var rowOptions = [4, 5, 6];

    for (var tries = 0; tries < 200; tries++) {
      var cols = pick(colOptions);
      var rows = pick(rowOptions);
      var total = cols * rows;
      var runCount = randInt(2, 5);
      var min = 2;
      var extra = total - runCount * min;
      if (extra < 0) continue;

      var cuts = [];
      for (var ci = 0; ci < runCount - 1; ci++) cuts.push(randInt(0, extra));
      cuts.sort(function (a, b) { return a - b; });

      var runLengths = [];
      var prev = 0;
      for (var ri = 0; ri < runCount - 1; ri++) {
        runLengths.push(min + (cuts[ri] - prev));
        prev = cuts[ri];
      }
      runLengths.push(min + (extra - prev));

      var startWith = pick(['B', 'W']);
      var runs = [];
      for (var ki = 0; ki < runCount; ki++) {
        runs.push({
          color: ki % 2 === 0 ? startWith : (startWith === 'B' ? 'W' : 'B'),
          count: runLengths[ki]
        });
      }

      var grid = [];
      for (var gi = 0; gi < runs.length; gi++) {
        for (var pi = 0; pi < runs[gi].count; pi++) grid.push(runs[gi].color);
      }

      var encoded = runs.map(function (r) { return r.color + r.count; }).join('');
      return { cols: cols, rows: rows, grid: grid, runs: runs, encoded: encoded };
    }

    // Fallback: 4×6 grid W9B7W8
    var fallbackGrid = [];
    for (var fi = 0; fi < 9; fi++) fallbackGrid.push('W');
    for (var fi = 0; fi < 7; fi++) fallbackGrid.push('B');
    for (var fi = 0; fi < 8; fi++) fallbackGrid.push('W');
    return {
      cols: 6, rows: 4,
      grid: fallbackGrid,
      runs: [{ color: 'W', count: 9 }, { color: 'B', count: 7 }, { color: 'W', count: 8 }],
      encoded: 'W9B7W8'
    };
  }

  function rleGenerateType4Data() {
    var data = rleGenerateType3Data();
    return {
      cols: data.cols,
      rows: data.rows,
      grid: data.grid,
      runs: data.runs,
      encoded: data.encoded
    };
  }

  function binaryMulCarryStats(aVal, bVal) {
    var width = 11; // 8-bit multiplicand and 3-bit multiplier display width
    var partials = [];
    var hasCarry = false;

    for (var shift = 0; shift < 3; shift++) {
      var bit = (bVal >> shift) & 1;
      partials.push(bit ? (aVal << shift) : 0);
    }

    var carry = 0;
    for (var col = 0; col < width; col++) {
      var total = carry;
      for (var row = 0; row < partials.length; row++) {
        total += (partials[row] >> col) & 1;
      }
      carry = total >> 1;
      if (carry > 1) return { valid: false, hasCarry: hasCarry };
      if (carry === 1) hasCarry = true;
    }

    return { valid: true, hasCarry: hasCarry };
  }

  function binaryArithmeticAdditionQuestion() {
    var a = randInt(0, 255);
    var b = randInt(0, 255);
    var sum = a + b;
    var overflow = sum > 255;

    return {
      currentType: 'add',
      answerKind: 'binary-overflow',
      prompt: pick([
        'Use binary column addition to add ' + fmtBin(a, 8) + ' and ' + fmtBin(b, 8) + '. Do not convert to denary.',
        'Add these two 8-bit binary values using column addition: ' + fmtBin(a, 8) + ' + ' + fmtBin(b, 8) + '. Keep the working in binary (no denary conversion).',
        'Using binary column addition only, find the sum of ' + fmtBin(a, 8) + ' and ' + fmtBin(b, 8) + '. Do not convert to denary first.'
      ]),
      formatHint: 'Enter the binary sum. Include the carry-out bit if overflow occurs, then choose whether overflow happened.',
      expectedBinary: sum.toString(2),
      expectedValue: sum,
      expectedOverflow: overflow,
      leftOperand: fmtBin(a, 8),
      rightOperand: fmtBin(b, 8)
    };
  }

  function binaryArithmeticMultiplicationQuestion() {
    function pickExamStyleMultiplier() {
      // Bias away from very easy cases such as x2, while keeping variety.
      return pick([3, 5, 6, 7, 3, 5, 6, 7, 4, 2]);
    }

    for (var tries = 0; tries < 600; tries++) {
      var a = randInt(0, 255);
      var b = pickExamStyleMultiplier();
      var product = a * b;
      var carryStats = binaryMulCarryStats(a, b);

      if (product > 255) continue;
      if (!carryStats.valid) continue;
      if (!carryStats.hasCarry) continue;

      return {
        currentType: 'mul',
        answerKind: 'binary',
        prompt: pick([
          'Use binary long multiplication to calculate ' + fmtBin(a, 8) + ' x ' + fmtBin(b, 3) + '. Do not convert to denary.',
          'Multiply these binary values using column multiplication: ' + fmtBin(a, 8) + ' x ' + fmtBin(b, 3) + '. Keep everything in binary.',
          'Using binary multiplication only, find ' + fmtBin(a, 8) + ' x ' + fmtBin(b, 3) + '. Do not convert to denary first.'
        ]),
        formatHint: 'Enter the binary product.',
        expectedBinary: product.toString(2),
        expectedValue: product,
        expectedOverflow: false,
        leftOperand: fmtBin(a, 8),
        rightOperand: fmtBin(b, 3)
      };
    }

    // Guaranteed-valid fallback: non-trivial multiplier, at least one carry,
    // no carry > 1, and no overflow.
    return {
      currentType: 'mul',
      answerKind: 'binary',
      prompt: 'Use binary long multiplication to calculate 00111111 x 011. Do not convert to denary.',
      formatHint: 'Enter the binary product.',
      expectedBinary: '10111101',
      expectedValue: 189,
      expectedOverflow: false,
      leftOperand: '00111111',
      rightOperand: '011'
    };
  }

  window.EncodrQuizGenerators = {
    unsigned: {
      generate: function (questionType) {
        const currentType = questionType === 'mixed'
          ? pick(['1', '2', '3', '4', '5', '6', '7'])
          : String(questionType);

        if (currentType === '1') {
          const value = randInt(0, 255);
          const bin = fmtBin(value, 8);
          return {
            currentType: currentType,
            prompt: pick([
              'Convert the binary value ' + bin + ' to denary.',
              'What denary number does 8-bit binary ' + bin + ' represent?',
              'Write ' + bin + ' as a denary value.'
            ]),
            formatHint: 'Enter a denary integer (0 to 255).',
            answerKind: 'den',
            expectedText: String(value),
            expectedValue: value
          };
        }

        if (currentType === '2') {
          const value = randInt(0, 255);
          return {
            currentType: currentType,
            prompt: pick([
              'Convert denary ' + value + ' to 8-bit binary.',
              'Write denary ' + value + ' as an 8-bit binary value.',
              'What is the 8-bit binary form of denary ' + value + '?'
            ]),
            formatHint: 'Enter binary (0s and 1s). Leading zeros are allowed.',
            answerKind: 'bin',
            expectedText: fmtBin(value, 8),
            expectedValue: value
          };
        }

        if (currentType === '3') {
          const value = randInt(0, 255);
          return {
            currentType: currentType,
            prompt: pick([
              'Convert denary ' + value + ' to hexadecimal.',
              'Write denary ' + value + ' as a 2-digit hex value.',
              'What is denary ' + value + ' in hexadecimal?'
            ]),
            formatHint: 'Enter hexadecimal (00 to FF), no prefix needed.',
            answerKind: 'hex',
            expectedText: fmtHex(value, 2),
            expectedValue: value
          };
        }

        if (currentType === '4') {
          const value = randInt(0, 255);
          const hex = fmtHex(value, 2);
          return {
            currentType: currentType,
            prompt: pick([
              'Convert hexadecimal ' + hex + ' to denary.',
              'What denary value is hex ' + hex + '?',
              'Write hex ' + hex + ' as a denary number.'
            ]),
            formatHint: 'Enter a denary integer (0 to 255).',
            answerKind: 'den',
            expectedText: String(value),
            expectedValue: value
          };
        }

        if (currentType === '5') {
          const oddLengths = [5, 6, 7, 9, 10, 11, 13, 14, 15];
          const nibbleLengths = [4, 8, 12, 16];
          const useOddLen = Math.random() < 0.2;
          const width = useOddLen ? pick(oddLengths) : pick(nibbleLengths);
          const maxForWidth = Math.min(65535, 2 ** width - 1);
          const value = randInt(0, maxForWidth);
          const bin = fmtBin(value, width);
          return {
            currentType: currentType,
            prompt: pick([
              'Convert binary ' + bin + ' to hexadecimal.',
              'Write the binary value ' + bin + ' as hex.',
              'What is ' + bin + ' in hexadecimal?'
            ]),
            formatHint: 'Enter hexadecimal using 0-9 and A-F.',
            answerKind: 'hex',
            expectedText: fmtHex(value),
            expectedValue: value
          };
        }

        if (currentType === '6') {
          const hexDigits = pick([1, 2, 3, 4]);
          const maxForDigits = 16 ** hexDigits - 1;
          const value = randInt(0, maxForDigits);
          const hex = fmtHex(value, hexDigits);
          const bitWidth = hexDigits * 4;
          return {
            currentType: currentType,
            prompt: pick([
              'What is hex ' + hex + ' represented as ' + bitWidth + '-bit binary?',
              'Convert hexadecimal ' + hex + ' to ' + bitWidth + '-bit binary.',
              'Write hex ' + hex + ' as a ' + bitWidth + '-bit binary value.'
            ]),
            formatHint: 'Enter binary (0s and 1s).',
            answerKind: 'bin',
            expectedText: fmtBin(value, bitWidth),
            expectedValue: value
          };
        }

        const n = randInt(2, 16);
        return {
          currentType: currentType,
          prompt: pick([
            'With an ' + n + '-bit unsigned binary number, what is the smallest and largest representable denary value?',
            'State the denary range for ' + n + '-bit unsigned binary.',
            'For unsigned ' + n + '-bit binary, give the minimum and maximum denary values.'
          ]),
          formatHint: 'Enter both endpoints of the range below.',
          answerKind: 'range',
          expectedMin: 0,
          expectedMax: 2 ** n - 1,
          rangeBits: n,
          expectedText: '0 to ' + (2 ** n - 1),
          expectedValue: 2 ** n - 1
        };
      }
    },

    fixedPoint: {
      generate: function (questionType) {
        const currentType = questionType === 'mixed' ? pick(['1', '2', '3']) : String(questionType);

        if (currentType === '1') {
          const n = randInt(4, 16);
          const left = randInt(1, n - 1);
          const frac = n - left;
          let raw = randInt(0, 2 ** n - 1);
          if (raw === 0) raw = 1;
          const rawBits = raw.toString(2).padStart(n, '0');
          const shown = bitsWithPoint(rawBits, left);
          const value = raw / (2 ** frac);
          return {
            currentType: currentType,
            answerKind: 'den',
            totalBits: n,
            leftBits: left,
            fracBits: frac,
            expectedValue: value,
            expectedBits: shown,
            prompt: pick([
              'Convert the fixed point binary ' + shown + ' into denary.',
              'What denary value does fixed point binary ' + shown + ' represent?',
              'Write ' + shown + ' as a denary number.'
            ]),
            formatHint: 'Enter a denary value (decimals allowed).'
          };
        }

        if (currentType === '2') {
          const n = randInt(6, 16);
          const frac = randInt(1, Math.min(8, n - 1));
          const left = n - frac;
          const maxValue = 2 ** left - 2 ** (-frac);
          const u = pickScaledSixteenth(maxValue, frac);
          const value = u / 16;
          const raw = Math.round(value * (2 ** frac));
          const rawBits = raw.toString(2).padStart(n, '0');
          const shown = bitsWithPoint(rawBits, left);
          return {
            currentType: currentType,
            answerKind: 'bin',
            totalBits: n,
            leftBits: left,
            fracBits: frac,
            expectedValue: value,
            expectedBits: shown,
            prompt: pick([
              'Using ' + n + ' bits in total with ' + frac + ' bits after the binary point, represent the denary number ' + fixedFormatNum(value) + '.',
              'Write ' + fixedFormatNum(value) + ' as fixed point binary using ' + n + ' total bits and ' + frac + ' fractional bits.',
              'Convert denary ' + fixedFormatNum(value) + ' to fixed point binary (' + n + ' bits, ' + frac + ' after the point).'
            ]),
            formatHint: 'Enter ' + n + ' binary bits with the point after ' + left + ' bits (example format: ' + '0'.repeat(left) + '.' + '0'.repeat(frac) + ').'
          };
        }

        const n = randInt(4, 16);
        const left = randInt(1, n - 1);
        const frac = n - left;
        const max = 2 ** left - 2 ** (-frac);
        return {
          currentType: currentType,
          answerKind: 'range',
          totalBits: n,
          leftBits: left,
          fracBits: frac,
          expectedMin: 0,
          expectedMax: max,
          prompt: pick([
            'With ' + n + ' bits in total and ' + frac + ' bits after the binary point, what are the smallest and largest representable denary values?',
            'State the minimum and maximum denary values representable using fixed point with ' + n + ' total bits and ' + frac + ' fractional bits.',
            'For ' + n + '-bit fixed point with ' + frac + ' bits after the point, give the minimum and maximum denary values.'
          ]),
          formatHint: 'Enter both endpoints of the range below.'
        };
      }
    },

    twosComplement: {
      generate: function (questionType) {
        const currentType = questionType === 'mixed' ? pick(['1', '2', '3']) : String(questionType);
        const n = randInt(6, 12);
        const min = -(2 ** (n - 1));
        const max = 2 ** (n - 1) - 1;

        if (currentType === '1') {
          const value = randInt(min, max);
          const bits = twosBitsFor(value, n);
          return {
            currentType: currentType,
            answerKind: 'den',
            bits: n,
            expectedValue: value,
            expectedBits: bits,
            prompt: pick([
              'Convert the two\'s complement binary number ' + bits + ' into denary.',
              'What denary value does ' + bits + ' represent in ' + n + '-bit two\'s complement?',
              'Write ' + bits + ' (two\'s complement, ' + n + ' bits) as a denary number.'
            ]),
            formatHint: 'Enter a denary integer.'
          };
        }

        if (currentType === '2') {
          const value = randInt(min, max);
          const bits = twosBitsFor(value, n);
          return {
            currentType: currentType,
            answerKind: 'bin',
            bits: n,
            expectedValue: value,
            expectedBits: bits,
            prompt: pick([
              'Write the denary number ' + value + ' in ' + n + ' bits two\'s complement.',
              'Represent denary ' + value + ' as a ' + n + '-bit two\'s complement binary number.',
              'Convert denary ' + value + ' to ' + n + '-bit two\'s complement.'
            ]),
            formatHint: 'Enter exactly ' + n + ' bits (0s and 1s).'
          };
        }

        return {
          currentType: currentType,
          answerKind: 'range',
          bits: n,
          expectedMin: min,
          expectedMax: max,
          prompt: pick([
            'With a ' + n + '-bit two\'s complement number, what is the smallest and largest representable denary value?',
            'Give the denary range of ' + n + '-bit two\'s complement values.',
            'For ' + n + '-bit two\'s complement, state the minimum and maximum denary numbers.'
          ]),
          formatHint: 'Enter both endpoints of the range below.'
        };
      }
    },

    floatingPoint: {
      generate: function (questionType) {
        const currentType = questionType === 'mixed'
          ? pick(['1', '2', '3', '4', '5', '6'])
          : questionType === 'extrema'
          ? pick(['3', '4', '5', '6'])
          : String(questionType);

        const mLen = pick([6, 7, 7, 8, 8, 9, 10]);
        const eLen = pick(E_LENS);
        const result = {
          currentType: currentType,
          mLen: mLen,
          eLen: eLen,
          answered: false,
          studentM: Array(mLen).fill(0),
          studentE: Array(eLen).fill(0),
          isInexact: false,
          extremaType: null,
          mBits: [],
          eBits: [],
          storedValue: 0,
          targetDenary: 0
        };

        if (currentType === '1' || currentType === '2') {
          let mb, eb, mv, ev, val, tries = 0;
          do {
            mb = randomBits(mLen);
            eb = randomBits(eLen);
            mv = floatingMVal(mb);
            ev = floatingEVal(eb);
            val = mv === 0 ? 0 : mv * 2 ** ev;
            tries++;
          } while ((mb[0] === mb[1] || val === 0 || !isFinite(val) || dpCount(val) > 6) && tries < 500);
          result.mBits = mb;
          result.eBits = eb;
          result.storedValue = val;
          result.targetDenary = val;
          if (currentType === '2') {
            result.isInexact = Math.random() < 0.5;
            if (result.isInexact) {
              const uls = 2 ** (floatingEVal(eb) - mLen + 1);
              const offset = uls * (0.10 + Math.random() * 0.35);
              result.targetDenary = parseFloat((val > 0 ? val + offset : val - offset).toFixed(6));
            }
          }
          return result;
        }

        if (currentType === '3') {
          const eMin = -(2 ** (eLen - 1));
          const eBits = twosBitsFor(eMin, eLen).split('').map(function (ch) { return ch === '1' ? 1 : 0; });
          const minPos = 0.5 * 2 ** eMin;
          result.mBits = [0, 1].concat(Array(mLen - 2).fill(0));
          result.eBits = eBits;
          result.storedValue = minPos;
          result.targetDenary = minPos;
          result.extremaType = '3';
          return result;
        }

        if (currentType === '4') {
          const eMax = 2 ** (eLen - 1) - 1;
          const eBits = twosBitsFor(eMax, eLen).split('').map(function (ch) { return ch === '1' ? 1 : 0; });
          const maxPos = (1 - 2 ** (-(mLen - 1))) * 2 ** eMax;
          result.mBits = [0].concat(Array(mLen - 1).fill(1));
          result.eBits = eBits;
          result.storedValue = maxPos;
          result.targetDenary = maxPos;
          result.extremaType = '4';
          return result;
        }

        if (currentType === '5') {
          const eMin = -(2 ** (eLen - 1));
          const eBits = twosBitsFor(eMin, eLen).split('').map(function (ch) { return ch === '1' ? 1 : 0; });
          const maxNeg = -(0.5 + 2 ** (-(mLen - 1))) * 2 ** eMin;
          result.mBits = [1, 0].concat(Array(mLen - 2).fill(1));
          result.eBits = eBits;
          result.storedValue = maxNeg;
          result.targetDenary = maxNeg;
          result.extremaType = '5';
          return result;
        }

        const eMax = 2 ** (eLen - 1) - 1;
        const eBits = twosBitsFor(eMax, eLen).split('').map(function (ch) { return ch === '1' ? 1 : 0; });
        const minNeg = -(2 ** eMax);
        result.mBits = [1].concat(Array(mLen - 1).fill(0));
        result.eBits = eBits;
        result.storedValue = minNeg;
        result.targetDenary = minNeg;
        result.extremaType = '6';
        return result;
      }
    },

    bitmap: {
      generate: function (options) {
        const mode = typeof options === 'string' ? options : (options && options.unitsMode) || 'mix';
        const questionTypes = options && typeof options === 'object' && Array.isArray(options.questionTypes) && options.questionTypes.length
          ? options.questionTypes
          : ['sizeBits', 'sizeUnit', 'maxColoursDepth', 'colourDepth', 'maxColoursSize'];
        function genSizeBits() {
          const bitDepth = pick([1, 2, 3, 4, 6, 8]);
          const colours = 2 ** bitDepth;
          const pxSets = [[100], [200], [400], [500], [1000], [2000], [4000], [10, 10], [20, 20], [100, 100], [200, 150], [1000, 800], [500, 400]];
          const dims = pick(pxSets);
          const w = dims[0], h = dims[1];
          const pixels = h ? w * h : w;
          const answer = pixels * bitDepth;
          const dimText = h ? w + ' pixel × ' + h + ' pixel' : w + ' pixels';
          return {
            badge: 'Size in bits',
            text: h
              ? 'A ' + dimText + ' bitmap image contains ' + colours.toLocaleString() + ' different colours.\n\nCalculate the minimum file size of the image in <strong>bits</strong>.'
              : 'A bitmap image is made up of ' + pixels.toLocaleString() + ' pixels and contains ' + colours.toLocaleString() + ' colours.\n\nCalculate the minimum file size of the image in <strong>bits</strong>.',
            answerNum: answer,
            unitLabel: 'bits'
          };
        }

        function genSizeUnit() {
          const units = bitmapUnits(mode);
          const answers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 0.5, 0.25, 0.75];
          for (let i = 0; i < 100; i++) {
            const unit = pick(units);
            const ans = pick(answers);
            const totalBits = ans * unit.factor;
            if (!Number.isInteger(totalBits)) continue;
            const bitDepth = pick([1, 2, 3, 4, 6, 8]);
            const colours = 2 ** bitDepth;
            if (totalBits % bitDepth !== 0) continue;
            const pixels = totalBits / bitDepth;
            const dims = niceFactors(pixels);
            if (!dims) continue;
            const w = dims[0], h = dims[1];
            const dimText = h ? w.toLocaleString() + ' × ' + h.toLocaleString() + ' pixels' : w.toLocaleString() + ' pixels';
            return {
              badge: 'Size in ' + unit.label,
              text: 'A bitmap image is ' + dimText + ' and contains ' + colours.toLocaleString() + ' different colours.\n\nCalculate the minimum file size in <strong>' + unit.label + '</strong>.',
              answerNum: ans,
              unitLabel: unit.label
            };
          }
          return genSizeBits();
        }

        function genMaxColoursDepth() {
          const depth = pick([1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24]);
          return {
            badge: 'Max colours',
            text: 'State the maximum number of different colours that can be used in a bitmap image that has a colour depth of <strong>' + depth + ' bits</strong>.',
            answerNum: 2 ** depth,
            unitLabel: 'colours'
          };
        }

        function genColourDepth() {
          const depth = pick([1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 24]);
          const colours = pick([2 ** depth - 1, 2 ** depth].filter(function (n) { return n >= 2; }));
          return {
            badge: 'Colour depth',
            text: 'A bitmap image uses ' + colours.toLocaleString() + ' different colours.\n\nCalculate the minimum number of bits per pixel (colour depth) needed to store this image.',
            answerNum: minBitsForColours(colours),
            unitLabel: 'bits per pixel'
          };
        }

        function genMaxColoursSize() {
          for (let i = 0; i < 100; i++) {
            const bitDepth = pick([1, 2, 4, 8, 16, 24]);
            const dims = niceFactors(pick([100, 200, 400, 800, 1000, 2000, 4000, 8000, 100 * 100, 200 * 150, 1000 * 800, 800 * 600, 4000 * 3000, 128 * 128, 256 * 256, 512 * 512]));
            if (!dims) continue;
            const w = dims[0], h = dims[1];
            const pixels = h ? w * h : w;
            const totalBits = pixels * bitDepth;
            const unit = pick(bitmapUnits(mode));
            const sizeInUnit = totalBits / unit.factor;
            const frac = sizeInUnit - Math.floor(sizeInUnit);
            if ([0, 0.5, 0.25, 0.75].indexOf(frac) === -1) continue;
            if (sizeInUnit < 0.25 || sizeInUnit > 100000) continue;
            const dimText = h ? w.toLocaleString() + ' pixels wide by ' + h.toLocaleString() + ' pixels high' : w.toLocaleString() + ' pixels';
            return {
              badge: 'Max colours',
              text: 'A bitmap image is ' + dimText + '.\n\nThe image takes up <strong>' + fmtAnswer(sizeInUnit) + ' ' + unit.label + '</strong> of storage space when represented as a bitmap, excluding metadata.\n\nCalculate the maximum number of different colours that could appear in the image.',
              answerNum: 2 ** bitDepth,
              unitLabel: 'colours'
            };
          }
          return genMaxColoursDepth();
        }

        const generatorByType = {
          sizeBits: genSizeBits,
          sizeUnit: genSizeUnit,
          maxColoursDepth: genMaxColoursDepth,
          colourDepth: genColourDepth,
          maxColoursSize: genMaxColoursSize
        };
        const active = questionTypes
          .map(function (type) { return generatorByType[type]; })
          .filter(Boolean);
        const pool = active.length ? active : [genSizeBits, genSizeUnit, genMaxColoursDepth, genColourDepth, genMaxColoursSize];
        return pick(pool)();
      }
    },

    sound: {
      generate: function (options) {
        const opts = options || {};
        const unitsMode = opts.unitsMode || 'mix';
        const nyquistOn = opts.nyquistOn !== false;
        const questionTypes = Array.isArray(opts.questionTypes) && opts.questionTypes.length
          ? opts.questionTypes
          : ['fileSizeBits', 'fileSizeBytes', 'fileSizeUnit', 'solveResolution', 'halvingEffect', 'duration', 'nyquist'];

        function genFileSizeBits() {
          const shortRates = [8000, 11025, 16000, 22050, 32000, 44100];
          const shortDepths = [4, 8, 12, 16];
          const shortDurations = [1, 2, 3, 4, 5, 8, 10, 12, 15, 20, 30, 45, 60];
          for (let i = 0; i < 250; i++) {
            const rate = pick(shortRates);
            const res = pick(shortDepths);
            const secs = pick(shortDurations);
            const answer = rate * res * secs;
            if (answer >= 64000 && answer <= 8000000) {
              return {
                badge: 'File Size',
                text: 'A sound clip is recorded at a sampling rate of <strong>' + fmtHz(rate) + '</strong> with a sample resolution of <strong>' + res + ' bits</strong>, lasting <strong>' + fmtSecs(secs) + '</strong>.\n\nCalculate the file size in <strong>bits</strong>.',
                answerNum: answer,
                unitLabel: 'bits'
              };
            }
          }
          const rate = pick([8000, 16000, 22050]);
          const res = pick([8, 16]);
          const secs = pick([5, 10, 15, 20, 30]);
          return {
            badge: 'File Size',
            text: 'A sound clip is recorded at a sampling rate of <strong>' + fmtHz(rate) + '</strong> with a sample resolution of <strong>' + res + ' bits</strong>, lasting <strong>' + fmtSecs(secs) + '</strong>.\n\nCalculate the file size in <strong>bits</strong>.',
            answerNum: rate * res * secs,
            unitLabel: 'bits'
          };
        }

        function genFileSizeBytes() {
          const shortRates = [8000, 11025, 16000, 22050, 32000, 44100];
          const shortDepths = [8, 16];
          const shortDurations = [1, 2, 3, 4, 5, 8, 10, 12, 15, 20, 30, 45, 60];
          for (let i = 0; i < 250; i++) {
            const rate = pick(shortRates);
            const res = pick(shortDepths);
            const secs = pick(shortDurations);
            const answer = (rate * res * secs) / 8;
            if (answer >= 8000 && answer <= 1000000) {
              return {
                badge: 'File Size',
                text: 'A sound clip is recorded at a sampling rate of <strong>' + fmtHz(rate) + '</strong> with a sample resolution of <strong>' + res + ' bits</strong>, lasting <strong>' + fmtSecs(secs) + '</strong>.\n\nCalculate the file size in <strong>bytes</strong>.',
                answerNum: answer,
                unitLabel: 'bytes'
              };
            }
          }
          const rate = pick([8000, 16000, 22050]);
          const res = pick([8, 16]);
          const secs = pick([5, 10, 15, 20, 30]);
          return {
            badge: 'File Size',
            text: 'A sound clip is recorded at a sampling rate of <strong>' + fmtHz(rate) + '</strong> with a sample resolution of <strong>' + res + ' bits</strong>, lasting <strong>' + fmtSecs(secs) + '</strong>.\n\nCalculate the file size in <strong>bytes</strong>.',
            answerNum: (rate * res * secs) / 8,
            unitLabel: 'bytes'
          };
        }

        function genFileSizeUnit() {
          const units = soundUnits(unitsMode);
          const clean = [1, 2, 4, 8, 16, 32, 64, 128, 256, 0.5, 0.25, 0.75];
          const largeUnits = units.filter(function (u) { return u.label === 'GB' || u.label === 'GiB'; });
          const smallUnits = units.filter(function (u) { return u.label !== 'GB' && u.label !== 'GiB'; });

          // Give GB/GiB a dedicated path so they appear in practice.
          if (largeUnits.length && Math.random() < 0.4) {
            const largeSecs = [300, 600, 900, 1200, 1500, 1800];
            for (let i = 0; i < 300; i++) {
              const unit = pick(largeUnits);
              const ratePool = unit.label === 'GiB' ? SOUND_RATES_IEC_LARGE : SOUND_RATES_SI;
              const rate = pick(ratePool);
              const res = pick([8, 16, 24, 32]);
              const secs = pick(largeSecs);
              const ans = (rate * res * secs) / unit.bitsPerUnit;
              if (ans >= 0.25 && ans <= 8) {
                return {
                  badge: 'File Size',
                  text: 'A sound clip is recorded at a sampling rate of <strong>' + fmtHz(rate) + '</strong> with a sample resolution of <strong>' + res + ' bits</strong>, lasting <strong>' + fmtSecs(secs) + '</strong>.\n\nCalculate the file size in <strong>' + unit.label + '</strong>.',
                  answerNum: parseFloat(ans.toFixed(4)),
                  unitLabel: unit.label
                };
              }
            }
          }

          const weightedUnits = (smallUnits.length ? smallUnits : units);
          for (let i = 0; i < 400; i++) {
            const unit = pick(weightedUnits);
            const ratePool = /iB$/.test(unit.label) ? SOUND_RATES_IEC : SOUND_RATES_SI;
            const rate = pick(ratePool);
            const res = pick(SOUND_DEPTHS);
            const ans = pick(clean);
            const totalBits = ans * unit.bitsPerUnit;
            const secsExact = totalBits / (rate * res);
            if (Number.isInteger(secsExact) && secsExact >= 1 && secsExact <= 1800) {
              return {
                badge: 'File Size',
                text: 'A sound clip is recorded at a sampling rate of <strong>' + fmtHz(rate) + '</strong> with a sample resolution of <strong>' + res + ' bits</strong>, lasting <strong>' + fmtSecs(secsExact) + '</strong>.\n\nCalculate the file size in <strong>' + unit.label + '</strong>.',
                answerNum: ans,
                unitLabel: unit.label
              };
            }
          }
          return genFileSizeBits();
        }

        function formatSizeValue(n) {
          if (Number.isInteger(n)) return n.toLocaleString();
          var rounded = Math.round(n * 10000) / 10000;
          return rounded.toLocaleString(undefined, { maximumFractionDigits: 4 });
        }

        function isNiceNumber(n) {
          const frac = n - Math.floor(n);
          return frac === 0 || frac === 0.5 || frac === 0.25 || frac === 0.75;
        }

        function pickSoundSizeDisplay(totalBits, rate, res) {
          const displayUnits = [{ label: 'bits', bitsPerUnit: 1 }, { label: 'bytes', bitsPerUnit: 8 }]
            .concat(soundUnits(unitsMode).map(function (u) {
              return { label: u.label, bitsPerUnit: u.bitsPerUnit };
            }));

          const candidates = displayUnits.map(function (unit) {
            return { label: unit.label, value: totalBits / unit.bitsPerUnit, bitsPerUnit: unit.bitsPerUnit };
          }).filter(function (c) {
            if (!Number.isFinite(c.value) || c.value <= 0) return false;
            // Validate that if we reverse-calculate duration, we get a nice answer
            if (rate && res) {
              const duration = (c.value * c.bitsPerUnit) / (rate * res);
              if (!isNiceNumber(duration) || duration < 0.5 || duration > 1800) {
                return false;
              }
            }
            if (c.label === 'GB' || c.label === 'GiB' || c.label === 'MB' || c.label === 'MiB' || c.label === 'kB' || c.label === 'kiB') {
              return c.value >= 0.25;
            }
            if (c.label === 'bytes') return c.value >= 1;
            return true;
          });

          if (!candidates.length) return { value: totalBits, label: 'bits' };

          return pick(candidates);
        }

        function genSolveResolution() {
          const rate = pick(SOUND_RATES_HZ);
          const res = pick(SOUND_DEPTHS);
          const secs = pick(SOUND_DURATIONS);
          const totalBits = rate * res * secs;
          const shownSize = pickSoundSizeDisplay(totalBits, rate, res);
          return {
            badge: 'Solve',
            text: 'A sound file is <strong>' + formatSizeValue(shownSize.value) + ' ' + shownSize.label + '</strong> in size and lasts <strong>' + fmtSecs(secs) + '</strong>.\n\nIt was recorded at a sampling rate of <strong>' + fmtHz(rate) + '</strong>.\n\nWhat is the <strong>sample resolution</strong> in bits?',
            answerNum: res,
            unitLabel: 'bits'
          };
        }

        function genNyquist() {
          const freq = pick([4000, 5000, 8000, 10000, 11000, 15000, 16000, 20000]);
          return {
            badge: 'Nyquist',
            text: 'A sound has a highest frequency component of <strong>' + fmtHz(freq) + '</strong>.\n\nWhat is the <strong>minimum sampling rate</strong> required to accurately represent it digitally?',
            answerNum: freq * 2,
            unitLabel: 'Hz'
          };
        }

        function genHalvingEffect() {
          const choices = [
            { q: 'the sampling rate is <strong>halved</strong>', factor: 0.5 },
            { q: 'the sample resolution is <strong>halved</strong>', factor: 0.5 },
            { q: 'the sampling rate is <strong>doubled</strong>', factor: 2 },
            { q: 'the sample resolution is <strong>doubled</strong>', factor: 2 },
            { q: 'the duration is <strong>halved</strong>', factor: 0.5 },
            { q: 'the duration is <strong>doubled</strong>', factor: 2 }
          ];
          const displayUnits = [{ label: 'bits', bitsPerUnit: 1 }, { label: 'bytes', bitsPerUnit: 8 }]
            .concat(soundUnits(unitsMode).map(function (u) {
              return { label: u.label, bitsPerUnit: u.bitsPerUnit };
            }));

          function cleanSizeCandidates(totalBits) {
            return displayUnits.map(function (unit) {
              return { label: unit.label, bitsPerUnit: unit.bitsPerUnit, value: totalBits / unit.bitsPerUnit };
            }).filter(function (c) {
              if (!Number.isFinite(c.value) || c.value <= 0) return false;
              if (!isNiceNumber(c.value)) return false;
              if (c.label === 'bytes' && c.value < 1) return false;
              if ((c.label === 'kB' || c.label === 'kiB' || c.label === 'MB' || c.label === 'MiB' || c.label === 'GB' || c.label === 'GiB') && c.value < 0.25) return false;
              return true;
            });
          }

          for (let i = 0; i < 500; i++) {
            const rate = pick(SOUND_RATES_HZ);
            const res = pick(SOUND_DEPTHS);
            const secs = pick(SOUND_DURATIONS);
            const ch = pick(choices);
            const origBits = rate * res * secs;
            const newBits = origBits * ch.factor;
            if (!Number.isInteger(newBits)) continue;

            const origCandidates = cleanSizeCandidates(origBits);
            const ansCandidates = cleanSizeCandidates(newBits);
            if (!origCandidates.length || !ansCandidates.length) continue;

            const answerUnit = pick(ansCandidates);
            const altPromptCandidates = origCandidates.filter(function (c) { return c.label !== answerUnit.label; });
            const promptUnit = altPromptCandidates.length ? pick(altPromptCandidates) : pick(origCandidates);

            return {
              badge: 'File Size',
              text: 'A sound file has a size of <strong>' + formatSizeValue(promptUnit.value) + ' ' + promptUnit.label + '</strong>.\n\nWhat is the new file size in <strong>' + answerUnit.label + '</strong> if ' + ch.q + '?',
              answerNum: newBits / answerUnit.bitsPerUnit,
              unitLabel: answerUnit.label
            };
          }

          const ch = pick(choices);
          const rate = pick([8000, 16000, 22050]);
          const res = pick([8, 16]);
          const secs = pick([10, 20, 30, 60]);
          const origBits = rate * res * secs;
          const answerUnit = { label: 'bytes', bitsPerUnit: 8 };
          return {
            badge: 'File Size',
            text: 'A sound file has a size of <strong>' + formatSizeValue(origBits / 8) + ' bytes</strong>.\n\nWhat is the new file size in <strong>' + answerUnit.label + '</strong> if ' + ch.q + '?',
            answerNum: (origBits * ch.factor) / answerUnit.bitsPerUnit,
            unitLabel: answerUnit.label
          };
        }

        function genDuration() {
          const rate = pick(SOUND_RATES_HZ);
          const res = pick(SOUND_DEPTHS);
          const secs = pick(SOUND_DURATIONS);
          const totalBits = rate * res * secs;
          const shownSize = pickSoundSizeDisplay(totalBits, rate, res);
          return {
            badge: 'Solve',
            text: 'A sound file is <strong>' + formatSizeValue(shownSize.value) + ' ' + shownSize.label + '</strong> in size.\n\nIt was recorded at <strong>' + fmtHz(rate) + '</strong> with a sample resolution of <strong>' + res + ' bits</strong>.\n\nHow long is the recording in <strong>seconds</strong>?',
            answerNum: secs,
            unitLabel: 'seconds'
          };
        }

        const generatorByType = {
          fileSizeBits: genFileSizeBits,
          fileSizeBytes: genFileSizeBytes,
          fileSizeUnit: genFileSizeUnit,
          solveResolution: genSolveResolution,
          halvingEffect: genHalvingEffect,
          duration: genDuration,
          nyquist: nyquistOn ? genNyquist : null
        };
        const active = questionTypes
          .map(function (type) { return generatorByType[type]; })
          .filter(Boolean);
        const fallback = nyquistOn
          ? [genFileSizeBits, genFileSizeBytes, genFileSizeUnit, genSolveResolution, genHalvingEffect, genDuration, genNyquist]
          : [genFileSizeBits, genFileSizeBytes, genFileSizeUnit, genSolveResolution, genHalvingEffect, genDuration];
        const pool = active.length ? active : fallback;
        return pick(pool)();
      }
    },

    binaryArithmetic: {
      generate: function (questionType) {
        var mode = questionType === 'add' || questionType === 'mul' ? questionType : 'mixed';
        if (mode === 'add') return binaryArithmeticAdditionQuestion();
        if (mode === 'mul') return binaryArithmeticMultiplicationQuestion();
        return Math.random() < 0.5
          ? binaryArithmeticAdditionQuestion()
          : binaryArithmeticMultiplicationQuestion();
      }
    },

    huffman: {
      generate: function (questionType) {
        const mode = (questionType === 'type1' || questionType === 'type2')
          ? questionType
          : 'mixed';
        const currentType = mode === 'mixed' ? pick(['type1', 'type2']) : mode;
        const phrase = pick(HUFFMAN_PHRASE_POOL);
        const data = huffmanDataForText(phrase);
        const symbols = currentType === 'type1'
          ? huffmanSymbolPoolForType1(data.codes)
          : [];

        return {
          currentType: currentType,
          phrase: phrase,
          data: data,
          symbols: symbols
        };
      }
    },

    rle: {
      generate: function (questionType) {
        var validTypes = ['type1', 'type2', 'type3', 'type4'];
        var mode = validTypes.indexOf(questionType) !== -1 ? questionType : 'mixed';
        var currentType = mode === 'mixed' ? pick(['type1', 'type2', 'type3', 'type4']) : mode;
        var example = currentType === 'type2'
          ? { text: 'JJJOOPP', encoded: '(J, 3), (O, 2), (P, 2)' }
          : currentType === 'type3' || currentType === 'type4'
          ? null
          : { text: 'AAAAGGGTT', encoded: 'A4G3T2', inputLength: 9, encodedLength: 6, saved: 3 };
        var data = currentType === 'type2'
          ? rleGenerateType2Data()
          : currentType === 'type3'
          ? rleGenerateType3Data()
          : currentType === 'type4'
          ? rleGenerateType4Data()
          : rleGenerateType1Data();

        return {
          currentType: currentType,
          example: example,
          data: data
        };
      }
    }
  };
})();