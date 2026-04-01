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
      label: "Bitmap",
      subtypes: [
        { id: "sizeBits", label: "File size in bits" },
        { id: "sizeUnit", label: "File size in unit" },
        { id: "maxColoursDepth", label: "Max colours from depth" },
        { id: "colourDepth", label: "Depth from colours" },
        { id: "maxColoursSize", label: "Max colours from size" }
      ],
      options: [
        {
          id: "unitsMode",
          label: "Units mode",
          kind: "select",
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
        { id: "fileSize", label: "File size" },
        { id: "solveResolution", label: "Calculate sample resolution" },
        { id: "halvingEffect", label: "Size after change" },
        { id: "duration", label: "Calculate duration" },
        { id: "nyquist", label: "Nyquist" }
      ],
      options: [
        {
          id: "unitsMode",
          label: "Units mode",
          kind: "select",
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
      if (Array.isArray(topic.options) && topic.options.length) {
        optionsHtml = '<div class="ws-options">' + topic.options.map(function (opt) {
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
          return "";
        }).join("") + "</div>";
      }

      return '<section class="ws-topic" data-topic="' + topic.id + '">' +
        '<label class="ws-topic-head">' +
        '<input type="checkbox" class="ws-topic-enable" id="topic-' + topic.id + '" checked />' +
        '<span>' + topic.label + '</span>' +
        '</label>' +
        '<div class="ws-subtypes" id="subs-' + topic.id + '">' +
        topic.subtypes.map(function (sub) {
          return '<label class="ws-cb">' +
            '<input type="checkbox" class="ws-sub" data-topic="' + topic.id + '" value="' + sub.id + '" checked />' +
            '<span>' + sub.label + '</span>' +
            '</label>';
        }).join("") +
        "</div>" +
        optionsHtml +
        "</section>";
    }).join("");

    var topicToggles = root.querySelectorAll(".ws-topic-enable");
    topicToggles.forEach(function (toggle) {
      toggle.addEventListener("change", function () {
        var topicId = toggle.id.replace("topic-", "");
        var subWrap = byId("subs-" + topicId);
        var topicSection = root.querySelector('[data-topic="' + topicId + '"]');
        if (!subWrap || !topicSection) return;

        var subChecks = subWrap.querySelectorAll("input[type='checkbox']");
        subChecks.forEach(function (cb) {
          cb.disabled = !toggle.checked;
        });

        var selects = topicSection.querySelectorAll("select");
        selects.forEach(function (sel) {
          sel.disabled = !toggle.checked;
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
      if (!subtypeIds.length) return;

      var options = {};
      if (Array.isArray(topic.options)) {
        topic.options.forEach(function (opt) {
          var el = byId("opt-" + topic.id + "-" + opt.id);
          if (el) options[opt.id] = el.value;
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

  function mapQuestion(source) {
    var generators = window.EncodrQuizGenerators;
    if (!generators) {
      throw new Error("Generators are not loaded yet. Refresh and try again.");
    }

    if (source.topicId === "unsigned") {
      var uq = generators.unsigned.generate(source.subtypeId);
      var unsignedAnswer = uq.answerKind === "range"
        ? formatNumber(uq.expectedMin) + " to " + formatNumber(uq.expectedMax)
        : String(uq.expectedText || uq.expectedValue);
      return {
        topic: source.topicLabel,
        prompt: plainText(uq.prompt),
        instruction: instructionForAnswerKind(uq.answerKind),
        answer: unsignedAnswer
      };
    }

    if (source.topicId === "fixed") {
      var fq = generators.fixedPoint.generate(source.subtypeId);
      var fixedAnswer = fq.answerKind === "range"
        ? formatNumber(fq.expectedMin) + " to " + formatNumber(fq.expectedMax)
        : (fq.answerKind === "bin" ? fq.expectedBits : formatNumber(fq.expectedValue));
      return {
        topic: source.topicLabel,
        prompt: plainText(fq.prompt),
        instruction: instructionForAnswerKind(fq.answerKind),
        answer: fixedAnswer
      };
    }

    if (source.topicId === "twos") {
      var tq = generators.twosComplement.generate(source.subtypeId);
      var twosAnswer = tq.answerKind === "range"
        ? formatNumber(tq.expectedMin) + " to " + formatNumber(tq.expectedMax)
        : (tq.answerKind === "bin" ? tq.expectedBits : formatNumber(tq.expectedValue));
      return {
        topic: source.topicLabel,
        prompt: plainText(tq.prompt),
        instruction: instructionForAnswerKind(tq.answerKind),
        answer: twosAnswer
      };
    }

    if (source.topicId === "floating") {
      if (source.subtypeId === "1") {
        var f1 = generators.floatingPoint.generate("1");
        var mBits1 = f1.mBits.join("");
        var eBits1 = f1.eBits.join("");
        return {
          topic: source.topicLabel,
          prompt: "A floating-point number uses a " + f1.mLen + "-bit two's complement mantissa and a " + f1.eLen + "-bit two's complement exponent. Mantissa: " + mBits1 + ", Exponent: " + eBits1 + ". Convert this value to denary.",
          instruction: "Write your answer as a denary number.",
          answer: formatNumber(f1.targetDenary)
        };
      }

      if (source.subtypeId === "2") {
        var tries = 0;
        var f2 = generators.floatingPoint.generate("2");
        while (f2.isInexact && tries < 40) {
          f2 = generators.floatingPoint.generate("2");
          tries += 1;
        }
        var mBits2 = f2.mBits.join("");
        var eBits2 = f2.eBits.join("");
        return {
          topic: source.topicLabel,
          prompt: "Using a " + f2.mLen + "-bit two's complement mantissa and a " + f2.eLen + "-bit two's complement exponent, represent denary " + formatNumber(f2.targetDenary) + " in floating-point form.",
          instruction: "Write your answer as mantissa and exponent binary values.",
          answer: "Mantissa: " + mBits2 + ", Exponent: " + eBits2
        };
      }

      var fe = generators.floatingPoint.generate("extrema");
      return {
        topic: source.topicLabel,
        prompt: "What is the " + floatingExtremaLabel(fe.extremaType) + " denary value when a floating-point number is represented with a " + fe.mLen + "-bit two's complement mantissa and a " + fe.eLen + "-bit two's complement exponent?",
        instruction: "Write your answer as a denary number.",
        answer: formatNumber(fe.targetDenary)
      };
    }

    if (source.topicId === "bitmap") {
      var bq = generators.bitmap.generate({
        unitsMode: source.options.unitsMode || "mix",
        questionTypes: [source.subtypeId]
      });
      return {
        topic: source.topicLabel,
        prompt: plainText(bq.text),
        instruction: "Write your answer as a number in " + bq.unitLabel + ".",
        answer: formatNumber(bq.answerNum) + " " + bq.unitLabel
      };
    }

    var soundTypes = source.subtypeId === "fileSize"
      ? ["fileSizeBits", "fileSizeBytes", "fileSizeUnit"]
      : [source.subtypeId];

    var sq;
    if (source.subtypeId === "fileSize") {
      for (var tries = 0; tries < 12; tries++) {
        sq = generators.sound.generate({
          unitsMode: source.options.unitsMode || "mix",
          nyquistOn: true,
          questionTypes: soundTypes
        });
        var kind = sq.unitLabel === "bits"
          ? "fileSizeBits"
          : (sq.unitLabel === "bytes" ? "fileSizeBytes" : "fileSizeUnit");
        if (soundFileSizeStreak < 2 || kind !== soundFileSizeLastKind || tries === 11) {
          if (kind === soundFileSizeLastKind) {
            soundFileSizeStreak += 1;
          } else {
            soundFileSizeLastKind = kind;
            soundFileSizeStreak = 1;
          }
          break;
        }
      }
    } else {
      sq = generators.sound.generate({
        unitsMode: source.options.unitsMode || "mix",
        nyquistOn: true,
        questionTypes: soundTypes
      });
    }

    return {
      topic: source.topicLabel,
      prompt: plainText(sq.text),
      instruction: "Write your answer as a number in " + sq.unitLabel + ".",
      answer: formatNumber(sq.answerNum) + " " + sq.unitLabel
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
        answer: q.answer
      });
    });
    return items;
  }

  async function buildPdf(items, title) {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) {
      throw new Error("jsPDF did not load.");
    }

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

    function wrappedLines(text, fontSize, isBold) {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(fontSize || 11);
      return doc.splitTextToSize(String(text), pageW - margin * 2);
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

    drawPageDecorations();
    writeCentred(normalizeTitle(title), 20, true);
    y += lineH;

    items.forEach(function (item) {
      var l1 = wrappedLines("Q" + item.number, 12, true);
      var l2 = wrappedLines(item.prompt, 11, false);
      var l4 = wrappedLines("Answer: ________________________________________________", 11, false);
      var blockHeight = (l1.length + l2.length) * lineH + l4.length * lineH + lineH + (3 * 4) + 8;

      ensureSpace(blockHeight);
      writeLines(l1, 12, true);
      writeLines(l2, 11, false);
      y += lineH;
      writeLines(l4, 11, false);
      y += 8;
    });

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
      var pdf = await buildPdf(items, title);
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
