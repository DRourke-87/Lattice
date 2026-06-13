/*
 * Assurance dashboard — the calm "sign-off layer" after the energy of the
 * graph. Everything here is computed live from the same model the graph
 * renders: one source of truth, two views of it.
 */
window.Lattice = window.Lattice || {};

Lattice.dashboard = (function () {
  function stats() {
    const d = Lattice.data;
    const reqs = d.nodes.filter((n) => n.type === 'requirement');
    const byStatus = { verified: [], planned: [], none: [] };
    reqs.forEach((r) => byStatus[Lattice.queries.verificationStatus(r.id)].push(r));

    const perComponent = d.nodes.filter((n) => n.type === 'component').map((c) => {
      const allocated = reqs.filter((r) =>
        Lattice.queries.linkedComponents(r.id).some((x) => x.id === c.id));
      const covered = allocated.filter((r) =>
        Lattice.queries.verificationStatus(r.id) !== 'none');
      return { component: c, total: allocated.length, covered: covered.length };
    }).sort((a, b) => b.total - a.total);

    const openRisks = d.nodes.filter((n) => n.type === 'risk');
    const redRisks = openRisks.filter((r) => r.severity === 'red');

    return { reqs, byStatus, perComponent, openRisks, redRisks };
  }

  function donut(el, byStatus, total) {
    const segs = [
      { key: 'Verified', n: byStatus.verified.length, colour: '#2e9e4f' },
      { key: 'Planned', n: byStatus.planned.length, colour: '#0090dc' },
      { key: 'No method', n: byStatus.none.length, colour: '#c0392b' },
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
    const pct = Math.round(((byStatus.verified.length + byStatus.planned.length) / total) * 100);
    el.innerHTML =
      '<svg viewBox="0 0 ' + size + ' ' + size + '" class="donut-svg">' + paths +
      '<text x="' + cx + '" y="' + (cy - 4) + '" class="donut-big">' + pct + '%</text>' +
      '<text x="' + cx + '" y="' + (cy + 18) + '" class="donut-small">coverage</text></svg>' +
      '<ul class="legend">' + segs.map((s) =>
        '<li><span class="swatch" style="background:' + s.colour + '"></span>' +
        s.key + ' <strong>' + s.n + '</strong></li>').join('') + '</ul>';
  }

  function render(root) {
    const s = stats();
    const total = s.reqs.length;

    root.querySelector('#kpi-tiles').innerHTML = [
      ['Requirements in model', total, ''],
      ['Verification coverage', Math.round(((total - s.byStatus.none.length) / total) * 100) + '%', ''],
      ['Open risks', s.openRisks.length, s.redRisks.length + ' red'],
      ['Requirements without verification', s.byStatus.none.length, 'action required'],
    ].map(([label, value, note]) =>
      '<div class="kpi"><div class="kpi-value">' + value + '</div>' +
      '<div class="kpi-label">' + label + '</div>' +
      (note ? '<div class="kpi-note">' + note + '</div>' : '') + '</div>'
    ).join('');

    donut(root.querySelector('#donut'), s.byStatus, total);

    root.querySelector('#coverage-bars').innerHTML = s.perComponent.map((row) => {
      const pct = row.total ? Math.round((row.covered / row.total) * 100) : 100;
      return '<div class="bar-row">' +
        '<span class="bar-label">' + row.component.label + '</span>' +
        '<span class="bar-track"><span class="bar-fill' + (pct < 70 ? ' bar-low' : '') +
        '" style="width:' + pct + '%"></span></span>' +
        '<span class="bar-pct">' + row.covered + '/' + row.total + '</span></div>';
    }).join('');

    root.querySelector('#gaps-body').innerHTML = s.byStatus.none.map((r) => {
      const comps = Lattice.queries.linkedComponents(r.id).map((c) => c.label).join(', ');
      const risks = Lattice.queries.linkedRisks(r.id);
      return '<tr><td class="mono">' + r.id + '</td><td>' + r.label + '</td>' +
        '<td>' + comps + '</td>' +
        '<td>' + (risks.length
          ? risks.map((k) => '<span class="risk-chip risk-' + k.severity + '">' + k.id + '</span>').join(' ')
          : '<span class="muted">—</span>') + '</td></tr>';
    }).join('');
  }

  return { render };
})();
