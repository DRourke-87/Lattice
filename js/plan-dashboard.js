/*
 * Plan status board — the reuse-case counterpart to js/dashboard.js.
 * Everything is computed live from the same model the graph renders, so
 * cycling a node's status on screen 2 changes these numbers on screen 3.
 */
window.Lattice = window.Lattice || {};

Lattice.planDashboard = (function () {
  const Q = () => Lattice.planQueries;

  const STATUS_COLOUR = {
    complete: '#2e9e4f',
    in_progress: '#0090dc',
    at_risk: '#c0392b',
    not_started: '#a5b4c9',
  };

  function stats() {
    const d = Lattice.planData;
    const actions = Q().allActions();
    const byStatus = { complete: [], in_progress: [], at_risk: [], not_started: [] };
    actions.forEach((a) => byStatus[a.status].push(a));

    const perPhase = d.phases.map((p) => {
      const acts = Q().actionsIn(p.id);
      return {
        phase: p,
        total: acts.length,
        complete: acts.filter((a) => a.status === 'complete').length,
        moving: acts.filter((a) => a.status === 'in_progress').length,
        atRisk: acts.filter((a) => a.status === 'at_risk').length,
      };
    });

    const quickWins = d.nodes.filter((n) => n.type === 'quickwin').map((q) => {
      const by = Q().deliveredBy(q.id)[0] || null;
      return { win: q, action: by, status: by ? by.status : 'not_started' };
    });

    const blocked = actions
      .filter((a) => Q().blockers(a.id).length)
      .sort((a, b) => a.day - b.day);

    return { actions, byStatus, perPhase, quickWins, blocked };
  }

  function donut(el, byStatus, total) {
    const segs = [
      { key: 'Complete', n: byStatus.complete.length, colour: STATUS_COLOUR.complete },
      { key: 'In progress', n: byStatus.in_progress.length, colour: STATUS_COLOUR.in_progress },
      { key: 'At risk', n: byStatus.at_risk.length, colour: STATUS_COLOUR.at_risk },
      { key: 'Not started', n: byStatus.not_started.length, colour: STATUS_COLOUR.not_started },
    ];
    const size = 180, r = 70, thickness = 22, cx = size / 2, cy = size / 2;
    let angle = -Math.PI / 2;
    let paths = '';
    segs.forEach((s) => {
      const span = (s.n / total) * Math.PI * 2;
      const a0 = angle, a1 = angle + span;
      angle = a1;
      const large = span > Math.PI ? 1 : 0;
      const p = (a, rad) => (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2);
      paths += '<path d="M ' + p(a0, r) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p(a1, r) +
               ' L ' + p(a1, r - thickness) + ' A ' + (r - thickness) + ' ' + (r - thickness) +
               ' 0 ' + large + ' 0 ' + p(a0, r - thickness) + ' Z" fill="' + s.colour + '"/>';
    });
    const pct = Math.round((byStatus.complete.length / total) * 100);
    el.innerHTML =
      '<svg viewBox="0 0 ' + size + ' ' + size + '" class="donut-svg">' + paths +
      '<text x="' + cx + '" y="' + (cy - 4) + '" class="donut-big">' + pct + '%</text>' +
      '<text x="' + cx + '" y="' + (cy + 18) + '" class="donut-small">complete</text></svg>' +
      '<ul class="legend">' + segs.map((s) =>
        '<li><span class="swatch" style="background:' + s.colour + '"></span>' +
        s.key + ' <strong>' + s.n + '</strong></li>').join('') + '</ul>';
  }

  function render(root) {
    const s = stats();
    const total = s.actions.length;
    const landed = s.quickWins.filter((q) => q.status === 'complete').length;

    root.querySelector('#plan-kpis').innerHTML = [
      ['Actions in the plan', total, ''],
      ['Complete', Math.round((s.byStatus.complete.length / total) * 100) + '%', ''],
      ['At risk', s.byStatus.at_risk.length, s.byStatus.at_risk.length ? 'action required' : ''],
      ['Quick wins landed', landed + ' / ' + s.quickWins.length, ''],
    ].map(([label, value, note]) =>
      '<div class="kpi"><div class="kpi-value">' + value + '</div>' +
      '<div class="kpi-label">' + label + '</div>' +
      (note ? '<div class="kpi-note">' + note + '</div>' : '') + '</div>'
    ).join('');

    donut(root.querySelector('#plan-donut'), s.byStatus, total);

    root.querySelector('#phase-bars').innerHTML = s.perPhase.map((row) => {
      const done = row.total ? Math.round((row.complete / row.total) * 100) : 0;
      const moving = row.total ? Math.round((row.moving / row.total) * 100) : 0;
      return '<div class="bar-row">' +
        '<span class="bar-label"><i class="phase-dot phase-' + row.phase.theme + '"></i>' +
        row.phase.short + '</span>' +
        '<span class="bar-track">' +
          '<span class="bar-fill" style="width:' + done + '%"></span>' +
          '<span class="bar-fill bar-moving" style="width:' + moving + '%"></span>' +
        '</span>' +
        '<span class="bar-pct">' + row.complete + '/' + row.total + '</span></div>';
    }).join('') +
    '<p class="panel-note" style="margin-top:14px">Solid bar is complete; lighter segment is in progress. ' +
      s.perPhase.reduce((n, p) => n + p.atRisk, 0) + ' action(s) flagged at risk across the 90 days.</p>';

    root.querySelector('#quickwin-list').innerHTML = s.quickWins.map((q) =>
      '<li class="qw-row qw-' + q.status + '">' +
        '<span class="qw-mark">★</span>' +
        '<span class="qw-body">' +
          '<span class="qw-title">' + q.win.label + '</span>' +
          '<span class="qw-meta">Target day ' + q.win.day +
            (q.action ? ' · delivered by ' + q.action.id + ' ' + q.action.label : '') + '</span>' +
        '</span>' +
        '<span class="badge badge-' + q.status.replace('_', '') + '">' +
          Lattice.planData.STATUS_LABEL[q.status] + '</span>' +
      '</li>').join('');

    root.querySelector('#blocked-body').innerHTML = s.blocked.map((a) => {
      const blks = Q().blockers(a.id);
      const owns = Q().owners(a.id).map((o) => o.label).join(', ');
      return '<tr><td class="mono">' + a.id + '</td>' +
        '<td>' + a.label + '</td>' +
        '<td>Day ' + a.day + '</td>' +
        '<td>' + owns + '</td>' +
        '<td>' + blks.map((b) =>
          '<span class="risk-chip risk-' + b.severity + '">' + b.label + '</span>').join(' ') + '</td>' +
        '<td><span class="badge badge-' + a.status.replace('_', '') + '">' +
          Lattice.planData.STATUS_LABEL[a.status] + '</span></td></tr>';
    }).join('');
  }

  return { render };
})();
