(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var CANVAS_WIDTH = 480;
  var CANVAS_HEIGHT = 360;

  var SAMPLES = {
    house: [
      'rect x=40 y=180 width=170 height=100 fill=#ffd24d stroke=#ffffff strokeWidth=3',
      'polygon points="30,180 125,105 220,180" fill=#ff5555 stroke=#ffffff strokeWidth=3',
      'rect x=98 y=214 width=42 height=66 fill=#5a2d0c stroke=#ffffff strokeWidth=2',
      'rect x=160 y=205 width=30 height=30 fill=#8fd3ff stroke=#ffffff strokeWidth=2',
      'circle cx=320 cy=88 r=38 fill=#ffe45c stroke=#ffffff strokeWidth=3',
      'line x1=320 y1=38 x2=320 y2=6 stroke=#ffe45c strokeWidth=4',
      'line x1=320 y1=138 x2=320 y2=170 stroke=#ffe45c strokeWidth=4',
      'line x1=290 y1=88 x2=252 y2=88 stroke=#ffe45c strokeWidth=4',
      'line x1=350 y1=88 x2=388 y2=88 stroke=#ffe45c strokeWidth=4',
      'line x1=299 y1=67 x2=272 y2=40 stroke=#ffe45c strokeWidth=4',
      'line x1=341 y1=67 x2=368 y2=40 stroke=#ffe45c strokeWidth=4',
      'line x1=299 y1=109 x2=272 y2=136 stroke=#ffe45c strokeWidth=4',
      'line x1=341 y1=109 x2=368 y2=136 stroke=#ffe45c strokeWidth=4'
    ].join('\n'),
    rocket: [
      'polygon points="240,30 290,110 190,110" fill=#ff5555 stroke=#ffffff strokeWidth=3',
      'rect x=195 y=110 width=90 height=135 rx=18 fill=#d9e4ff stroke=#ffffff strokeWidth=3',
      'circle cx=240 cy=158 r=22 fill=#00c8ff stroke=#ffffff strokeWidth=3',
      'polygon points="195,205 150,250 195,245" fill=#5e76ff stroke=#ffffff strokeWidth=3',
      'polygon points="285,205 330,250 285,245" fill=#5e76ff stroke=#ffffff strokeWidth=3',
      'polygon points="214,245 240,305 266,245" fill=#ff9a3d stroke=#ffffff strokeWidth=3',
      'text x=240 y=95 content="A" fill=#ffffff fontSize=28 textAnchor=middle fontWeight=700'
    ].join('\n'),
    logo: [
      'rect x=112 y=52 width=256 height=256 rx=44 fill=#050505',
      'rect x=158 y=250 width=164 height=24 rx=8 fill=#ffe500',
      'rect x=158 y=196 width=24 height=78 rx=8 fill=#ffe500',
      'rect x=228 y=208 width=24 height=66 rx=8 fill=#ffe500',
      'rect x=298 y=196 width=24 height=78 rx=8 fill=#ffe500',
      'rect x=194 y=86 width=92 height=92 rx=26 fill=#ff3b30',
      'rect x=218 y=110 width=44 height=44 rx=14 fill=#050505'
    ].join('\n'),
    landscape: [
      'rect x=0 y=0 width=480 height=320 fill=#18103c',
      'circle cx=388 cy=72 r=40 fill=#fff08a opacity=0.95',
      'polygon points="0,240 80,170 170,230 250,150 330,220 410,135 480,210 480,320 0,320" fill=#50368d',
      'polygon points="0,270 90,220 170,255 250,205 320,250 400,215 480,255 480,320 0,320" fill=#2bb673',
      'rect x=62 y=208 width=12 height=74 fill=#5a2d0c',
      'circle cx=68 cy=193 r=27 fill=#00c95c'
    ].join('\n')
  };

  function byId(id) {
    return document.getElementById(id);
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isComment(line) {
    return !line || /^#/.test(line) || /^\/\//.test(line);
  }

  function requireNumber(args, key, lineNo, errors) {
    var value = Number(args[key]);
    if (!Number.isFinite(value)) {
      errors.push('Line ' + lineNo + ': missing or invalid ' + key + '.');
      return null;
    }
    return value;
  }

  function buildObject(type, lineNo, args, errors) {
    var obj = { type: type, lineNo: lineNo, args: args };
    if (type === 'rect') {
      obj.x = requireNumber(args, 'x', lineNo, errors);
      obj.y = requireNumber(args, 'y', lineNo, errors);
      obj.width = requireNumber(args, 'width', lineNo, errors);
      obj.height = requireNumber(args, 'height', lineNo, errors);
      obj.rx = args.rx != null ? Number(args.rx) : null;
      obj.ry = args.ry != null ? Number(args.ry) : null;
      return obj;
    }
    if (type === 'circle') {
      obj.cx = requireNumber(args, 'cx', lineNo, errors);
      obj.cy = requireNumber(args, 'cy', lineNo, errors);
      obj.r = requireNumber(args, 'r', lineNo, errors);
      return obj;
    }
    if (type === 'ellipse') {
      obj.cx = requireNumber(args, 'cx', lineNo, errors);
      obj.cy = requireNumber(args, 'cy', lineNo, errors);
      obj.rx = requireNumber(args, 'rx', lineNo, errors);
      obj.ry = requireNumber(args, 'ry', lineNo, errors);
      return obj;
    }
    if (type === 'line') {
      obj.x1 = requireNumber(args, 'x1', lineNo, errors);
      obj.y1 = requireNumber(args, 'y1', lineNo, errors);
      obj.x2 = requireNumber(args, 'x2', lineNo, errors);
      obj.y2 = requireNumber(args, 'y2', lineNo, errors);
      return obj;
    }
    if (type === 'polygon' || type === 'polyline') {
      if (!args.points) errors.push('Line ' + lineNo + ': missing points.');
      obj.points = args.points || '';
      return obj;
    }
    if (type === 'text') {
      obj.x = requireNumber(args, 'x', lineNo, errors);
      obj.y = requireNumber(args, 'y', lineNo, errors);
      if (!args.content) errors.push('Line ' + lineNo + ': missing content.');
      obj.content = args.content || '';
      return obj;
    }
    errors.push('Line ' + lineNo + ': unsupported command ' + type + '.');
    return null;
  }

  function parseProgram(source) {
    var objects = [];
    var errors = [];
    String(source || '').split(/\r?\n/).forEach(function (line, index) {
      var trimmed = line.trim();
      if (isComment(trimmed)) return;
      var parts = trimmed.split(/\s+/, 2);
      var type = parts[0];
      var rawArgs = trimmed.slice(type.length).trim();
      var args = parseArgs(rawArgs);
      var obj = buildObject(type, index + 1, args, errors);
      if (obj) objects.push(obj);
    });
    return { objects: objects, errors: errors };
  }

  function applyCommonAttributes(el, args, type) {
    if (args.fill != null) {
      el.setAttribute('fill', args.fill);
    } else if (type === 'line' || type === 'polyline') {
      el.setAttribute('fill', 'none');
    }

    if (args.stroke != null) el.setAttribute('stroke', args.stroke);
    if (args.strokeWidth != null) el.setAttribute('stroke-width', args.strokeWidth);
    if (args.opacity != null) el.setAttribute('opacity', args.opacity);
    if (args.textAnchor != null) el.setAttribute('text-anchor', args.textAnchor);
    if (args.fontSize != null) el.setAttribute('font-size', args.fontSize);
    if (args.fontFamily != null) el.setAttribute('font-family', args.fontFamily);
    if (args.fontWeight != null) el.setAttribute('font-weight', args.fontWeight);
  }

  function renderObject(svg, obj) {
    var el = document.createElementNS(SVG_NS, obj.type);
    var args = obj.args;

    if (obj.type === 'rect') {
      el.setAttribute('x', obj.x);
      el.setAttribute('y', obj.y);
      el.setAttribute('width', obj.width);
      el.setAttribute('height', obj.height);
      if (Number.isFinite(obj.rx)) el.setAttribute('rx', obj.rx);
      if (Number.isFinite(obj.ry)) el.setAttribute('ry', obj.ry);
    } else if (obj.type === 'circle') {
      el.setAttribute('cx', obj.cx);
      el.setAttribute('cy', obj.cy);
      el.setAttribute('r', obj.r);
    } else if (obj.type === 'ellipse') {
      el.setAttribute('cx', obj.cx);
      el.setAttribute('cy', obj.cy);
      el.setAttribute('rx', obj.rx);
      el.setAttribute('ry', obj.ry);
    } else if (obj.type === 'line') {
      el.setAttribute('x1', obj.x1);
      el.setAttribute('y1', obj.y1);
      el.setAttribute('x2', obj.x2);
      el.setAttribute('y2', obj.y2);
    } else if (obj.type === 'polygon' || obj.type === 'polyline') {
      el.setAttribute('points', obj.points);
    } else if (obj.type === 'text') {
      el.setAttribute('x', obj.x);
      el.setAttribute('y', obj.y);
      el.textContent = obj.content;
    }

    applyCommonAttributes(el, args, obj.type);
    svg.appendChild(el);
  }

  function propSummary(args) {
    return Object.keys(args).map(function (key) {
      return '<span class="vg-prop">' + escapeHtml(key) + '</span>=' + escapeHtml(args[key]);
    }).join(' ');
  }

  function renderObjectList(objects) {
    var list = byId('vg-object-list');
    if (!list) return;
    if (!objects.length) {
      list.innerHTML = '<li class="vg-empty">No drawable objects yet. Add a command such as <code>rect x=20 y=20 width=120 height=80 fill=#ffff00</code>.</li>';
      return;
    }

    list.innerHTML = objects.map(function (obj, idx) {
      return '<li>' +
        '<div class="vg-object-head"><span class="vg-object-type">Object ' + (idx + 1) + ': ' + obj.type + '</span><span class="vg-object-line">Line ' + obj.lineNo + '</span></div>' +
        '<div class="vg-object-props">' + propSummary(obj.args) + '</div>' +
        '</li>';
    }).join('');
  }

  function render() {
    var editor = byId('vg-editor');
    var svg = byId('vg-preview');
    var status = byId('vg-status');
    var width = CANVAS_WIDTH;
    var height = CANVAS_HEIGHT;

    var parsed = parseProgram(editor.value);
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = '';

    var bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', 0);
    bg.setAttribute('y', 0);
    bg.setAttribute('width', width);
    bg.setAttribute('height', height);
    bg.setAttribute('fill', 'transparent');
    svg.appendChild(bg);

    parsed.objects.forEach(function (obj) {
      renderObject(svg, obj);
    });
    renderObjectList(parsed.objects);

    if (parsed.errors.length) {
      status.className = 'vg-status error';
      status.textContent = parsed.objects.length + ' object' + (parsed.objects.length === 1 ? '' : 's') + ' rendered. ' + parsed.errors[0];
    } else {
      status.className = 'vg-status';
      status.textContent = parsed.objects.length + ' object' + (parsed.objects.length === 1 ? '' : 's') + ' rendered.';
    }
  }

  function loadSample(name) {
    var editor = byId('vg-editor');
    if (!editor || !Object.prototype.hasOwnProperty.call(SAMPLES, name)) return;
    editor.value = SAMPLES[name];
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var editor = byId('vg-editor');
    if (!editor) return;

    editor.value = SAMPLES.rocket;
    editor.addEventListener('input', render);

    document.querySelectorAll('[data-vg-sample]').forEach(function (button) {
      button.addEventListener('click', function () {
        loadSample(button.getAttribute('data-vg-sample'));
      });
    });

    byId('vg-clear').addEventListener('click', function () {
      editor.value = '';
      render();
      editor.focus();
    });

    render();
  });
})();
