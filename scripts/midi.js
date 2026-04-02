(function () {
  var audioCtx = null;
  var masterGain = null;
  var activeNodes = [];
  var stopTimer = null;
  var activeBarTimers = [];

  var SAMPLES = {
    scale: [
      'tempo bpm=120',
      'instrument wave=sine',
      'chord pitches="C4,E4,G4" beats=1 velocity=102',
      'chord pitches="C4,E4,G4" beats=1 velocity=102',
      'chord pitches="G3,D4,G4" beats=1 velocity=104',
      'chord pitches="G3,D4,G4" beats=1 velocity=104',
      'chord pitches="A3,E4,A4" beats=1 velocity=106',
      'chord pitches="A3,E4,A4" beats=1 velocity=106',
      'chord pitches="G3,D4,G4" beats=2 velocity=110',
      'rest beats=0.5',
      'chord pitches="F3,C4,F4" beats=1 velocity=102',
      'chord pitches="F3,C4,F4" beats=1 velocity=102',
      'chord pitches="E3,B3,E4" beats=1 velocity=100',
      'chord pitches="E3,B3,E4" beats=1 velocity=100',
      'chord pitches="D3,A3,D4" beats=1 velocity=100',
      'chord pitches="D3,A3,D4" beats=1 velocity=100',
      'chord pitches="C4,E4,G4" beats=2 velocity=108'
    ].join('\n'),
    arp: [
      'tempo bpm=110',
      'instrument wave=triangle',
      'note pitch=C4 beats=0.5 velocity=90',
      'note pitch=E4 beats=0.5 velocity=90',
      'note pitch=G4 beats=0.5 velocity=90',
      'note pitch=C5 beats=0.5 velocity=95',
      'note pitch=G4 beats=0.5 velocity=90',
      'note pitch=E4 beats=0.5 velocity=90',
      'note pitch=C4 beats=1 velocity=95',
      'rest beats=0.5',
      'note pitch=G3 beats=1 velocity=90'
    ].join('\n'),
    classicRiff: [
      'tempo bpm=90',
      'instrument wave=sawtooth',
      'chord pitches="B3,D4,F#4" beats=0.33 velocity=106',
      'chord pitches="C#4,E4,G#4" beats=0.33 velocity=106',
      'chord pitches="D4,F#4,A4" beats=0.33 velocity=108',
      'chord pitches="E4,G4,B4" beats=0.33 velocity=108',
      'chord pitches="F#4,A4,C#5" beats=0.33 velocity=110',
      'chord pitches="D4,F#4,A4" beats=0.33 velocity=108',
      'chord pitches="F#4,A4,C#5" beats=0.33 velocity=110',
      'rest beats=0.3',
      'chord pitches="F4,A4,C5" beats=0.33 velocity=110',
      'chord pitches="C#4,E4,G#4" beats=0.33 velocity=108',
      'chord pitches="F4,A4,C5" beats=0.33 velocity=110',
      'rest beats=0.3',
      'chord pitches="E4,G4,B4" beats=0.33 velocity=110',
      'chord pitches="C4,E4,G4" beats=0.33 velocity=108',
      'chord pitches="E4,G4,B4" beats=0.33 velocity=110',
      'rest beats=0.3',
      'chord pitches="B3,D4,F#4" beats=0.33 velocity=110',
      'chord pitches="C#4,E4,G#4" beats=0.33 velocity=108',
      'chord pitches="D4,F#4,A4" beats=0.33 velocity=110',
      'chord pitches="E4,G4,B4" beats=0.33 velocity=110',
      'chord pitches="F#4,A4,C#5" beats=0.33 velocity=108',
      'chord pitches="D4,F#4,A4" beats=0.33 velocity=110',
      'chord pitches="F#4,A4,C#5" beats=0.33 velocity=110',
      'chord pitches="B4,D5,F#5" beats=0.33 velocity=108',
      'chord pitches="A4,C#5,E5" beats=0.33 velocity=110',
      'chord pitches="F#4,A4,C#5" beats=0.33 velocity=110',
      'chord pitches="D4,F#4,A4" beats=0.33 velocity=108',
      'chord pitches="F#4,A4,C#5" beats=0.33 velocity=110',
      'chord pitches="A4,C#5,E5" beats=1 velocity=110'
    ].join('\n')
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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseArgs(raw) {
    var args = {};
    var regex = /([A-Za-z][A-Za-z0-9]*)=("[^"]*"|'[^']*'|[^\s]+)/g;
    var match;
    while ((match = regex.exec(raw))) {
      var key = match[1];
      var value = match[2];
      if ((value[0] === '"' && value[value.length - 1] === '"') || (value[0] === "'" && value[value.length - 1] === "'")) {
        value = value.slice(1, -1);
      }
      args[key] = value;
    }
    return args;
  }

  function parsePitchToMidi(pitch) {
    if (typeof pitch !== 'string') return null;
    var m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(pitch.trim());
    if (!m) return null;

    var baseMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    var note = m[1].toUpperCase();
    var accidental = m[2] || '';
    var octave = Number(m[3]);
    var semitone = baseMap[note];
    if (accidental === '#') semitone += 1;
    if (accidental === 'b') semitone -= 1;

    return (octave + 1) * 12 + semitone;
  }

  function parsePitchList(raw) {
    if (typeof raw !== 'string') return [];
    return raw.split(',').map(function (token) {
      return token.trim();
    }).filter(function (token) {
      return token.length > 0;
    });
  }

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function isComment(line) {
    return !line || /^#/.test(line) || /^\/\//.test(line);
  }

  function parseProgram(source) {
    var lines = String(source || '').split(/\r?\n/);
    var errors = [];
    var events = [];
    var beat = 0;
    var tempo = 120;
    var wave = 'sine';

    for (var i = 0; i < lines.length; i++) {
      var lineNo = i + 1;
      var line = lines[i].trim();
      if (isComment(line)) continue;

      var parts = line.split(/\s+/, 2);
      var cmd = parts[0];
      var args = parseArgs(line.slice(cmd.length).trim());

      if (cmd === 'tempo') {
        var bpm = Number(args.bpm);
        if (!Number.isFinite(bpm) || bpm < 20 || bpm > 300) {
          errors.push('Line ' + lineNo + ': tempo bpm must be between 20 and 300.');
          continue;
        }
        tempo = bpm;
        continue;
      }

      if (cmd === 'instrument') {
        var w = String(args.wave || '').toLowerCase();
        if (['sine', 'square', 'triangle', 'sawtooth'].indexOf(w) === -1) {
          errors.push('Line ' + lineNo + ': instrument wave must be sine, square, triangle or sawtooth.');
          continue;
        }
        wave = w;
        continue;
      }

      if (cmd === 'rest') {
        var restBeats = Number(args.beats);
        if (!Number.isFinite(restBeats) || restBeats <= 0) {
          errors.push('Line ' + lineNo + ': rest beats must be greater than 0.');
          continue;
        }
        events.push({ type: 'rest', lineNo: lineNo, startBeat: beat, beats: restBeats, args: { beats: restBeats } });
        beat += restBeats;
        continue;
      }

      if (cmd === 'note') {
        var midi = parsePitchToMidi(args.pitch);
        var noteBeats = Number(args.beats);
        var velocity = args.velocity == null ? 100 : Number(args.velocity);

        if (midi == null) {
          errors.push('Line ' + lineNo + ': invalid pitch. Use values like C4, F#3, Bb2.');
          continue;
        }
        if (!Number.isFinite(noteBeats) || noteBeats <= 0) {
          errors.push('Line ' + lineNo + ': note beats must be greater than 0.');
          continue;
        }
        if (!Number.isFinite(velocity)) {
          errors.push('Line ' + lineNo + ': velocity must be numeric (0-127).');
          continue;
        }

        velocity = clamp(Math.round(velocity), 0, 127);
        events.push({
          type: 'note',
          lineNo: lineNo,
          startBeat: beat,
          beats: noteBeats,
          pitch: args.pitch,
          midi: midi,
          frequency: midiToFrequency(midi),
          velocity: velocity,
          args: { pitch: args.pitch, beats: noteBeats, velocity: velocity }
        });
        beat += noteBeats;
        continue;
      }

      if (cmd === 'chord') {
        var chordPitches = parsePitchList(args.pitches);
        var chordBeats = Number(args.beats);
        var chordVelocity = args.velocity == null ? 100 : Number(args.velocity);

        if (chordPitches.length < 2) {
          errors.push('Line ' + lineNo + ': chord pitches must contain at least two notes, e.g. pitches="C4,E4,G4".');
          continue;
        }
        if (!Number.isFinite(chordBeats) || chordBeats <= 0) {
          errors.push('Line ' + lineNo + ': chord beats must be greater than 0.');
          continue;
        }
        if (!Number.isFinite(chordVelocity)) {
          errors.push('Line ' + lineNo + ': velocity must be numeric (0-127).');
          continue;
        }

        var chordMidis = [];
        var invalidPitch = null;
        chordPitches.forEach(function (pitch) {
          var midi = parsePitchToMidi(pitch);
          if (midi == null) {
            invalidPitch = pitch;
            return;
          }
          chordMidis.push(midi);
        });
        if (invalidPitch) {
          errors.push('Line ' + lineNo + ': invalid chord pitch "' + invalidPitch + '". Use values like C4, F#3, Bb2.');
          continue;
        }

        chordVelocity = clamp(Math.round(chordVelocity), 0, 127);
        events.push({
          type: 'chord',
          lineNo: lineNo,
          startBeat: beat,
          beats: chordBeats,
          pitches: chordPitches,
          midis: chordMidis,
          frequencies: chordMidis.map(midiToFrequency),
          velocity: chordVelocity,
          args: { pitches: chordPitches.join(','), beats: chordBeats, velocity: chordVelocity }
        });
        beat += chordBeats;
        continue;
      }

      errors.push('Line ' + lineNo + ': unsupported command ' + cmd + '.');
    }

    return {
      tempo: tempo,
      wave: wave,
      events: events,
      errors: errors,
      totalBeats: beat
    };
  }

  function renderBars(parsed) {
    var barsEl = byId('midi-bars');
    if (!barsEl) return;

    var events = parsed.events;
    if (!events.length) {
      barsEl.innerHTML = '<div class="md-empty">No events yet. Add note/rest commands to build a timeline.</div>';
      return;
    }

    var total = parsed.totalBeats > 0 ? parsed.totalBeats : 1;
    var laneHeight = barsEl.clientHeight || 260;

    // Layout constants mirror CSS marker/span dimensions.
    var noteMarkerH = 128;
    var restMarkerH = 96;
    var spanH = 12;

    // Relative positions within the timeline block.
    var noteMarkerTopRel = 0;
    var noteSpanTopRel = 92;
    var restMarkerTopRel = 144;
    var restSpanTopRel = 212;

    var blockBottom = Math.max(
      noteMarkerTopRel + noteMarkerH,
      noteSpanTopRel + spanH,
      restMarkerTopRel + restMarkerH,
      restSpanTopRel + spanH
    );
    var blockTop = Math.max(0, Math.floor((laneHeight - blockBottom) / 2));

    var noteMarkerTop = blockTop + noteMarkerTopRel;
    var noteSpanTop = blockTop + noteSpanTopRel;
    var restMarkerTop = blockTop + restMarkerTopRel;
    var restSpanTop = blockTop + restSpanTopRel;

    barsEl.innerHTML = events.map(function (ev, idx) {
      var left = (ev.startBeat / total) * 100;
      var width = Math.max((ev.beats / total) * 100, 2);
      var isNoteLike = ev.type === 'note' || ev.type === 'chord';
      var label = ev.type === 'note'
        ? escapeHtml(ev.pitch) + ' (' + ev.beats + 'b)'
        : (ev.type === 'chord'
          ? 'chord ' + escapeHtml(ev.pitches.join('/')) + ' (' + ev.beats + 'b)'
          : 'rest (' + ev.beats + 'b)');
      var markerLabel = ev.type === 'note'
        ? escapeHtml(ev.pitch) + ' ' + ev.beats + 'b'
        : (ev.type === 'chord'
          ? 'CH ' + escapeHtml(ev.pitches.join('/')) + ' ' + ev.beats + 'b'
          : 'REST ' + ev.beats + 'b');
      var spanClass = ev.type === 'note'
        ? 'md-span md-span-note'
        : (ev.type === 'chord' ? 'md-span md-span-chord' : 'md-span md-span-rest');
      var markerClass = ev.type === 'note'
        ? 'md-bar md-bar-note'
        : (ev.type === 'chord' ? 'md-bar md-bar-chord' : 'md-bar md-bar-rest');
      var markerTop = isNoteLike ? noteMarkerTop : restMarkerTop;
      var spanTop = isNoteLike ? noteSpanTop : restSpanTop;
      var markerTitle = 'Event ' + (idx + 1) + ': ' + label;

      return '<div class="' + spanClass + '" style="left:' + left + '%;width:' + width + '%;top:' + spanTop + 'px;"></div>' +
        '<div class="' + markerClass + '" data-event-index="' + idx + '" title="' + markerTitle + '" style="left:' + left + '%;top:' + markerTop + 'px;"><span class="md-bar-label">' + markerLabel + '</span></div>';
    }).join('');
  }

  function clearActiveTimelineBars() {
    document.querySelectorAll('.md-bar-active').forEach(function (bar) {
      bar.classList.remove('md-bar-active');
    });
  }

  function setActiveTimelineBar(index) {
    clearActiveTimelineBars();
    var bar = document.querySelector('.md-bar[data-event-index="' + index + '"]');
    if (bar) bar.classList.add('md-bar-active');
  }

  function propSummary(args) {
    return Object.keys(args).map(function (key) {
      return '<span class="md-prop">' + escapeHtml(key) + '</span>=' + escapeHtml(args[key]);
    }).join(' ');
  }

  function renderEventList(parsed) {
    var list = byId('midi-events');
    if (!list) return;

    var rows = [];
    rows.push('<li><div class="md-event-head"><span class="md-event-type">Tempo</span><span class="md-event-time">Global</span></div><div class="md-event-props"><span class="md-prop">bpm</span>=' + parsed.tempo + '</div></li>');
    rows.push('<li><div class="md-event-head"><span class="md-event-type">Instrument</span><span class="md-event-time">Global</span></div><div class="md-event-props"><span class="md-prop">wave</span>=' + escapeHtml(parsed.wave) + '</div></li>');

    parsed.events.forEach(function (ev) {
      rows.push(
        '<li>' +
        '<div class="md-event-head"><span class="md-event-type">' + escapeHtml(ev.type) + '</span><span class="md-event-time">Beat ' + ev.startBeat + '</span></div>' +
        '<div class="md-event-props">' + propSummary(ev.args) + '</div>' +
        '</li>'
      );
    });

    list.innerHTML = rows.join('');
  }

  function stopPlayback() {
    activeNodes.forEach(function (node) {
      try { node.stop(); } catch (e) { }
      try { node.disconnect(); } catch (e) { }
    });
    activeNodes = [];

    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }

    while (activeBarTimers.length) {
      clearTimeout(activeBarTimers.pop());
    }
    clearActiveTimelineBars();
  }

  async function ensureAudio() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.45;
      masterGain.connect(audioCtx.destination);
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    return audioCtx;
  }

  async function playProgram(parsed) {
    var status = byId('midi-status');

    if (parsed.errors.length) {
      status.className = 'md-status error';
      status.textContent = parsed.errors[0];
      return;
    }

    if (!parsed.events.some(function (ev) { return ev.type === 'note' || ev.type === 'chord'; })) {
      status.className = 'md-status error';
      status.textContent = 'No note/chord events to play.';
      return;
    }

    var ctx = await ensureAudio();
    if (!ctx) {
      status.className = 'md-status error';
      status.textContent = 'Web Audio is not supported in this browser.';
      return;
    }

    stopPlayback();

    var secPerBeat = 60 / parsed.tempo;
    var startAt = ctx.currentTime + 0.05;

    parsed.events.forEach(function (ev, idx) {
      if (ev.type !== 'note' && ev.type !== 'chord') return;

      var when = startAt + (ev.startBeat * secPerBeat);
      var duration = Math.max(ev.beats * secPerBeat, 0.03);

      var frequencies = ev.type === 'chord' ? ev.frequencies : [ev.frequency];
      var voiceScale = 1 / Math.max(1, frequencies.length);
      frequencies.forEach(function (freq) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.type = parsed.wave;
        osc.frequency.value = freq;

        var level = (ev.velocity / 127) * 0.28 * voiceScale;
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.linearRampToValueAtTime(level, when + 0.01);
        gain.gain.linearRampToValueAtTime(0.0001, when + duration - 0.02);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(when);
        osc.stop(when + duration);

        activeNodes.push(osc);
        activeNodes.push(gain);
      });

      var highlightDelayMs = Math.max((when - ctx.currentTime) * 1000, 0);
      var clearDelayMs = Math.max((when + duration - ctx.currentTime) * 1000, 0);
      activeBarTimers.push(setTimeout(function () {
        setActiveTimelineBar(idx);
      }, highlightDelayMs));
      activeBarTimers.push(setTimeout(function () {
        clearActiveTimelineBars();
      }, clearDelayMs));
    });

    var totalSeconds = Math.max(parsed.totalBeats * secPerBeat, 0.1);
    status.className = 'md-status';
    status.textContent = 'Playing: ' + parsed.events.length + ' event messages at ' + parsed.tempo + ' bpm.';

    stopTimer = setTimeout(function () {
      stopPlayback();
      status.className = 'md-status';
      status.textContent = 'Playback finished.';
    }, Math.ceil(totalSeconds * 1000) + 200);
  }

  function render(parsed) {
    byId('midi-info').textContent = 'Tempo: ' + parsed.tempo + ' bpm | Wave: ' + parsed.wave;
    renderBars(parsed);
    renderEventList(parsed);

    var status = byId('midi-status');
    if (parsed.errors.length) {
      status.className = 'md-status error';
      status.textContent = parsed.errors[0];
    } else {
      status.className = 'md-status';
      status.textContent = parsed.events.length + ' event messages parsed.';
    }
  }

  function currentParse() {
    return parseProgram(byId('midi-editor').value);
  }

  function loadSample(name) {
    if (!Object.prototype.hasOwnProperty.call(SAMPLES, name)) return;
    stopPlayback();
    byId('midi-editor').value = SAMPLES[name];
    render(currentParse());
    setActiveSampleButton(name);
  }

  function setActiveSampleButton(name) {
    document.querySelectorAll('[data-midi-sample]').forEach(function (button) {
      var sampleName = button.getAttribute('data-midi-sample');
      button.classList.toggle('btn-submit', sampleName === name);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var editor = byId('midi-editor');
    if (!editor) return;

    loadSample('classicRiff');

    editor.addEventListener('input', function () {
      render(currentParse());
    });

    document.querySelectorAll('[data-midi-sample]').forEach(function (button) {
      button.addEventListener('click', function () {
        loadSample(button.getAttribute('data-midi-sample'));
      });
    });

    byId('midi-clear').addEventListener('click', function () {
      editor.value = '';
      render(currentParse());
      setActiveSampleButton('');
      editor.focus();
    });

    byId('midi-stop').addEventListener('click', function () {
      stopPlayback();
      var status = byId('midi-status');
      status.className = 'md-status';
      status.textContent = 'Playback stopped.';
    });

    byId('midi-play').addEventListener('click', function () {
      var parsed = currentParse();
      render(parsed);
      playProgram(parsed);
    });
  });
})();
