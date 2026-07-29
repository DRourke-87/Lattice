/*
 * Screen orchestration for the 90-day plan reuse case.
 *
 * Structurally identical to js/main.js — slide → model → status board, the
 * same dissolve transition, the same query/focus/side-panel loop. What
 * differs is the schema handed to the engine and the cards rendered in the
 * panel. That is the entire cost of re-pointing the product at a new domain.
 */
(function () {
  const data = Lattice.planData;
  const Q = Lattice.planQueries;
  let graphStarted = false;
  let currentNode = null;
  let lastQuery = null;

  /* ---------------- The plan schema ---------------- */

  const TYPE_COLOUR = {
    stakeholder: '#4b6994',   // slate: "who", deliberately outside the phase palette
    metric: '#8d9cb3',        // peripheral, low-contrast — outcomes, not active work
    quick_win: '#b47b0a',     // deep gold, distinct from the phase 3 amber
  };

  const RADIUS = {
    phase: 18, action: 8, quick_win: 9.5, stakeholder: 10, metric: 5, blocker: 8,
  };

  const SHAPE = {
    phase: 'circle', action: 'circle', quick_win: 'star',
    stakeholder: 'square', metric: 'diamond', blocker: 'triangle',
  };

  // Status drives motion and glow, never colour — phase colour owns the
  // colour channel, so the two stay legible at the same time.
  const MOTION = {
    in_progress: { amp: 0.16, period: 820 },   // active pulse, brighter glow
    at_risk:     { amp: 0.20, period: 520 },   // faster rhythm, red-tinted
    complete:    { amp: 0.03, period: 1600 },  // steady, dimmer
    not_started: { amp: 0,    period: 900 },   // static, low opacity
  };

  const isLive = (d) => data.LIVE_TYPES.indexOf(d.type) !== -1;

  function nodeColour(d) {
    if (d.type === 'blocker') return d.severity === 'high' ? '#c0392b' : '#d55c17';
    if (TYPE_COLOUR[d.type]) return TYPE_COLOUR[d.type];
    return data.phaseColour(d.type === 'phase' ? d.id : d.phase);
  }

  const LINK_DISTANCE = {
    belongs_to: 62, depends_on: 58, owned_by: 92, measured_by: 110, blocked_by: 44,
  };

  // A graph tuned for a presentation screen bursts out of a phone-sized
  // canvas, so the spread scales with whatever room it actually gets.
  function planSchema() {
    const compact = Math.min(window.innerWidth, window.innerHeight) < 700;
    const k = compact ? 0.55 : 1;
    // Even fractions of the canvas, one per phase: 0.25/0.5/0.75 for three.
    const spread = (d) => (data.phaseOrder[d.id] + 1) / (data.phases.length + 1);
    return {
      colour: nodeColour,
      radius: (d) => RADIUS[d.type] || 6,
      symbol: (d) => SHAPE[d.type] || 'circle',
      showLabel: (d) => d.type === 'phase' || d.type === 'stakeholder' || d.type === 'quick_win',
      labelOnFocus: true,
      statusClass: (d) => (isLive(d) ? d.status : 'none'),
      statusClasses: data.STATUSES.concat(['none']),
      motion: (d) => (isLive(d) ? MOTION[d.status] : { amp: 0.05, period: 1200 }),
      linkDistance: (l) => (LINK_DISTANCE[l.kind] || 60) * k,
      linkStrength: 0.5,
      charge: -430 * k,
      collidePad: compact ? 5 : 9,
      // Phase hubs are pinned out along the canvas in plan order, so the graph
      // reads as 90 days of time: left-to-right on a landscape screen, top-to-
      // bottom on a portrait one. Actions follow their phase via belongs_to;
      // everything else stays centre-weighted.
      anchorX: (d, w) => (d.type === 'phase' && !compact ? w * spread(d) : w / 2),
      anchorY: (d, w, h) => (d.type === 'phase' && compact ? h * spread(d) : h / 2),
      gravity: {
        x: (d) => (d.type === 'phase' ? (compact ? 0.1 : 0.42) : 0.045),
        y: (d) => (d.type === 'phase' ? (compact ? 0.42 : 0.25) : 0.06),
      },
      // 36 nodes is a sparse graph: without a lower ceiling a focused query
      // zooms until the labels are bigger than the nodes they belong to.
      maxZoom: 1.35,
    };
  }

  /* ---------------- Navigation ---------------- */

  const screens = ['plan', 'model', 'status'];

  function show(name) {
    screens.forEach((s) => {
      document.getElementById('screen-' + s).classList.toggle('active', s === name);
      document.querySelector('[data-nav="' + s + '"]').classList.toggle('active', s === name);
    });
    if (name === 'model') startGraph();
    if (name === 'status') Lattice.planDashboard.render(document.getElementById('screen-status'));
  }

  document.querySelectorAll('[data-nav]').forEach((btn) =>
    btn.addEventListener('click', () => show(btn.dataset.nav)));

  /* ---------------- Screen 1: the plan as it appears on a slide ---------------- */

  function renderSlide() {
    document.getElementById('plan-title').textContent = 'The first 90 days';
    document.getElementById('plan-eyebrow').textContent = data.context;
    document.getElementById('plan-sub').textContent =
      data.phases.length + ' phases, ' + Q.allActions().length + ' actions, ' +
      Q.allQuickWins().length + ' quick wins — the version that fits on a slide.';

    document.getElementById('plan-columns').innerHTML = data.phases.map((p) => {
      const acts = Q.actionsIn(p.id);
      const win = Q.allQuickWins().find((q) => q.phase === p.id);
      const mets = Q.metricsOf(p.id);
      const colour = data.phaseColour(p.id);
      return '<div class="plan-col" style="border-top-color:' + colour + '">' +
        '<div class="plan-col-head">' +
          '<span class="plan-col-days">' + p.label + '</span>' +
          '<span class="plan-col-title" style="color:' + colour + '">' + p.sublabel + '</span>' +
        '</div>' +
        '<ul class="plan-bullets">' +
          acts.map((a) => '<li>' + a.label + '</li>').join('') +
        '</ul>' +
        (win ? '<div class="plan-win"><span class="qw-mark">★</span> Quick win: ' + win.label + '</div>' : '') +
        (mets.length ? '<div class="plan-metric"><span class="card-k">Measured by</span> ' +
          mets.map((m) => m.label).join(' · ') + '</div>' : '') +
      '</div>';
    }).join('');
  }

  document.getElementById('btn-structure').addEventListener('click', () => {
    const blocks = document.querySelectorAll('#plan-columns > *, .plan-slide-head');
    blocks.forEach((b) => {
      b.style.transitionDelay = (Math.random() * 350) + 'ms';
      b.classList.add('dissolve');
    });
    document.getElementById('btn-structure').disabled = true;
    setTimeout(() => {
      show('model');
      Lattice.graph.wake();
      blocks.forEach((b) => { b.classList.remove('dissolve'); b.style.transitionDelay = ''; });
      document.getElementById('btn-structure').disabled = false;
    }, 950);
  });

  /* ---------------- Screen 2: the model ---------------- */

  function startGraph() {
    if (graphStarted) return;
    graphStarted = true;
    Lattice.graph.init('#graph-svg', data, {
      schema: planSchema(),
      onNodeClick: showNodeCard,
      onNodeDblClick: (d) => { if (isLive(d)) cycleStatus(d.id); },
    });
  }

  const panel = document.getElementById('side-panel');
  const panelBody = document.getElementById('panel-body');
  const panelTitle = document.getElementById('panel-title');

  function openPanel() { panel.classList.add('open'); }
  function closePanel() { panel.classList.remove('open'); }
  document.getElementById('panel-close').addEventListener('click', () => {
    closePanel();
    Lattice.graph.clearFocus();
    document.getElementById('query-input').value = '';
  });

  function statusBadge(status) {
    return '<span class="badge badge-' + status.replace('_', '') + '">' +
      data.STATUS_LABEL[status] + '</span>';
  }

  function phaseChip(phaseId) {
    const p = data.byId[phaseId];
    if (!p) return '';
    return '<span class="chip chip-phase" style="background:' + data.phaseTint(phaseId, 0.14) +
      ';color:' + data.phaseColour(phaseId) + '">' + p.label + ' · ' + p.sublabel + '</span>';
  }

  const chip = (n) => '<span class="chip">' + n.label + '</span>';
  const blockerChip = (b) => '<span class="risk-chip risk-' + b.severity + '">' + b.label + '</span>';
  const row = (k, html) =>
    (html ? '<div class="card-row"><span class="card-k">' + k + '</span> ' + html + '</div>' : '');

  function cycleControl(id) {
    return '<button class="status-btn" data-cycle="' + id + '">Cycle status ▸</button>';
  }

  function actionCard(a) {
    return '<div class="card">' +
      '<div class="card-head"><span class="mono">' + a.id + '</span>' + statusBadge(a.status) + '</div>' +
      '<div class="card-title">' + a.label + '</div>' +
      '<div class="card-row">' + phaseChip(a.phase) + '</div>' +
      '<p class="card-text">' + a.detail + '</p>' +
      row('Owned by', Q.owners(a.id).map((o) => '<span class="chip chip-stk">' + o.label + '</span>').join('')) +
      row('Depends on', Q.prerequisites(a.id).map(chip).join('')) +
      row('Blocks', Q.dependents(a.id).filter((n) => n.type === 'action').map(chip).join('')) +
      row('Blocked by', Q.blockers(a.id).map(blockerChip).join(' ')) +
      row('Quick win', Q.quickWinsOf(a.id).map((w) =>
        '<span class="chip chip-win">★ ' + w.label + '</span>').join('')) +
      row('Measured by', Q.metricsOf(a.id).map((m) =>
        '<span class="chip chip-met">' + m.label + '</span>').join('')) +
      cycleControl(a.id) +
    '</div>';
  }

  const TYPE_LABEL = {
    phase: 'Phase', stakeholder: 'Stakeholder', metric: 'Metric',
    quick_win: 'Quick win', blocker: 'Blocker',
  };

  function simpleCard(node) {
    const extra = [];

    if (node.type === 'quick_win') {
      const by = Q.enablingAction(node.id);
      extra.push('<div class="card-row">' + phaseChip(node.phase) + '</div>');
      if (by) extra.push(row('Delivered by', chip(by)));
      extra.push(cycleControl(node.id));
    }
    if (node.type === 'stakeholder') {
      extra.push(row('Owns', Q.ownedBy(node.id).map(chip).join('')));
    }
    if (node.type === 'blocker') {
      extra.push('<p class="card-text">' + node.detail + '</p>');
      extra.push(row('Blocking', Q.blocking(node.id).map(chip).join('')));
    }
    if (node.type === 'metric') {
      extra.push('<p class="card-text">' + node.outcome + '</p>');
      extra.push(row('Driven by', Q.driving(node.id).map(chip).join('')));
    }
    if (node.type === 'phase') {
      const acts = Q.actionsIn(node.id);
      const done = acts.filter((a) => a.status === 'complete').length;
      extra.push(row('Progress', '<span class="chip">' + done + ' of ' + acts.length + ' complete</span>'));
      extra.push(row('Measured by', Q.metricsOf(node.id).map((m) =>
        '<span class="chip chip-met">' + m.label + '</span>').join('')));
    }

    const head = node.type === 'quick_win' && node.status
      ? statusBadge(node.status)
      : '<span class="badge badge-' +
        (node.type === 'blocker' ? node.severity : 'type') + '">' +
        (node.type === 'blocker' ? node.severity + ' severity' : TYPE_LABEL[node.type] || node.type) +
        '</span>';

    return '<div class="card">' +
      '<div class="card-head"><span class="mono">' + node.id + '</span>' + head + '</div>' +
      '<div class="card-title">' + node.label +
        (node.type === 'phase' ? ' · ' + node.sublabel : '') +
        (node.type === 'metric' ? ' <span class="card-area">' + node.area + '</span>' : '') +
      '</div>' +
      extra.join('') +
    '</div>';
  }

  const cardFor = (node) => (node.type === 'action' ? actionCard(node) : simpleCard(node));

  function showNodeCard(node) {
    currentNode = node;
    panelTitle.textContent = node.id;
    panelBody.innerHTML = cardFor(node);
    openPanel();
  }

  // The "living" bit: cycle a status and everything re-reads it — the node's
  // motion, the side panel, and the status board on screen 3.
  function cycleStatus(id) {
    if (!data.cycleStatus(id)) return;
    Lattice.graph.refresh();
    if (!panel.classList.contains('open')) return;
    if (currentNode && currentNode.id === id) {
      panelBody.innerHTML = cardFor(data.byId[id]);
    } else if (lastQuery) {
      runQuery(lastQuery, true);
    }
  }

  panelBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cycle]');
    if (btn) cycleStatus(btn.dataset.cycle);
  });

  // Plan order: phase first, then the id's numeric suffix.
  function planOrder(n) {
    const seq = parseInt(String(n.id).replace(/\D+/g, ''), 10) || 0;
    return (data.phaseOrder[n.phase] != null ? data.phaseOrder[n.phase] : 9) * 1000 + seq;
  }

  function runQuery(text, quiet) {
    const canned = Q.match(text);
    if (!canned) {
      lastQuery = null;
      panelTitle.textContent = 'No match';
      panelBody.innerHTML = '<p class="panel-note">This demo answers a small set of ' +
        'scripted questions — try one of the suggested queries below the search bar.</p>';
      openPanel();
      return;
    }
    lastQuery = text;
    currentNode = null;
    const result = canned.run();
    Lattice.graph.focus([...result.set], result.alerts);

    const listed = [...result.set]
      .map((id) => data.byId[id])
      .filter((n) => n && (n.type === 'action' || n.type === 'quick_win'))
      .sort((a, b) => planOrder(a) - planOrder(b));
    const primary = result.primary ? data.byId[result.primary] : null;
    if (primary && listed.indexOf(primary) === -1) listed.unshift(primary);
    else if (primary) {
      listed.splice(listed.indexOf(primary), 1);
      listed.unshift(primary);
    }

    panelTitle.textContent = listed.length + ' item' + (listed.length === 1 ? '' : 's');
    panelBody.innerHTML = '<p class="panel-note">' + canned.summary + '</p>' +
      listed.map(cardFor).join('');
    if (!quiet) openPanel();
  }

  const input = document.getElementById('query-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) runQuery(input.value.trim());
    if (e.key === 'Escape') {
      input.value = '';
      closePanel();
      Lattice.graph.clearFocus();
    }
  });

  const chips = document.getElementById('query-chips');
  Q.CANNED.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'query-chip';
    b.textContent = c.label;
    b.addEventListener('click', () => { input.value = c.label; runQuery(c.label); });
    chips.appendChild(b);
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    input.value = '';
    lastQuery = null;
    closePanel();
    Lattice.graph.clearFocus();
  });

  /* ---------------- Boot ---------------- */

  // Legend swatches take the phase colours straight from the data.
  document.getElementById('phase-legend').innerHTML = data.phases.map((p) =>
    '<span><i class="dot" style="background:' + data.phaseColour(p.id) + '"></i>' +
    p.label + '</span>').join('');

  document.querySelector('.brand-tag').textContent = data.title;
  renderSlide();
  show('plan');
})();
