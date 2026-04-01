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
        '<input type="checkbox" class="ws-topic-enable" id="topic-' + topic.id + '" checked />' +
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
      promptBitBoxes: []
    };
  }

  function buildWorksheetItems(count, selections) {
    soundFileSizeLastKind = null;
    soundFileSizeStreak = 0;

    // Distribute count evenly across selected topics
    var numTopics = selections.length;
    var base = Math.floor(count / numTopics);
    var remainder = count % numTopics;

    // Build source list: for each topic, pick randomly from its subtypes
    var sources = [];
    selections.forEach(function (sel, i) {
      var n = base + (i < remainder ? 1 : 0);
      for (var j = 0; j < n; j++) {
        var subtypeId = sel.subtypeIds[Math.floor(Math.random() * sel.subtypeIds.length)];
        sources.push({
          topicId: sel.topicId,
          topicLabel: sel.topicLabel,
          subtypeId: subtypeId,
          options: sel.options
        });
      }
    });

    // Fisher-Yates shuffle
    for (var i = sources.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = sources[i]; sources[i] = sources[j]; sources[j] = tmp;
    }

    // Generate questions
    var items = [];
    sources.forEach(function (source, idx) {
      var q = mapQuestion(source);
      items.push({
        number: idx + 1,
        topic: q.topic,
        prompt: q.prompt,
        instruction: q.instruction,
        answer: q.answer,
        answerLayout: q.answerLayout || null,
        promptBitBoxes: Array.isArray(q.promptBitBoxes) ? q.promptBitBoxes : []
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
        var l4 = wrappedLines("Answer: ________________________________________________", 11, false);
        y += lineH;
        writeLines(l4, 11, false);
        y += 8;
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
          var l2 = wrappedLines(item.prompt, 11, false);
          var promptBoxH = promptBitBoxesHeight(item, pageW - margin * 2);
          var blockHeight = (l1.length + l2.length) * lineH + promptBoxH + answerAreaHeight(item) + (2 * 4);

          ensureSpace(blockHeight);
          writeLines(l1, 12, true);
          writeLines(l2, 11, false);
          renderPromptBitBoxes(item, margin, pageW - margin * 2);
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
        var pLines = wrappedLines(item.prompt, compactPFont, false, columnWidth);
        var promptBoxHCompact = promptBitBoxesHeight(item, columnWidth);
        var promptBoxTailGap = (item.promptBitBoxes && item.promptBitBoxes.length) ? 6 : 0;
        var blockHeight = qLines.length * compactQLineH + compactGapAfterQ + pLines.length * compactPLineH + promptBoxHCompact + promptBoxTailGap + compactGapAfterBlock;

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
        doc.text(pLines, x, y);
        y += pLines.length * compactPLineH;
        renderPromptBitBoxes(item, x, columnWidth);
        if (item.promptBitBoxes && item.promptBitBoxes.length) {
          y += 6;
        }
        y += compactGapAfterBlock;
      });
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

    items.forEach(function (item) {
      writeWrapped("Q" + item.number + ": " + item.answer, 11, false);
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

    var pool = buildSourcePool(selections);
    if (!pool.length) {
      setStatus("Select at least one subtype.", "error");
      return;
    }

    btn.disabled = true;
    setStatus("Generating worksheet questions...", "");

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
