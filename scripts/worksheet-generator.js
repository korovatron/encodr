(function () {
  const DEFAULT_TITLE = "Encodr Worksheet";

  const TOPICS = [
    {
      id: "unsigned",
      label: "Unsigned Binary and Hex",
      subtypes: [
        { id: "1", label: "Binary to denary" },
        { id: "2", label: "Denary to binary" },
        { id: "3", label: "Denary to hex" },
        { id: "4", label: "Hex to denary" },
        { id: "5", label: "Binary to hex" },
        { id: "6", label: "Hex to binary" },
        { id: "7", label: "Representable range" }
      ]
    },
    {
      id: "fixed",
      label: "Fixed Point Binary",
      subtypes: [
        { id: "1", label: "Binary to denary" },
        { id: "2", label: "Denary to binary" },
        { id: "3", label: "Representable range" }
      ]
    },
    {
      id: "twos",
      label: "Two's Complement",
      subtypes: [
        { id: "1", label: "Binary to denary" },
        { id: "2", label: "Denary to binary" },
        { id: "3", label: "Representable range" }
      ]
    },
    {
      id: "floating",
      label: "Floating Point",
      subtypes: [
        { id: "1", label: "Binary to denary" },
        { id: "2", label: "Denary to binary" },
        { id: "extrema", label: "Extrema" }
      ]
    },
    {
      id: "bitmap",
      label: "Bitmapped images",
      subtypes: [
        { id: "mixed", label: "Mixed questions" }
      ],
      options: [
        {
          id: "unitsMode",
          label: "Units mode",
          kind: "radio",
          values: [
            { value: "mix", label: "Mixed SI + IEC" },
            { value: "si", label: "SI only (kB, MB...)" },
            { value: "iec", label: "IEC only (kiB, MiB...)" }
          ],
          defaultValue: "mix"
        }
      ]
    },
    {
      id: "sound",
      label: "Sound Sampling",
      subtypes: [
        { id: "mixed", label: "Mixed questions" }
      ],
      options: [
        {
          id: "includeNyquist",
          label: "Include Nyquist questions",
          kind: "checkbox",
          defaultValue: true
        },
        {
          id: "unitsMode",
          label: "Units mode",
          kind: "radio",
          values: [
            { value: "mix", label: "Mixed SI + IEC" },
            { value: "si", label: "SI only (kB, MB...)" },
            { value: "iec", label: "IEC only (kiB, MiB...)" }
          ],
          defaultValue: "mix"
        }
      ]
    },
    {
      id: "huffman",
      label: "Huffman Coding",
      subtypes: [
        { id: "mixed", label: "Random Huffman question type" }
      ]
    }
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function safeNum(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function plainText(html) {
    var div = document.createElement("div");
    div.innerHTML = String(html || "");
    return div.textContent.replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").trim();
  }

  function formatNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
    var rounded = Number(value.toPrecision(12));
    return String(rounded);
  }

  function normalizeTitle(value) {
    var t = String(value || "").trim();
    return t || DEFAULT_TITLE;
  }

  function slugify(value) {
    var slug = normalizeTitle(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "encodr-worksheet";
  }

  var soundFileSizeLastKind = null;
  var soundFileSizeStreak = 0;

  function instructionForAnswerKind(kind) {
    if (kind === "bin") return "Write your answer as a binary number.";
    if (kind === "hex") return "Write your answer as a hexadecimal number.";
    if (kind === "range") return "Write your answer as a denary range: minimum to maximum.";
    return "Write your answer as a denary number.";
  }

  function renderTopicControls() {
    var root = byId("ws-topics");
    if (!root) return;

    root.innerHTML = TOPICS.map(function (topic) {
      var optionsHtml = "";
      var hasMultipleSubtypes = Array.isArray(topic.subtypes) && topic.subtypes.length > 1;
      if (Array.isArray(topic.options) && topic.options.length) {
        optionsHtml = '<div class="ws-subtypes ws-options">' + topic.options.map(function (opt) {
          if (opt.kind === "select") {
            return '<label class="ws-cb" for="opt-' + topic.id + '-' + opt.id + '">' +
              '<span>' + opt.label + '</span>' +
              '<select class="ws-select" id="opt-' + topic.id + '-' + opt.id + '">' +
              opt.values.map(function (entry) {
                var selected = entry.value === opt.defaultValue ? " selected" : "";
                return '<option value="' + entry.value + '"' + selected + '>' + entry.label + '</option>';
              }).join("") +
              "</select>" +
              "</label>";
          }
          if (opt.kind === "radio") {
            return '<div class="ws-radio-group">' +
              '<div class="ws-radio-title">' + opt.label + '</div>' +
              opt.values.map(function (entry, idx) {
                var id = 'opt-' + topic.id + '-' + opt.id + '-' + idx;
                var checked = entry.value === opt.defaultValue ? ' checked' : '';
                return '<label class="ws-cb" for="' + id + '">' +
                  '<input type="radio" id="' + id + '" name="opt-' + topic.id + '-' + opt.id + '" value="' + entry.value + '"' + checked + ' />' +
                  '<span>' + entry.label + '</span>' +
                  '</label>';
              }).join('') +
              '</div>';
          }
          if (opt.kind === "checkbox") {
            var checked = opt.defaultValue ? " checked" : "";
            return '<label class="ws-cb" for="opt-' + topic.id + '-' + opt.id + '">' +
              '<input type="checkbox" id="opt-' + topic.id + '-' + opt.id + '"' + checked + ' />' +
              '<span>' + opt.label + '</span>' +
              '</label>';
          }
          return "";
        }).join("") + "</div>";
      }

      return '<section class="ws-topic" data-topic="' + topic.id + '">' +
        '<label class="ws-topic-head">' +
        '<input type="checkbox" class="ws-topic-enable" id="topic-' + topic.id + '"' + (topic.enabledByDefault === false ? '' : ' checked') + ' />' +
        '<span>' + topic.label + '</span>' +
        '</label>' +
        (hasMultipleSubtypes
          ? ('<div class="ws-subtypes" id="subs-' + topic.id + '">' +
            topic.subtypes.map(function (sub) {
              return '<label class="ws-cb">' +
                '<input type="checkbox" class="ws-sub" data-topic="' + topic.id + '" value="' + sub.id + '" checked />' +
                '<span>' + sub.label + '</span>' +
                '</label>';
            }).join("") +
            "</div>")
          : '') +
        optionsHtml +
        "</section>";
    }).join("");

    var topicToggles = root.querySelectorAll(".ws-topic-enable");
    topicToggles.forEach(function (toggle) {
      toggle.addEventListener("change", function () {
        var topicId = toggle.id.replace("topic-", "");
        var subWrap = byId("subs-" + topicId);
        var topicSection = root.querySelector('[data-topic="' + topicId + '"]');
        if (!topicSection) return;

        if (subWrap) {
          var subChecks = subWrap.querySelectorAll("input[type='checkbox']");
          subChecks.forEach(function (cb) {
            cb.disabled = !toggle.checked;
          });
        }

        var selects = topicSection.querySelectorAll("select");
        selects.forEach(function (sel) {
          sel.disabled = !toggle.checked;
        });

        var optionChecks = topicSection.querySelectorAll(".ws-options input[type='checkbox']");
        optionChecks.forEach(function (cb) {
          cb.disabled = !toggle.checked;
        });

        var optionRadios = topicSection.querySelectorAll(".ws-options input[type='radio']");
        optionRadios.forEach(function (rb) {
          rb.disabled = !toggle.checked;
        });
      });
    });
  }

  function readSelections() {
    var selections = [];

    TOPICS.forEach(function (topic) {
      var enabled = byId("topic-" + topic.id);
      if (!enabled || !enabled.checked) return;

      var checkedSubs = Array.from(document.querySelectorAll('.ws-sub[data-topic="' + topic.id + '"]:checked'));
      var subtypeIds = checkedSubs.map(function (cb) { return cb.value; });
      if (!subtypeIds.length && Array.isArray(topic.subtypes) && topic.subtypes.length === 1) {
        subtypeIds = [topic.subtypes[0].id];
      }
      if (!subtypeIds.length) return;

      var options = {};
      if (Array.isArray(topic.options)) {
        topic.options.forEach(function (opt) {
          var baseId = "opt-" + topic.id + "-" + opt.id;
          if (opt.kind === "checkbox") {
            var el = byId(baseId);
            if (!el) return;
            options[opt.id] = !!el.checked;
          } else if (opt.kind === "radio") {
            var selected = document.querySelector('input[name="' + baseId + '"]:checked');
            if (selected) options[opt.id] = selected.value;
          } else {
            var el = byId(baseId);
            if (!el) return;
            options[opt.id] = el.value;
          }
        });
      }

      selections.push({
        topicId: topic.id,
        topicLabel: topic.label,
        subtypeIds: subtypeIds,
        options: options
      });
    });

    return selections;
  }

  function buildSourcePool(selections) {
    var pool = [];
    selections.forEach(function (sel) {
      sel.subtypeIds.forEach(function (subtypeId) {
        pool.push({
          topicId: sel.topicId,
          topicLabel: sel.topicLabel,
          subtypeId: subtypeId,
          options: sel.options
        });
      });
    });
    return pool;
  }

  function floatingExtremaLabel(type) {
    if (type === "3") return "smallest positive";
    if (type === "4") return "largest positive";
    if (type === "5") return "largest negative";
    return "smallest negative";
  }

  function bitsInBinaryString(text) {
    return String(text || "").replace(/[^01]/g, "").length;
  }

  function huffmanPrintableSymbol(ch) {
    if (ch === " ") return "[space]";
    if (ch === "\n") return "[newline]";
    if (ch === "\t") return "[tab]";
    return ch;
  }

  function formatHuffmanSymbolList(symbols) {
    var names = symbols.map(function (sym) {
      return huffmanPrintableSymbol(sym);
    });

    if (names.length <= 1) return names.join("");
    if (names.length === 2) return names[0] + " and " + names[1];
    return names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
  }

  function binaryPointIndex(text) {
    var raw = String(text || "");
    var point = raw.indexOf(".");
    return point === -1 ? null : point;
  }

  function firstBinaryToken(text) {
    var m = String(text || "").match(/[01.]{6,}/);
    return m ? m[0] : null;
  }

  function mapQuestion(source) {
    var generators = window.EncodrQuizGenerators;
    if (!generators) {
      throw new Error("Generators are not loaded yet. Refresh and try again.");
    }

    if (source.topicId === "unsigned") {
      var uq = generators.unsigned.generate(source.subtypeId);
      var unsignedPrompt = plainText(uq.prompt);
      var unsignedAnswer = uq.answerKind === "range"
        ? formatNumber(uq.expectedMin) + " to " + formatNumber(uq.expectedMax)
        : String(uq.expectedText || uq.expectedValue);
      var unsignedLayout = null;
      var unsignedPromptBitBoxes = [];
      if (uq.answerKind === "bin") {
        unsignedLayout = {
          kind: "binaryBoxes",
          bits: bitsInBinaryString(uq.expectedText)
        };
      }
      if (source.subtypeId === "1" || source.subtypeId === "5") {
        var uqToken = firstBinaryToken(unsignedPrompt);
        if (uqToken) {
          if (source.subtypeId === "1") {
            unsignedPrompt = "Convert the binary value shown below to denary.";
          } else {
            unsignedPrompt = "Convert the binary value shown below to hexadecimal.";
          }
          unsignedPromptBitBoxes.push({
            label: "Binary value:",
            bitText: uqToken,
            bits: bitsInBinaryString(uqToken),
            pointIndex: binaryPointIndex(uqToken),
            showLabel: false
          });
        }
      }
      return {
        topic: source.topicLabel,
        prompt: unsignedPrompt,
        instruction: instructionForAnswerKind(uq.answerKind),
        answer: unsignedAnswer,
        answerLayout: unsignedLayout,
        promptBitBoxes: unsignedPromptBitBoxes
      };
    }

    if (source.topicId === "fixed") {
      var fq = generators.fixedPoint.generate(source.subtypeId);
      var fixedPrompt = plainText(fq.prompt);
      var fixedAnswer = fq.answerKind === "range"
        ? formatNumber(fq.expectedMin) + " to " + formatNumber(fq.expectedMax)
        : (fq.answerKind === "bin" ? fq.expectedBits : formatNumber(fq.expectedValue));
      var fixedLayout = null;
      var fixedPromptBitBoxes = [];
      if (source.subtypeId === "1" && fq.expectedBits) {
        fixedPrompt = "Convert the fixed-point binary value shown below into denary.";
        fixedPromptBitBoxes.push({
          label: "Fixed-point value:",
          bitText: fq.expectedBits,
          bits: Number.isFinite(fq.totalBits) ? fq.totalBits : bitsInBinaryString(fq.expectedBits),
          pointIndex: Number.isFinite(fq.leftBits) ? fq.leftBits : binaryPointIndex(fq.expectedBits),
          showLabel: false
        });
      }
      if (fq.answerKind === "bin") {
        fixedLayout = {
          kind: "binaryBoxes",
          bits: Number.isFinite(fq.totalBits) ? fq.totalBits : bitsInBinaryString(fq.expectedBits),
          pointIndex: Number.isFinite(fq.leftBits) ? fq.leftBits : null
        };
      }
      return {
        topic: source.topicLabel,
        prompt: fixedPrompt,
        instruction: instructionForAnswerKind(fq.answerKind),
        answer: fixedAnswer,
        answerLayout: fixedLayout,
        promptBitBoxes: fixedPromptBitBoxes
      };
    }

    if (source.topicId === "twos") {
      var tq = generators.twosComplement.generate(source.subtypeId);
      var twosPrompt = plainText(tq.prompt);
      var twosAnswer = tq.answerKind === "range"
        ? formatNumber(tq.expectedMin) + " to " + formatNumber(tq.expectedMax)
        : (tq.answerKind === "bin" ? tq.expectedBits : formatNumber(tq.expectedValue));
      var twosLayout = null;
      var twosPromptBitBoxes = [];
      if (source.subtypeId === "1" && tq.expectedBits) {
        twosPrompt = "Convert the two's complement binary value shown below into denary.";
        twosPromptBitBoxes.push({
          label: "Two's complement value:",
          bitText: tq.expectedBits,
          bits: Number.isFinite(tq.bits) ? tq.bits : bitsInBinaryString(tq.expectedBits),
          pointIndex: null,
          showLabel: false
        });
      }
      if (tq.answerKind === "bin") {
        twosLayout = {
          kind: "binaryBoxes",
          bits: Number.isFinite(tq.bits) ? tq.bits : bitsInBinaryString(tq.expectedBits)
        };
      }
      return {
        topic: source.topicLabel,
        prompt: twosPrompt,
        instruction: instructionForAnswerKind(tq.answerKind),
        answer: twosAnswer,
        answerLayout: twosLayout,
        promptBitBoxes: twosPromptBitBoxes
      };
    }

    if (source.topicId === "floating") {
      if (source.subtypeId === "1") {
        var f1 = generators.floatingPoint.generate("1");
        var mBits1 = f1.mBits.join("");
        var eBits1 = f1.eBits.join("");
        return {
          topic: source.topicLabel,
          prompt: "A floating-point number uses a " + f1.mLen + "-bit two's complement mantissa and a " + f1.eLen + "-bit two's complement exponent. The mantissa and exponent values are shown below. Convert this value to denary.",
          instruction: "Write your answer as a denary number.",
          answer: formatNumber(f1.targetDenary),
          answerLayout: null,
          promptBitBoxes: [
            { label: "Mantissa:", bitText: mBits1, bits: f1.mLen, pointIndex: null },
            { label: "Exponent:", bitText: eBits1, bits: f1.eLen, pointIndex: null }
          ]
        };
      }

      if (source.subtypeId === "2") {
        var f2 = generators.floatingPoint.generate("2");
        var mBits2 = f2.mBits.join("");
        var eBits2 = f2.eBits.join("");
        var absErr = Math.abs(f2.targetDenary - f2.storedValue);
        var relErr = f2.targetDenary === 0 ? 0 : (absErr / Math.abs(f2.targetDenary)) * 100;
        var fpPrompt = "Using a " + f2.mLen + "-bit two's complement mantissa and a " + f2.eLen + "-bit two's complement exponent, represent denary " + formatNumber(f2.targetDenary) + " in floating-point form.";
        var fpInstruction = "Write your answer as mantissa and exponent binary values.";
        if (f2.isInexact) {
          fpPrompt += " This value cannot be represented exactly. Use the closest representation, then calculate the absolute error and percentage relative error.";
          fpInstruction = "Write mantissa and exponent binary values, then absolute and percentage relative errors.";
        }
        var fpAnswer = "Mantissa: " + mBits2 + ", Exponent: " + eBits2;
        if (f2.isInexact) {
          fpAnswer += ", Absolute error: " + formatNumber(absErr) + ", Relative error: " + formatNumber(relErr) + "%";
        }
        return {
          topic: source.topicLabel,
          prompt: fpPrompt,
          instruction: fpInstruction,
          answer: fpAnswer,
          answerLayout: {
            kind: "mantissaExponent",
            mantissaBits: f2.mLen,
            exponentBits: f2.eLen,
            includeErrors: !!f2.isInexact
          },
          promptBitBoxes: []
        };
      }

      var fe = generators.floatingPoint.generate("extrema");
      return {
        topic: source.topicLabel,
        prompt: "What is the " + floatingExtremaLabel(fe.extremaType) + " denary value when a floating-point number is represented with a " + fe.mLen + "-bit two's complement mantissa and a " + fe.eLen + "-bit two's complement exponent?",
        instruction: "Write your answer as a denary number.",
        answer: formatNumber(fe.targetDenary),
        answerLayout: null,
        promptBitBoxes: []
      };
    }

    if (source.topicId === "bitmap") {
      var bitmapTypes = source.subtypeId === "mixed"
        ? ["sizeBits", "sizeUnit", "maxColoursDepth", "colourDepth", "maxColoursSize"]
        : [source.subtypeId];
      var bq = generators.bitmap.generate({
        unitsMode: source.options.unitsMode || "mix",
        questionTypes: bitmapTypes
      });
      return {
        topic: source.topicLabel,
        prompt: plainText(bq.text),
        instruction: "Write your answer as a number in " + bq.unitLabel + ".",
        answer: formatNumber(bq.answerNum) + " " + bq.unitLabel,
        answerLayout: null,
        promptBitBoxes: []
      };
    }

    if (source.topicId === "huffman") {
      var hq = generators.huffman.generate(source.subtypeId || "mixed");
      if (hq.currentType === "type1") {
        var symbols = Array.isArray(hq.symbols) ? hq.symbols : [];
        var codePairs = symbols.map(function (sym) {
          return huffmanPrintableSymbol(sym) + ": " + (hq.data.codes[sym] || "");
        }).join(", ");
        var hfSuffix1 = "is encoded into the Huffman tree below. Write down the codes for the letters";
        return {
          topic: source.topicLabel,
          prompt: "The phrase '" + hq.phrase + "' " + hfSuffix1 + " " + formatHuffmanSymbolList(symbols) + ".",
          promptPrefix: "The phrase",
          promptInlineBoxText: hq.phrase,
          promptSuffix: hfSuffix1,
          promptInlineSymbols: symbols,
          instruction: "Write each code in binary.",
          answer: codePairs,
          answerLayout: null,
          promptBitBoxes: [],
          promptTree: hq.data.tree || null
        };
      }

      var hfSuffix2 = "is encoded into the Huffman tree below. Calculate the number of ASCII bits, the number of Huffman bits, and the number of bits saved.";
      return {
        topic: source.topicLabel,
        prompt: "The phrase '" + hq.phrase + "' " + hfSuffix2,
        promptPrefix: "The phrase",
        promptInlineBoxText: hq.phrase,
        promptSuffix: hfSuffix2,
        instruction: "Write all three values as denary numbers.",
        answer: "ASCII bits: " + hq.data.asciiBits + ", Huffman bits: " + hq.data.huffmanBits + ", Bits saved: " + hq.data.savedBits,
        answerLayout: null,
        promptBitBoxes: [],
        promptTree: hq.data.tree || null
      };
    }

    var includeNyquist = source.options.includeNyquist !== false;
    var soundTypes = ["fileSizeBits", "fileSizeBytes", "fileSizeUnit", "solveResolution", "halvingEffect", "duration"];
    if (includeNyquist) soundTypes.push("nyquist");

    var sq = generators.sound.generate({
      unitsMode: source.options.unitsMode || "mix",
      nyquistOn: includeNyquist,
      questionTypes: soundTypes
    });

    return {
      topic: source.topicLabel,
      prompt: plainText(sq.text),
      instruction: "Write your answer as a number in " + sq.unitLabel + ".",
      answer: formatNumber(sq.answerNum) + " " + sq.unitLabel,
      answerLayout: null,
      promptBitBoxes: [],
      promptTree: null
    };
  }

  function buildWorksheetItems(count, selections) {
    soundFileSizeLastKind = null;
    soundFileSizeStreak = 0;

    var huffmanSelection = selections.find(function (sel) { return sel.topicId === "huffman"; }) || null;
    var otherSelections = selections.filter(function (sel) { return sel.topicId !== "huffman"; });

    // Distribute count evenly across selected topics
    var nonHuffmanCount = huffmanSelection ? Math.max(0, count - 1) : count;
    var numTopics = otherSelections.length;
    var base = numTopics ? Math.floor(nonHuffmanCount / numTopics) : 0;
    var remainder = numTopics ? (nonHuffmanCount % numTopics) : 0;

    // Build source list: add exactly one Huffman question if selected,
    // then distribute remaining questions across other selected topics.
    var huffmanSource = null;
    var otherSources = [];
    if (huffmanSelection) {
      huffmanSource = {
        topicId: huffmanSelection.topicId,
        topicLabel: huffmanSelection.topicLabel,
        subtypeId: "mixed",
        options: huffmanSelection.options || {}
      };
    }

    otherSelections.forEach(function (sel, i) {
      var n = base + (i < remainder ? 1 : 0);
      for (var j = 0; j < n; j++) {
        var subtypeId = sel.subtypeIds[Math.floor(Math.random() * sel.subtypeIds.length)];
        otherSources.push({
          topicId: sel.topicId,
          topicLabel: sel.topicLabel,
          subtypeId: subtypeId,
          options: sel.options
        });
      }
    });

    // Shuffle non-Huffman sources. If Huffman is selected, keep it fixed as Q1.
    for (var i = otherSources.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = otherSources[i]; otherSources[i] = otherSources[j]; otherSources[j] = tmp;
    }

    var sources = huffmanSource ? [huffmanSource].concat(otherSources) : otherSources;

    // Generate questions
    var items = [];
    sources.forEach(function (source, idx) {
      var q = mapQuestion(source);
      items.push({
        number: idx + 1,
        topic: q.topic,
        prompt: q.prompt,
        promptPrefix: q.promptPrefix || "",
        promptInlineBoxText: q.promptInlineBoxText || "",
        promptSuffix: q.promptSuffix || "",
        promptInlineSymbols: Array.isArray(q.promptInlineSymbols) ? q.promptInlineSymbols : [],
        instruction: q.instruction,
        answer: q.answer,
        answerLayout: q.answerLayout || null,
        promptBitBoxes: Array.isArray(q.promptBitBoxes) ? q.promptBitBoxes : [],
        promptTree: q.promptTree || null
      });
    });
    return items;
  }

  async function buildPdf(items, title, layoutMode) {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) {
      throw new Error("jsPDF did not load.");
    }

    var mode = ["normal", "compact", "both"].includes(layoutMode) ? layoutMode : "normal";

    var doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var boxInset = 20;
    var margin = 48;
    var lineH = 16;
    var footerH = 44;
    var footerTop = pageH - boxInset - footerH;
    var contentBottom = footerTop - 8;
    var y = margin;

    function drawPageDecorations() {
      doc.setDrawColor(0);
      doc.setLineWidth(1.5);
      doc.roundedRect(boxInset, boxInset, pageW - boxInset * 2, pageH - boxInset * 2, 10, 10, "S");
      doc.setLineWidth(0.75);
      doc.line(margin, footerTop, pageW - margin, footerTop);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("Generated with Encodr", pageW / 2, footerTop + 14, { align: "center" });
      doc.text("https://www.korovatron.co.uk/encodr/", pageW / 2, footerTop + 27, { align: "center" });
    }

    function ensureSpace(heightNeeded) {
      if (y + heightNeeded <= contentBottom) return;
      doc.addPage("a4", "portrait");
      y = margin;
      drawPageDecorations();
    }

    function wrappedLines(text, fontSize, isBold, maxWidth) {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(fontSize || 11);
      return doc.splitTextToSize(String(text), maxWidth || (pageW - margin * 2));
    }

    function writeLines(lines, fontSize, isBold) {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(0);
      doc.text(lines, margin, y);
      y += lines.length * lineH + 4;
    }

    function writeWrapped(text, fontSize, isBold) {
      var lines = wrappedLines(text, fontSize, isBold);
      ensureSpace(lines.length * lineH + 4);
      writeLines(lines, fontSize, isBold);
    }

    function hasPromptInlineBox(item) {
      return !!(item && item.promptInlineBoxText && item.promptSuffix);
    }

    function promptTextHeight(item, fontSize, promptLineH, maxWidth) {
      if (!hasPromptInlineBox(item)) {
        return wrappedLines(item.prompt, fontSize, false, maxWidth).length * promptLineH;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      var prefix = item.promptPrefix || "The phrase";
      var suffix = item.promptSuffix || "";
      var boxText = String(item.promptInlineBoxText || "");

      var prefixW = doc.getTextWidth(prefix) + 8;
      doc.setFont("helvetica", "bold");
      var boxW = doc.getTextWidth(boxText) + 12;

      var firstLineHeight = promptLineH;
      var suffixLines;
      if (prefixW + boxW + 10 <= maxWidth) {
        doc.setFont("helvetica", "normal");
        suffixLines = doc.splitTextToSize(suffix, maxWidth);
      } else {
        doc.setFont("helvetica", "normal");
        suffixLines = doc.splitTextToSize(prefix + " " + suffix, maxWidth);
        firstLineHeight = promptLineH;
      }
      return firstLineHeight + (suffixLines.length * promptLineH);
    }

    function renderPromptText(item, x, maxWidth, fontSize, promptLineH) {
      if (!hasPromptInlineBox(item)) {
        var lines = wrappedLines(item.prompt, fontSize, false, maxWidth);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(0);
        doc.text(lines, x, y);
        y += lines.length * promptLineH;
        return;
      }

      function renderInlineSymbolTokens() {
        var symbols = Array.isArray(item.promptInlineSymbols) ? item.promptInlineSymbols : [];
        if (!symbols.length) return;

        var isCompactText = fontSize <= 9.5;
        var xCur = x;
        var yCur = y;

        doc.setFontSize(fontSize);
        symbols.forEach(function (sym, idx) {
          var tokenText = huffmanPrintableSymbol(sym);
          doc.setFont("helvetica", "bold");
          var bw = doc.getTextWidth(tokenText) + 10;
          if (xCur > x && xCur + bw > x + maxWidth) {
            xCur = x;
            yCur += promptLineH;
          }

          var by = yCur - fontSize + (isCompactText ? -1.6 : -0.5);
          var bh = fontSize + 5;
          doc.setFillColor(246, 246, 246);
          doc.setDrawColor(0);
          doc.setLineWidth(0.8);
          doc.roundedRect(xCur, by, bw, bh, 3, 3, "FD");
          doc.setTextColor(0);
          doc.text(tokenText, xCur + bw / 2, yCur + (isCompactText ? -1.2 : -0.6), { align: "center" });
          xCur += bw;
          if (idx < symbols.length - 1) {
            xCur += 8;
          }
        });

        y = yCur + promptLineH;
      }

      var prefix = item.promptPrefix || "The phrase";
      var suffix = item.promptSuffix || "";
      var boxText = String(item.promptInlineBoxText || "");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(0);

      var prefixW = doc.getTextWidth(prefix) + 8;
      doc.setFont("helvetica", "bold");
      var boxW = doc.getTextWidth(boxText) + 12;
      var inlineFits = (prefixW + boxW + 10 <= maxWidth);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      doc.text(prefix, x, y);

      if (inlineFits) {
        var isCompactText = fontSize <= 9.5;
        var bx = x + prefixW;
        var by = y - fontSize + (isCompactText ? -1.6 : -0.5);
        var bh = fontSize + 5;
        doc.setFillColor(246, 246, 246);
        doc.setDrawColor(0);
        doc.setLineWidth(0.8);
        doc.roundedRect(bx, by, boxW, bh, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(boxText, bx + boxW / 2, y + (isCompactText ? -1.2 : -0.6), { align: "center" });
        y += promptLineH;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        var suffixLines = doc.splitTextToSize(suffix, maxWidth);
        doc.text(suffixLines, x, y);
        y += suffixLines.length * promptLineH;
        renderInlineSymbolTokens();
        return;
      }

      y += promptLineH;
      var fallbackLines = doc.splitTextToSize(prefix + " " + suffix, maxWidth);
      doc.text(fallbackLines, x, y);
      y += fallbackLines.length * promptLineH;
      renderInlineSymbolTokens();
    }

    function writeCentred(text, fontSize, isBold) {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(0);
      doc.text(String(text), pageW / 2, y, { align: "center" });
      y += lineH + 4;
    }

    function drawSegmentedBinaryBoxes(x, yStart, bits, label, pointIndex, options) {
      var opts = options || {};
      var safeBits = Math.max(2, Math.min(32, Math.floor(bits || 0)));
      var available = opts.maxWidth || (pageW - margin * 2);
      var boxH = 16;
      var labelGap = 4;
      var rowGap = 8;
      var showLabel = opts.showLabel !== false;
      var cellW = Math.max(10, Math.min(18, Math.floor(available / safeBits)));
      var totalW = cellW * safeBits;
      var bitText = (opts.bitText || "").replace(/[^01]/g, "");

      var boxY = yStart;
      if (showLabel) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(label || "Answer:", x, yStart);
        boxY = yStart + labelGap;
      }
      doc.setLineWidth(0.9);
      doc.rect(x, boxY, totalW, boxH);
      for (var i = 1; i < safeBits; i++) {
        var xLine = x + i * cellW;
        doc.line(xLine, boxY, xLine, boxY + boxH);
      }

      if (bitText) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0);
        for (var j = 0; j < Math.min(bitText.length, safeBits); j++) {
          var cx = x + j * cellW + cellW / 2;
          doc.text(bitText[j], cx, boxY + boxH / 2 + 3, { align: "center" });
        }
      }

      if (Number.isFinite(pointIndex)) {
        var p = Math.floor(pointIndex);
        if (p > 0 && p < safeBits) {
          var px = x + p * cellW;
          var py = boxY + boxH / 2;
          // Binary-point marker between cells for fixed-point answers.
          doc.setFillColor(0);
          doc.circle(px, py, 2.2, "F");
        }
      }

      return (showLabel ? lineH : 0) + rowGap + boxH;
    }

    function promptBitBoxesHeight(item, maxWidth) {
      if (!item.promptBitBoxes || !item.promptBitBoxes.length) return 0;
      var width = maxWidth || (pageW - margin * 2);
      var total = 0;
      item.promptBitBoxes.forEach(function (entry) {
        var safeBits = Math.max(2, Math.min(32, Math.floor(entry.bits || bitsInBinaryString(entry.bitText))));
        var cellW = Math.max(10, Math.min(18, Math.floor(width / safeBits)));
        var boxH = 16;
        var showLabel = entry.showLabel !== false;
        total += (showLabel ? lineH : 0) + 4 + boxH + 8;
      });
      return total;
    }

    function renderPromptBitBoxes(item, x, maxWidth) {
      if (!item.promptBitBoxes || !item.promptBitBoxes.length) return;
      item.promptBitBoxes.forEach(function (entry) {
        y += drawSegmentedBinaryBoxes(
          x,
          y,
          entry.bits || bitsInBinaryString(entry.bitText),
          entry.label || "Binary value:",
          Number.isFinite(entry.pointIndex) ? entry.pointIndex : binaryPointIndex(entry.bitText),
          {
            maxWidth: maxWidth,
            bitText: entry.bitText,
            showLabel: entry.showLabel
          }
        );
      });
    }

    function promptTreeLayout(root) {
      var leaves = 0;
      var maxDepth = 0;

      function walk(node, depth) {
        if (!node) return;
        if (depth > maxDepth) maxDepth = depth;
        if (!node.left && !node.right) {
          node._xIndex = leaves;
          leaves += 1;
          return;
        }
        walk(node.left, depth + 1);
        walk(node.right, depth + 1);
        var leftX = node.left ? node.left._xIndex : 0;
        var rightX = node.right ? node.right._xIndex : leftX;
        node._xIndex = (leftX + rightX) / 2;
      }

      walk(root, 0);
      return { leaves: Math.max(leaves, 1), maxDepth: maxDepth };
    }

    function promptTreeHeight(item, compactMode) {
      if (!item.promptTree) return 0;
      var layout = promptTreeLayout(item.promptTree);
      var stepY = compactMode ? 38 : 52;
      var topPad = compactMode ? 10 : 14;
      var bottomPad = compactMode ? 14 : 18;
      var leafPad = compactMode ? 12 : 16;
      return topPad + (layout.maxDepth * stepY) + bottomPad + leafPad;
    }

    function drawPromptTree(item, x, maxWidth, compactMode) {
      if (!item.promptTree) return;

      var root = item.promptTree;
      var layout = promptTreeLayout(root);
      var nodeRadius = compactMode ? 10 : 13;
      var stepY = compactMode ? 38 : 52;
      var topPad = compactMode ? 10 : 14;
      var bottomPad = compactMode ? 14 : 18;
      var leafLabelGap = compactMode ? 16 : 20;
      var width = Math.max(120, maxWidth);
      var startX = x + nodeRadius;
      var stepX = layout.leaves > 1 ? (width - nodeRadius * 2) / (layout.leaves - 1) : 0;

      function pos(node, depth) {
        return {
          x: startX + node._xIndex * stepX,
          y: y + topPad + depth * stepY
        };
      }

      function edgePoint(from, to, radius) {
        var dx = to.x - from.x;
        var dy = to.y - from.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        return {
          x: from.x + (dx / len) * radius,
          y: from.y + (dy / len) * radius
        };
      }

      function drawNode(node, depth) {
        if (!node) return;
        var p = pos(node, depth);

        if (node.left) {
          var lp = pos(node.left, depth + 1);
          var ls = edgePoint(p, lp, nodeRadius);
          var le = edgePoint(lp, p, nodeRadius);
          doc.setDrawColor(0);
          doc.setLineWidth(0.8);
          doc.line(ls.x, ls.y, le.x, le.y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(compactMode ? 7 : 8);
          doc.setTextColor(0);
          doc.text("0", (p.x + lp.x) / 2 - 5, (p.y + lp.y) / 2 - 4);
          drawNode(node.left, depth + 1);
        }

        if (node.right) {
          var rp = pos(node.right, depth + 1);
          var rs = edgePoint(p, rp, nodeRadius);
          var re = edgePoint(rp, p, nodeRadius);
          doc.setDrawColor(0);
          doc.setLineWidth(0.8);
          doc.line(rs.x, rs.y, re.x, re.y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(compactMode ? 7 : 8);
          doc.setTextColor(0);
          doc.text("1", (p.x + rp.x) / 2 + 3, (p.y + rp.y) / 2 - 4);
          drawNode(node.right, depth + 1);
        }

        doc.setDrawColor(0);
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(0.9);
        doc.circle(p.x, p.y, nodeRadius, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(compactMode ? 7 : 9);
        doc.setTextColor(0);
        doc.text(String(node.freq), p.x, p.y + 2.5, { align: "center" });

        if (!node.left && !node.right) {
          var leafText = huffmanPrintableSymbol(node.symbol);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(compactMode ? 7 : 8);
          var leafW = doc.getTextWidth(leafText) + 10;
          var leafH = (compactMode ? 7 : 8) + 5;
          var leafX = p.x - leafW / 2;
          var leafY = p.y + leafLabelGap - (compactMode ? 7 : 8) + (compactMode ? 3.2 : 3.8);
          doc.setFillColor(246, 246, 246);
          doc.setDrawColor(0);
          doc.setLineWidth(0.8);
          doc.roundedRect(leafX, leafY, leafW, leafH, 3, 3, "FD");
          doc.setFont("helvetica", "normal");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(compactMode ? 7 : 8);
          doc.setTextColor(0);
          doc.text(leafText, p.x, p.y + leafLabelGap + (compactMode ? 4.0 : 4.6), { align: "center" });
        }
      }

      drawNode(root, 0);
      y += topPad + (layout.maxDepth * stepY) + bottomPad + leafLabelGap;
    }

    function drawMantissaExponentBoxes(x, yStart, layout) {
      var used = 0;
      used += drawSegmentedBinaryBoxes(x, yStart + used, layout.mantissaBits, "Mantissa:", null);
      used += drawSegmentedBinaryBoxes(x, yStart + used, layout.exponentBits, "Exponent:", null);

      if (layout.includeErrors) {
        var totalWidth = pageW - margin * 2;
        var halfGap = 12;
        var leftWidth = Math.floor((totalWidth - halfGap) / 2);
        var rightX = x + leftWidth + halfGap;
        var absLabel = "Absolute error:";
        var relLabel = "Relative error (%):";
        var absLineStart = x + 86;
        var relLineStart = rightX + 94;
        var absLineWidth = Math.max(40, leftWidth - (absLineStart - x));
        var relLineWidth = Math.max(40, totalWidth - leftWidth - halfGap - (relLineStart - rightX));

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(absLabel, x, yStart + used);
        doc.line(absLineStart, yStart + used + 2, absLineStart + absLineWidth, yStart + used + 2);

        doc.text(relLabel, rightX, yStart + used);
        doc.line(relLineStart, yStart + used + 2, relLineStart + relLineWidth, yStart + used + 2);
        used += lineH + 4;
      }

      return used;
    }

    function answerAreaHeight(item) {
      var layout = item.answerLayout;
      if (!layout) return 2 * lineH + 12;
      if (layout.kind === "binaryBoxes") {
        return lineH + 8 + 16;
      }
      if (layout.kind === "mantissaExponent") {
        var base = 2 * (lineH + 8 + 16);
        if (layout.includeErrors) base += 2 * lineH + 4;
        return base;
      }
      return 2 * lineH + 12;
    }

    function renderAnswerArea(item) {
      var layout = item.answerLayout;
      if (!layout) {
        var label = "Answer:";
        var labelX = margin;
        var baselineY = y + lineH;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(label, labelX, baselineY);
        var labelWidth = doc.getTextWidth(label);
        var lineStart = labelX + labelWidth + 8;
        var lineEnd = pageW - margin;
        doc.setLineWidth(0.9);
        doc.line(lineStart, baselineY + 1, lineEnd, baselineY + 1);
        // Keep the same vertical footprint as the previous wrapped-text answer line.
        y += (lineH * 2) + 12;
        return;
      }

      if (layout.kind === "binaryBoxes") {
        y += drawSegmentedBinaryBoxes(margin, y, layout.bits, "Answer:", layout.pointIndex);
        y += 6;
        return;
      }

      if (layout.kind === "mantissaExponent") {
        y += drawMantissaExponentBoxes(margin, y, layout);
        y += 6;
        return;
      }

      y += lineH;
      writeLines(wrappedLines("Answer: ________________________________________________", 11, false), 11, false);
      y += 8;
    }

    function renderWorksheetSection(compactMode) {
      y = margin;
      drawPageDecorations();

      var heading = normalizeTitle(title);
      if (mode === "both") {
        heading += compactMode ? " - Compact" : " - Normal";
      }
      writeCentred(heading, 20, true);
      y += lineH;

      if (!compactMode) {
        items.forEach(function (item) {
          var l1 = wrappedLines("Q" + item.number, 12, true);
          var promptTextH = promptTextHeight(item, 11, lineH, pageW - margin * 2);
          var promptBoxH = promptBitBoxesHeight(item, pageW - margin * 2);
          var treeH = promptTreeHeight(item, false);
          var blockHeight = (l1.length * lineH) + promptTextH + promptBoxH + treeH + answerAreaHeight(item) + (2 * 4);

          ensureSpace(blockHeight);
          writeLines(l1, 12, true);
          renderPromptText(item, margin, pageW - margin * 2, 11, lineH);
          renderPromptBitBoxes(item, margin, pageW - margin * 2);
          drawPromptTree(item, margin, pageW - margin * 2, false);
          renderAnswerArea(item);
        });
        return;
      }

      var columnGap = 22;
      var columnWidth = (pageW - margin * 2 - columnGap) / 2;
      var leftX = margin;
      var rightX = margin + columnWidth + columnGap;
      var contentTop = y;
      var column = 0;
      var compactQFont = 11;
      var compactPFont = 9;
      var compactQLineH = 13;
      var compactPLineH = 12;
      var compactGapAfterQ = 2;
      var compactGapAfterBlock = 5;
      var useBestFitCompact = false;

      if (useBestFitCompact) {
        var compactColumnY = [contentTop, contentTop];

        function openNextCompactPage() {
          doc.addPage("a4", "portrait");
          drawPageDecorations();
          contentTop = margin;
          compactColumnY[0] = contentTop;
          compactColumnY[1] = contentTop;
        }

        function chooseCompactColumn(blockHeight) {
          var fitsLeft = compactColumnY[0] + blockHeight <= contentBottom;
          var fitsRight = compactColumnY[1] + blockHeight <= contentBottom;

          if (!fitsLeft && !fitsRight) {
            openNextCompactPage();
            return 0;
          }
          if (fitsLeft && !fitsRight) return 0;
          if (!fitsLeft && fitsRight) return 1;

          var remainingLeft = contentBottom - (compactColumnY[0] + blockHeight);
          var remainingRight = contentBottom - (compactColumnY[1] + blockHeight);
          return remainingLeft <= remainingRight ? 0 : 1;
        }

        items.forEach(function (item) {
          var x;
          var qLines = wrappedLines("Q" + item.number, compactQFont, true, columnWidth);
          var pTextH = promptTextHeight(item, compactPFont, compactPLineH, columnWidth);
          var promptBoxHCompact = promptBitBoxesHeight(item, columnWidth);
          var treeHCompact = promptTreeHeight(item, true);
          var promptBoxTailGap = (item.promptBitBoxes && item.promptBitBoxes.length) ? 6 : 0;
          var treeTailGap = item.promptTree ? 6 : 0;
          var blockHeight = qLines.length * compactQLineH + compactGapAfterQ + pTextH + promptBoxHCompact + promptBoxTailGap + treeHCompact + treeTailGap + compactGapAfterBlock;

          var targetColumn = chooseCompactColumn(blockHeight);
          x = targetColumn === 0 ? leftX : rightX;
          y = compactColumnY[targetColumn];

          doc.setFont("helvetica", "bold");
          doc.setFontSize(compactQFont);
          doc.setTextColor(0);
          doc.text(qLines, x, y);
          y += qLines.length * compactQLineH + compactGapAfterQ;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(compactPFont);
          doc.setTextColor(0);
          renderPromptText(item, x, columnWidth, compactPFont, compactPLineH);
          renderPromptBitBoxes(item, x, columnWidth);
          if (item.promptBitBoxes && item.promptBitBoxes.length) {
            y += 6;
          }
          drawPromptTree(item, x, columnWidth, true);
          if (item.promptTree) {
            y += 6;
          }
          y += compactGapAfterBlock;
          compactColumnY[targetColumn] = y;
        });
      } else {
        function ensureCompactSpace(heightNeeded) {
          if (y + heightNeeded <= contentBottom) return;
          if (column === 0) {
            column = 1;
            y = contentTop;
            return;
          }
          doc.addPage("a4", "portrait");
          drawPageDecorations();
          column = 0;
          y = margin;
          contentTop = margin;
        }

        items.forEach(function (item) {
          var x = column === 0 ? leftX : rightX;
          var qLines = wrappedLines("Q" + item.number, compactQFont, true, columnWidth);
          var pTextH = promptTextHeight(item, compactPFont, compactPLineH, columnWidth);
          var promptBoxHCompact = promptBitBoxesHeight(item, columnWidth);
          var treeHCompact = promptTreeHeight(item, true);
          var promptBoxTailGap = (item.promptBitBoxes && item.promptBitBoxes.length) ? 6 : 0;
          var treeTailGap = item.promptTree ? 6 : 0;
          var blockHeight = qLines.length * compactQLineH + compactGapAfterQ + pTextH + promptBoxHCompact + promptBoxTailGap + treeHCompact + treeTailGap + compactGapAfterBlock;

          ensureCompactSpace(blockHeight);
          x = column === 0 ? leftX : rightX;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(compactQFont);
          doc.setTextColor(0);
          doc.text(qLines, x, y);
          y += qLines.length * compactQLineH + compactGapAfterQ;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(compactPFont);
          doc.setTextColor(0);
          renderPromptText(item, x, columnWidth, compactPFont, compactPLineH);
          renderPromptBitBoxes(item, x, columnWidth);
          if (item.promptBitBoxes && item.promptBitBoxes.length) {
            y += 6;
          }
          drawPromptTree(item, x, columnWidth, true);
          if (item.promptTree) {
            y += 6;
          }
          y += compactGapAfterBlock;
        });
      }
    }

    if (mode === "both") {
      renderWorksheetSection(false);
      doc.addPage("a4", "portrait");
      renderWorksheetSection(true);
    } else {
      renderWorksheetSection(mode === "compact");
    }

    doc.addPage("a4", "portrait");
    y = margin;
    drawPageDecorations();
    writeCentred(normalizeTitle(title) + " - Answers", 20, true);
    y += 8;

    // Render answers in two columns.
    var ansColGap = 22;
    var ansColW = (pageW - margin * 2 - ansColGap) / 2;
    var ansLineH = 14;
    var ansFs = 10;
    var ansColX = [margin, margin + ansColW + ansColGap];
    var ansColY = [y, y];

    // Fill column 0 top-to-bottom, then overflow into column 1, then new page.
    var ansCol = 0;
    items.forEach(function (item) {
      var text = "Q" + item.number + ": " + item.answer;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(ansFs);
      var wrapped = doc.splitTextToSize(text, ansColW);
      var blockH = wrapped.length * ansLineH + 4;
      if (ansColY[ansCol] + blockH > contentBottom) {
        if (ansCol === 0) {
          // Move to column 1 at the same top baseline.
          ansCol = 1;
        } else {
          // Both columns full — new page, back to column 0.
          doc.addPage("a4", "portrait");
          drawPageDecorations();
          ansColY[0] = margin;
          ansColY[1] = margin;
          ansCol = 0;
        }
      }
      doc.setTextColor(0);
      doc.text(wrapped, ansColX[ansCol], ansColY[ansCol]);
      ansColY[ansCol] += blockH;
    });

    return doc;
  }

  function setStatus(message, tone) {
    var status = byId("ws-status");
    if (!status) return;
    status.textContent = message;
    status.className = "ws-status" + (tone ? " " + tone : "");
  }

  async function onGenerate() {
    var btn = byId("ws-generate");
    if (!btn) return;

    var title = normalizeTitle(byId("ws-title") ? byId("ws-title").value : DEFAULT_TITLE);
    var countInput = byId("ws-count");
    var count = Math.round(safeNum(countInput ? countInput.value : 20, 20));
    var layoutMode = "normal";
    var selectedMode = document.querySelector('input[name="ws-layout-mode"]:checked');
    if (selectedMode && selectedMode.value) {
      layoutMode = selectedMode.value;
    }

    if (count < 1 || count > 100) {
      setStatus("Choose a question count from 1 to 100.", "error");
      return;
    }

    var selections = readSelections();
    if (!selections.length) {
      setStatus("Select at least one topic and subtype.", "error");
      return;
    }

    var includesHuffman = selections.some(function (sel) {
      return sel.topicId === "huffman";
    });

    var pool = buildSourcePool(selections);
    if (!pool.length) {
      setStatus("Select at least one subtype.", "error");
      return;
    }

    btn.disabled = true;
    setStatus(includesHuffman
      ? "Huffman selected: including exactly 1 random Huffman question."
      : "Generating worksheet questions...", "");

    try {
      var items = buildWorksheetItems(count, selections);
      setStatus("Rendering PDF...", "");
      var pdf = await buildPdf(items, title, layoutMode);
      var filename = slugify(title) + "-" + new Date().toISOString().slice(0, 10) + ".pdf";
      pdf.save(filename);
      setStatus("Downloaded " + filename, "success");
    } catch (err) {
      console.error(err);
      setStatus("Could not generate worksheet PDF.", "error");
    } finally {
      btn.disabled = false;
    }
  }

  window.addEventListener("DOMContentLoaded", function () {
    renderTopicControls();
    var btn = byId("ws-generate");
    if (btn) {
      btn.addEventListener("click", function () {
        void onGenerate();
      });
    }
  });
})();
