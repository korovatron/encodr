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
            'State the representable denary range for fixed point (' + n + ' total bits, ' + frac + ' fractional bits).',
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
            result.isInexact = Math.random() < 0.25;
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
          const eBits = (eMin + 2 ** (eLen - 1)).toString(2).split('').map(function (ch) { return ch === '1' ? 1 : 0; });
          while (eBits.length < eLen) eBits.unshift(0);
          const minPos = 0.5 * 2 ** eMin;
          result.mBits = [0].concat(Array(mLen - 1).fill(0));
          result.eBits = eBits;
          result.storedValue = minPos;
          result.targetDenary = minPos;
          result.extremaType = '3';
          return result;
        }

        if (currentType === '4') {
          const eMax = 2 ** (eLen - 1) - 1;
          const eBits = (eMax + 2 ** (eLen - 1)).toString(2).split('').map(function (ch) { return ch === '1' ? 1 : 0; });
          while (eBits.length < eLen) eBits.unshift(0);
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
          const eBits = (eMin + 2 ** (eLen - 1)).toString(2).split('').map(function (ch) { return ch === '1' ? 1 : 0; });
          while (eBits.length < eLen) eBits.unshift(0);
          const maxNeg = -0.5 * 2 ** eMin;
          result.mBits = [1].concat(Array(mLen - 1).fill(0));
          result.eBits = eBits;
          result.storedValue = maxNeg;
          result.targetDenary = maxNeg;
          result.extremaType = '5';
          return result;
        }

        const eMax = 2 ** (eLen - 1) - 1;
        const eBits = (eMax + 2 ** (eLen - 1)).toString(2).split('').map(function (ch) { return ch === '1' ? 1 : 0; });
        while (eBits.length < eLen) eBits.unshift(0);
        const minNeg = -(1 - 2 ** (-(mLen - 1))) * 2 ** eMax;
        result.mBits = [1].concat(Array(mLen - 1).fill(1));
        result.eBits = eBits;
        result.storedValue = minNeg;
        result.targetDenary = minNeg;
        result.extremaType = '6';
        return result;
      }
    }
  };
})();