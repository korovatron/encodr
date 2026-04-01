(function () {
  var audioCtx = null;
  var masterGain = null;
  var activeNodes = [];
  var stopTimer = null;
  var activeBarTimers = [];

  var SAMPLES = {
    scale: [
      'tempo bpm=120',
      'instrument wave=triangle',
      'note pitch=C4 beats=1 velocity=102',
      'note pitch=C4 beats=1 velocity=102',
      'note pitch=G4 beats=1 velocity=104',
      'note pitch=G4 beats=1 velocity=104',
      'note pitch=A4 beats=1 velocity=106',
      'note pitch=A4 beats=1 velocity=106',
      'note pitch=G4 beats=2 velocity=110',
      'rest beats=0.5',
      'note pitch=F4 beats=1 velocity=102',
      'note pitch=F4 beats=1 velocity=102',
      'note pitch=E4 beats=1 velocity=100',
      'note pitch=E4 beats=1 velocity=100',
      'note pitch=D4 beats=1 velocity=100',
      'note pitch=D4 beats=1 velocity=100',
      'note pitch=C4 beats=2 velocity=108'
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
      'tempo bpm=148',
      'instrument wave=square',
      'note pitch=E3 beats=0.5 velocity=112',
      'note pitch=G3 beats=0.5 velocity=108',
      'note pitch=A3 beats=0.5 velocity=110',
      'note pitch=G3 beats=0.5 velocity=108',
      'note pitch=E3 beats=0.5 velocity=112',
      'rest beats=0.25',
      'note pitch=D3 beats=0.25 velocity=104',
      'note pitch=E3 beats=0.5 velocity=110',
      'note pitch=G3 beats=0.5 velocity=108',
      'note pitch=B3 beats=0.5 velocity=112',
      'note pitch=A3 beats=0.5 velocity=110',
      'note pitch=G3 beats=0.5 velocity=108',
      'note pitch=E3 beats=0.5 velocity=112',
      'rest beats=0.25',
      'note pitch=D3 beats=0.25 velocity=104',
      'note pitch=E3 beats=1 velocity=114'
    ].join('\n'),
    chords: [
      'tempo bpm=90',
      'instrument wave=sawtooth',
      'note pitch=C4 beats=2 velocity=95',
      'note pitch=E4 beats=2 velocity=90',
      'note pitch=G4 beats=2 velocity=90',
      'rest beats=0.5',
      'note pitch=F4 beats=2 velocity=95',
      'note pitch=A4 beats=2 velocity=90',
      'note pitch=C5 beats=2 velocity=90',
      'rest beats=0.5',
      'note pitch=G4 beats=3 velocity=95',
      'note pitch=B4 beats=3 velocity=90',
      'note pitch=D5 beats=3 velocity=90'
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
    var noteLane = 24;
    var restLane = 58;

    barsEl.innerHTML = events.map(function (ev, idx) {
      var left = (ev.startBeat / total) * 100;
      var width = Math.max((ev.beats / total) * 100, 2);
      var cls = ev.type === 'note' ? 'md-bar md-bar-note' : 'md-bar md-bar-rest';
      var top = ev.type === 'note' ? noteLane : restLane;
      var label = ev.type === 'note'
        ? escapeHtml(ev.pitch) + ' (' + ev.beats + 'b)'
        : 'rest (' + ev.beats + 'b)';
      return '<div class="' + cls + '" data-event-index="' + idx + '" style="left:' + left + '%;width:' + width + '%;top:' + top + 'px;">' + label + '</div>';
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

    if (!parsed.events.some(function (ev) { return ev.type === 'note'; })) {
      status.className = 'md-status error';
      status.textContent = 'No note events to play.';
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
      if (ev.type !== 'note') return;

      var when = startAt + (ev.startBeat * secPerBeat);
      var duration = Math.max(ev.beats * secPerBeat, 0.03);

      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = parsed.wave;
      osc.frequency.value = ev.frequency;

      var level = (ev.velocity / 127) * 0.28;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(level, when + 0.01);
      gain.gain.linearRampToValueAtTime(0.0001, when + duration - 0.02);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(when);
      osc.stop(when + duration);

      activeNodes.push(osc);
      activeNodes.push(gain);

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
    byId('midi-editor').value = SAMPLES[name];
    render(currentParse());
  }

  document.addEventListener('DOMContentLoaded', function () {
    var editor = byId('midi-editor');
    if (!editor) return;

    editor.value = SAMPLES.scale;
    render(currentParse());

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
