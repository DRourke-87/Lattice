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

  /* ---------------- The plan schema ---------------- */

  const PHASE_COLOUR = { navy: '#1e4479', teal: '#1b9aaa', amber: '#d55c17' };

  const TYPE_COLOUR = {
    stakeholder: '#4b6994',   // slate: "who", deliberately outside the phase palette
    metric: '#8d9cb3',        // peripheral, low-contrast — outcomes, not active work
    quickwin: '#c98a0e',      // gold
    blocker: '#c0392b',
  };

  const RADIUS = {
    phase: 17, action: 7.5, stakeholder: 10, metric: 5, quickwin: 9, blocker: 8,
  };

  const SHAPE = {
    phase: 'circle', action: 'circle', stakeholder: 'square',
    metric: 'diamond', quickwin: 'star', blocker: 'triangle',
  };

  // Status drives motion and glow, never colour — phase colour owns the
  // colour channel, so the two stay legible at the same time.
  const MOTION = {
    in_progress: { amp: 0.16, period: 820 },   // active pulse
    at_risk:     { amp: 0.20, period: 520 },   // faster, red-tinted (see CSS)
    complete:    { amp: 0.03, period: 1600 },  // settled
    not_started: { amp: 0,    period: 900 },   // static
  };

  function phaseColourOf(node) {
    const phaseId = node.type === 'phase' ? node.id : node.phase;
    const p = data.byId[phaseId];
    return p ? PHASE_COLOUR[p.theme] : '#4b6994';
  }

  const LINK_DISTANCE = {
    belongs_to: 62, depends_on: 58, owned_by: 92,
    measured_by: 110, blocked_by: 44, delivers: 40,
  };

  // 46 nodes tuned for a presentation screen will burst out of a phone-sized
  // canvas, so the spread scales with whatever room the graph actually gets.
  function planSchema() {
    const compact = Math.min(window.innerWidth, window.innerHeight) < 700;
    const k = compact ? 0.55 : 1;
    return {
      colour: (d) => TYPE_COLOUR[d.type] || phaseColourOf(d),
      radius: (d) => RADIUS[d.type] || 6,
      symbol: (d) => SHAPE[d.type] || 'circle',
      showLabel: (d) => d.type === 'phase' || d.type === 'stakeholder' || d.type === 'quickwin',
      labelOnFocus: true,
      statusClass: (d) => (d.type === 'action' ? d.status : 'none'),
      statusClasses: data.STATUSES.concat(['none']),
      motion: (d) => (d.type === 'action' ? MOTION[d.status] : { amp: 0.05, period: 1200 }),
      linkDistance: (l) => (LINK_DISTANCE[l.kind] || 60) * k,
      linkStrength: 0.5,
      charge: -340 * k,
      collidePad: compact ? 5 : 9,
      gravity: { x: 0.05, y: 0.06 },
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
    const holder = document.getElementById('plan-columns');
    holder.innerHTML = data.phases.map((p) => {
      const acts = Q.actionsIn(p.id).sort((a, b) => a.day - b.day);
      const win = data.nodes.find((n) => n.type === 'quickwin' && n.phase === p.id);
      const metric = Q.metricsOf(p.id)[0];
      return '<div class="plan-col plan-' + p.theme + '">' +
        '<div class="plan-col-head">' +
          '<span class="plan-col-days">' + p.short + '</span>' +
          '<span class="plan-col-title">' + p.label.split('· ')[1] + '</span>' +
        '</div>' +
        '<p class="plan-col-intent">' + p.intent + '</p>' +
        '<ul class="plan-bullets">' +
          acts.map((a) => '<li>' + a.label + '</li>').join('') +
        '</ul>' +
        (win ? '<div class="plan-win"><span class="qw-mark">★</span> Quick win: ' + win.label + '</div>' : '') +
        (metric ? '<div class="plan-metric"><span class="card-k">Measured by</span> ' + metric.label + '</div>' : '') +
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
      onNodeDblClick: (d) => { if (d.type === 'action') cycleStatus(d.id); },
    });
  }

  const panel = document.getElementById('side-panel');
  const panelBody = document.getElementById('panel-body');
  const panelTitle = document.getElementById('panel-title');
  let lastQuery = null;

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
    return '<span class="chip chip-phase chip-' + p.theme + '">' + p.short + '</span>';
  }

  function actionCard(a) {
    const owns = Q.owners(a.id);
    const blks = Q.blockers(a.id);
    const mets = Q.metricsOf(a.id);
    const pre = Q.prerequisites(a.id);
    const post = Q.dependents(a.id);
    const wins = Q.deliverables(a.id);
    const row = (k, html) => (html ? '<div class="card-row"><span class="card-k">' + k + '</span> ' + html + '</div>' : '');

    return '<div class="card">' +
      '<div class="card-head"><span class="mono">' + a.id + '</span>' + statusBadge(a.status) + '</div>' +
      '<div class="card-title">' + a.label + '</div>' +
      '<div class="card-row">' + phaseChip(a.phase) +
        '<span class="chip">Target day ' + a.day + '</span></div>' +
      '<p class="card-text">' + a.detail + '</p>' +
      row('Owned by', owns.map((o) => '<span class="chip chip-stk">' + o.label + '</span>').join('')) +
      row('Depends on', pre.map((n) => '<span class="chip">' + n.id + ' ' + n.label + '</span>').join('')) +
      row('Blocks', post.map((n) => '<span class="chip">' + n.id + ' ' + n.label + '</span>').join('')) +
      row('Blocked by', blks.map((b) => '<span class="risk-chip risk-' + b.severity + '">' + b.label + '</span>').join(' ')) +
      row('Quick win', wins.map((w) => '<span class="chip chip-win">★ ' + w.label + '</span>').join('')) +
      row('Measured by', mets.map((m) => '<span class="chip chip-met">' + m.label + '</span>').join('')) +
      '<button class="status-btn" data-cycle="' + a.id + '">Cycle status ▸</button>' +
    '</div>';
  }

  const TYPE_LABEL = {
    phase: 'Phase', stakeholder: 'Stakeholder', metric: 'Metric',
    quickwin: 'Quick win', blocker: 'Blocker',
  };

  function simpleCard(node) {
    const extra = [];
    if (node.type === 'stakeholder') {
      const owned = Q.ownedBy(node.id).sort((a, b) => a.day - b.day);
      extra.push('<p class="card-text">' + node.role + '</p>');
      extra.push('<div class="card-row"><span class="card-k">Owns</span> ' +
        owned.map((a) => '<span class="chip">' + a.id + ' ' + a.label + '</span>').join('') + '</div>');
    }
    if (node.type === 'blocker') {
      extra.push('<p class="card-text">' + node.note + '</p>');
      const blocked = data.links
        .filter((l) => l.kind === 'blocked_by' &&
          (typeof l.target === 'object' ? l.target.id : l.target) === node.id)
        .map((l) => data.byId[typeof l.source === 'object' ? l.source.id : l.source]);
      extra.push('<div class="card-row"><span class="card-k">Blocking</span> ' +
        blocked.map((a) => '<span class="chip">' + a.id + ' ' + a.label + '</span>').join('') + '</div>');
    }
    if (node.type === 'quickwin') {
      const by = Q.deliveredBy(node.id)[0];
      extra.push('<p class="card-text">' + node.note + '</p>');
      extra.push('<div class="card-row">' + phaseChip(node.phase) +
        '<span class="chip">Target day ' + node.day + '</span></div>');
      if (by) extra.push('<div class="card-row"><span class="card-k">Delivered by</span> ' +
        '<span class="chip">' + by.id + ' ' + by.label + '</span></div>');
    }
    if (node.type === 'metric') {
      extra.push('<p class="card-text">' + node.target + '</p>');
      const drivers = data.links
        .filter((l) => l.kind === 'measured_by' &&
          (typeof l.target === 'object' ? l.target.id : l.target) === node.id)
        .map((l) => data.byId[typeof l.source === 'object' ? l.source.id : l.source]);
      extra.push('<div class="card-row"><span class="card-k">Driven by</span> ' +
        drivers.map((a) => '<span class="chip">' + a.id + ' ' + a.label + '</span>').join('') + '</div>');
    }
    if (node.type === 'phase') {
      const acts = Q.actionsIn(node.id);
      const done = acts.filter((a) => a.status === 'complete').length;
      extra.push('<p class="card-text">' + node.intent + '</p>');
      extra.push('<div class="card-row"><span class="card-k">Progress</span> ' +
        '<span class="chip">' + done + ' of ' + acts.length + ' complete</span></div>');
    }

    return '<div class="card">' +
      '<div class="card-head"><span class="mono">' + node.id + '</span>' +
      '<span class="badge badge-type">' + (TYPE_LABEL[node.type] || node.type) + '</span></div>' +
      '<div class="card-title">' + node.label + '</div>' +
      extra.join('') +
    '</div>';
  }

  function cardFor(node) {
    return node.type === 'action' ? actionCard(node) : simpleCard(node);
  }

  function showNodeCard(node) {
    currentNode = node;
    panelTitle.textContent = node.id;
    panelBody.innerHTML = cardFor(node);
    openPanel();
  }

  // The "living" bit: cycle a status and everything re-reads it — the node's
  // motion, the side panel, and the status board on screen 3.
  function cycleStatus(id) {
    data.cycleStatus(id);
    Lattice.graph.refresh();
    if (panel.classList.contains('open')) {
      if (currentNode && currentNode.id === id) {
        panelBody.innerHTML = cardFor(data.byId[id]);
      } else if (lastQuery) {
        runQuery(lastQuery, true);
      }
    }
  }

  panelBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cycle]');
    if (btn) cycleStatus(btn.dataset.cycle);
  });

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
      .filter((n) => n && (n.type === 'action' || n.type === 'quickwin'))
      .sort((a, b) => {
        if (a.id === result.primary) return -1;
        if (b.id === result.primary) return 1;
        return a.day - b.day;
      });
    const primary = result.primary ? data.byId[result.primary] : null;
    if (primary && !listed.includes(primary)) listed.unshift(primary);

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

  renderSlide();
  show('plan');
})();
