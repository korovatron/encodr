(function () {
  var MAX_INPUT_CHARS = 600;
  var MAX_DICT_ENTRIES = 80;

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

  function printableText(text) {
    return String(text).replace(/ /g, '[space]');
  }

  function setText(id, value) {
    var el = byId(id);
    if (el) el.textContent = String(value);
  }

  function splitWordPart(part) {
    var m = /^([^A-Za-z0-9']*)([A-Za-z0-9']+)([^A-Za-z0-9']*)$/.exec(String(part));
    if (!m) {
      return {
        prefix: '',
        core: '',
        suffix: '',
        key: ''
      };
    }
    return {
      prefix: m[1],
      core: m[2],
      suffix: m[3],
      key: m[2].toLowerCase()
    };
  }

  function tokenizeText(text) {
    var matches = String(text).match(/[A-Za-z0-9']+|[^A-Za-z0-9']+/g);
    return matches || [];
  }


  function getWordStats(text) {
    var map = new Map();
    var parts = tokenizeText(text);
    var seenIndex = 0;

    parts.forEach(function (part) {
      if (!part || !/^[A-Za-z0-9']+$/.test(part)) return;
      var token = {
        core: part,
        key: part.toLowerCase()
      };

      if (!map.has(token.key)) {
        map.set(token.key, {
          key: token.key,
          value: token.core,
          count: 0,
          len: token.key.length,
          forms: new Map(),
          firstSeen: seenIndex
        });
        seenIndex += 1;
      }

      var entry = map.get(token.key);
      entry.count += 1;
      entry.forms.set(token.core, (entry.forms.get(token.core) || 0) + 1);

      if (!entry.forms.has(entry.value) || entry.forms.get(token.core) > entry.forms.get(entry.value)) {
        entry.value = token.core;
      }
    });

    var rows = [];
    map.forEach(function (entry) {
      rows.push(entry);
    });

    rows.sort(function (a, b) {
      return a.firstSeen - b.firstSeen;
    });

    return rows;
  }

  function chooseDictionaryEntries(text) {
    var candidates = getWordStats(text).slice(0, MAX_DICT_ENTRIES);
    return candidates.map(function (entry, idx) {
      return {
        token: 'T' + (idx + 1),
        key: entry.key,
        value: entry.value,
        count: 0,
        len: entry.len
      };
    });
  }

  function encodeWithDictionary(text, dictionary) {
    var byWord = new Map();
    dictionary.forEach(function (entry) {
      byWord.set(entry.key, entry);
    });

    var encodedParts = [];
    var encodedSymbols = 0;
    var parts = tokenizeText(text);

    parts.forEach(function (part) {
      if (!part) return;
      if (!/^[A-Za-z0-9']+$/.test(part)) {
        encodedParts.push(part);
        encodedSymbols += part.length;
        return;
      }

      var key = part.toLowerCase();
      var matched = byWord.get(key);
      if (matched) {
        encodedParts.push('<' + matched.token + '>');
        matched.count += 1;
        encodedSymbols += 1;
      } else {
        encodedParts.push(part);
        encodedSymbols += part.length;
      }
    });

    var encoded = encodedParts.join('');
    var dictChars = dictionary.reduce(function (sum, entry) {
      return sum + entry.value.length;
    }, 0);

    return {
      encoded: encoded,
      encodedSymbols: encodedSymbols,
      dictChars: dictChars
    };
  }

  function buildCompression(text) {
    if (!text.length) {
      return {
        text: '',
        dictionary: [],
        encoded: '',
        inputSymbols: 0,
        encodedSymbols: 0,
        dictChars: 0,
        saved: 0,
        ratio: 0
      };
    }

    var dictionary = chooseDictionaryEntries(text);
    var encodedData = encodeWithDictionary(text, dictionary);

    var storageEstimate = encodedData.encodedSymbols + encodedData.dictChars;
    var saved = text.length - storageEstimate;
    var ratio = text.length > 0 ? (saved / text.length) * 100 : 0;

    return {
      text: text,
      dictionary: dictionary,
      encoded: encodedData.encoded,
      inputSymbols: text.length,
      encodedSymbols: encodedData.encodedSymbols,
      dictChars: encodedData.dictChars,
      saved: saved,
      ratio: ratio
    };
  }

  function renderDictionaryTable(id, dictionary) {
    var host = byId(id);
    if (!host) return;
    if (!dictionary.length) {
      host.innerHTML = '<tr><td colspan="4">Enter text with repeated words to build a dictionary.</td></tr>';
      return;
    }

    host.innerHTML = dictionary.map(function (entry) {
      return '<tr>' +
        '<td><span class="dc-inline-token">' + escapeHtml(entry.token) + '</span></td>' +
        '<td><span class="dc-inline-text">' + escapeHtml(printableText(entry.value)) + '</span></td>' +
        '<td>' + entry.len + '</td>' +
        '<td>' + entry.count + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderExplore() {
    var input = byId('dc-input');
    var encodedEl = byId('dc-encoded');
    if (!input || !encodedEl) return;

    var text = input.value || '';
    if (text.length > MAX_INPUT_CHARS) {
      text = text.slice(0, MAX_INPUT_CHARS);
      input.value = text;
    }

    var data = buildCompression(text);

    if (!text.length) {
      encodedEl.textContent = 'Encoded output with tokens will appear here.';
      setText('dc-input-symbols', 0);
      setText('dc-encoded-symbols', 0);
      setText('dc-saved-symbols', 0);
      setText('dc-ratio', '0.0% reduction estimate');
      renderDictionaryTable('dc-dict-table', []);
      return;
    }

    encodedEl.textContent = data.encoded;
    setText('dc-input-symbols', data.inputSymbols);
    setText('dc-encoded-symbols', data.encodedSymbols);
    setText('dc-saved-symbols', data.saved);
    setText('dc-ratio', data.ratio.toFixed(1) + '% reduction estimate (including dictionary entries)');
    renderDictionaryTable('dc-dict-table', data.dictionary);
  }

  function wireSamples() {
    var input = byId('dc-input');
    if (!input) return;

    var sampleButtons = Array.from(document.querySelectorAll('[data-dc-sample]'));
    var samples = {
      peter: 'Peter Piper picked a peck of pickled peppers.\nA peck of pickled peppers Peter Piper picked.\nIf Peter Piper picked a peck of pickled peppers,\nWhere\'s the peck of pickled peppers Peter Piper picked?',
      shesells: 'She sells sea-shells on the sea-shore.\nThe shells she sells are sea-shells, I\'m sure. \nFor if she sells sea-shells on the sea-shore\nThen I\'m sure she sells sea-shore shells.'
    };

    function setActive(activeKey) {
      sampleButtons.forEach(function (btn) {
        var key = btn.getAttribute('data-dc-sample');
        btn.classList.toggle('btn-submit', key === activeKey);
      });
    }

    sampleButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-dc-sample');
        if (key === 'clear') {
          setActive(null);
          input.value = '';
          renderExplore();
          input.focus();
          return;
        }

        if (Object.prototype.hasOwnProperty.call(samples, key)) {
          setActive(key);
          input.value = samples[key];
          renderExplore();
          input.focus();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = byId('dc-input');
    if (!input) return;

    input.value = 'Peter Piper picked a peck of pickled peppers.\nA peck of pickled peppers Peter Piper picked.\nIf Peter Piper picked a peck of pickled peppers,\nWhere\'s the peck of pickled peppers Peter Piper picked?';
    input.addEventListener('input', renderExplore);

    wireSamples();
    renderExplore();
  });
})();
