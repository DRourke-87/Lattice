/*
 * Screen orchestration: Document → Model → Assurance, plus the
 * document-dissolves-into-graph transition and the query side panel.
 */
(function () {
  const data = Lattice.data;
  let graphStarted = false;

  /* ---------------- Navigation ---------------- */

  const screens = ['document', 'model', 'assurance'];

  function show(name) {
    screens.forEach((s) => {
      document.getElementById('screen-' + s).classList.toggle('active', s === name);
      document.querySelector('[data-nav="' + s + '"]').classList.toggle('active', s === name);
    });
    if (name === 'model') startGraph();
    if (name === 'assurance') {
      Lattice.dashboard.render(document.getElementById('screen-assurance'));
    }
  }

  document.querySelectorAll('[data-nav]').forEach((btn) =>
    btn.addEventListener('click', () => show(btn.dataset.nav)));

  /* ---------------- Screen 1: the document ---------------- */

  function renderDocument() {
    const holder = document.getElementById('doc-body');
    const sections = {};
    data.nodes.filter((n) => n.type === 'requirement').forEach((r) => {
      (sections[r.section] = sections[r.section] || []).push(r);
    });
    let i = 3; // fake section numbering starts after boilerplate
    holder.innerHTML = Object.entries(sections).map(([title, reqs]) => {
      i += 1;
      return '<h3 class="doc-h">' + i + '. ' + title + '</h3>' +
        reqs.map((r, j) =>
          '<p class="doc-p"><span class="doc-ref">' + i + '.' + (j + 1) +
          ' [' + r.id + ']</span> ' + r.text +
          ' The Contractor shall provide objective evidence of compliance at each design review.</p>'
        ).join('');
    }).join('');
  }

  document.getElementById('btn-structure').addEventListener('click', () => {
    // Dissolve: stagger the paragraphs out, then reveal the model.
    const blocks = document.querySelectorAll('#doc-body > *, .doc-header');
    blocks.forEach((b, idx) => {
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
    Lattice.graph.init('#graph-svg', data, { onNodeClick: showNodeCard });
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

  function badge(status) {
    const map = {
      verified: ['Verified', 'badge-ok'],
      planned: ['Verification planned', 'badge-plan'],
      none: ['No verification method', 'badge-gap'],
    };
    const [label, cls] = map[status];
    return '<span class="badge ' + cls + '">' + label + '</span>';
  }

  function reqCard(r) {
    const comps = Lattice.queries.linkedComponents(r.id);
    const risks = Lattice.queries.linkedRisks(r.id);
    const status = Lattice.queries.verificationStatus(r.id);
    return '<div class="card">' +
      '<div class="card-head"><span class="mono">' + r.id + '</span>' + badge(status) + '</div>' +
      '<div class="card-title">' + r.label + '</div>' +
      '<p class="card-text">' + r.text + '</p>' +
      (comps.length ? '<div class="card-row"><span class="card-k">Allocated to</span> ' +
        comps.map((c) => '<span class="chip chip-cmp">' + c.label + '</span>').join('') + '</div>' : '') +
      (risks.length ? '<div class="card-row"><span class="card-k">Risks</span> ' +
        risks.map((k) => '<span class="risk-chip risk-' + k.severity + '">' + k.id + ' ' + k.label + '</span>').join('') + '</div>' : '') +
      '</div>';
  }

  function showNodeCard(node) {
    panelTitle.textContent = node.id;
    if (node.type === 'requirement') {
      panelBody.innerHTML = reqCard(node);
    } else {
      panelBody.innerHTML = '<div class="card"><div class="card-head">' +
        '<span class="mono">' + node.id + '</span>' +
        '<span class="badge badge-type">' + node.type + '</span></div>' +
        '<div class="card-title">' + node.label + '</div></div>';
    }
    openPanel();
  }

  function runQuery(text) {
    const canned = Lattice.queries.match(text);
    if (!canned) {
      panelTitle.textContent = 'No match';
      panelBody.innerHTML = '<p class="panel-note">This concept demo answers a small set of ' +
        'scripted questions — try one of the suggested queries below the search bar.</p>';
      openPanel();
      return;
    }
    const result = canned.run();
    Lattice.graph.focus([...result.set], result.alerts);

    const reqs = Lattice.queries.requirementsOf(result.set)
      .sort((a, b) => (a.id === result.primary ? -1 : b.id === result.primary ? 1 : a.id < b.id ? -1 : 1));
    panelTitle.textContent = reqs.length + ' requirement' + (reqs.length === 1 ? '' : 's');
    panelBody.innerHTML = '<p class="panel-note">' + canned.summary + '</p>' +
      reqs.map(reqCard).join('');
    openPanel();
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
  Lattice.queries.CANNED.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'query-chip';
    b.textContent = c.label;
    b.addEventListener('click', () => { input.value = c.label; runQuery(c.label); });
    chips.appendChild(b);
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    input.value = '';
    closePanel();
    Lattice.graph.clearFocus();
  });

  /* ---------------- Boot ---------------- */

  document.getElementById('programme-name').textContent = data.programme;
  document.getElementById('programme-sub').textContent = data.subtitle;
  renderDocument();
  show('document');
})();
