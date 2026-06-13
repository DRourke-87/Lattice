/*
 * The living graph — D3 force simulation with continuous ambient motion.
 *
 * Public API:
 *   Lattice.graph.init(svgSelector, data, { onNodeClick })
 *   Lattice.graph.focus(nodeIds, alertIds)   — dim everything else, zoom to set
 *   Lattice.graph.clearFocus()
 *   Lattice.graph.wake()                     — burst of energy (used on reveal)
 */
window.Lattice = window.Lattice || {};

Lattice.graph = (function () {
  const PALETTE = {
    requirement: '#0090dc',
    component: '#1e4479',
    interface: '#1b9aaa',
    risk: '#d55c17',
    verification: '#2e9e4f',
  };
  const RADII = {
    requirement: 6, component: 13, interface: 5, risk: 8, verification: 4.5,
  };

  let svg, zoomLayer, linkSel, nodeSel, labelSel, sim, zoomBehaviour;
  let data, width, height;
  let focusSet = null;

  function nodeColour(d) {
    if (d.type === 'risk' && d.severity === 'red') return '#c0392b';
    return PALETTE[d.type];
  }

  function init(selector, latticeData, opts = {}) {
    data = latticeData;
    svg = d3.select(selector);
    const rect = svg.node().getBoundingClientRect();
    width = rect.width || 1200;
    height = rect.height || 760;
    svg.attr('viewBox', [0, 0, width, height]);

    zoomLayer = svg.append('g').attr('class', 'zoom-layer');

    zoomBehaviour = d3.zoom()
      .scaleExtent([0.35, 4])
      .on('zoom', (event) => zoomLayer.attr('transform', event.transform));
    svg.call(zoomBehaviour).on('dblclick.zoom', null);

    linkSel = zoomLayer.append('g').attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('class', (d) => 'link link-' + d.kind);

    nodeSel = zoomLayer.append('g').attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('class', (d) => 'node node-' + d.type)
      .attr('r', (d) => RADII[d.type])
      .attr('fill', nodeColour)
      .call(drag())
      .on('click', (event, d) => {
        event.stopPropagation();
        if (opts.onNodeClick) opts.onNodeClick(d);
      });

    nodeSel.append('title').text((d) => d.id + ' — ' + d.label);

    // Labels only for components: enough to orient, not enough to clutter.
    labelSel = zoomLayer.append('g').attr('class', 'labels')
      .selectAll('text')
      .data(data.nodes.filter((d) => d.type === 'component'))
      .join('text')
      .attr('class', 'node-label')
      .text((d) => d.label);

    // Per-node pulse phase, so the constellation shimmers out of sync.
    data.nodes.forEach((d) => { d.phase = Math.random() * Math.PI * 2; });

    sim = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id((d) => d.id)
        .distance((l) => (l.kind === 'verifies' ? 28 : l.kind === 'interface' ? 60 : 48))
        .strength(0.35))
      .force('charge', d3.forceManyBody().strength(-95))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d) => RADII[d.type] + 4))
      .force('x', d3.forceX(width / 2).strength(0.035))
      .force('y', d3.forceY(height / 2).strength(0.045))
      .alphaMin(0.0005)
      .alphaTarget(0.012) // never quite settles — the "breathing" baseline
      .on('tick', tick);

    requestAnimationFrame(pulse);
  }

  function tick() {
    // Tiny random nudges keep the lattice drifting like a slow current.
    data.nodes.forEach((d) => {
      d.vx += (Math.random() - 0.5) * 0.06;
      d.vy += (Math.random() - 0.5) * 0.06;
    });
    linkSel
      .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    nodeSel.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    labelSel.attr('x', (d) => d.x).attr('y', (d) => d.y - RADII.component - 6);
  }

  function pulse(t) {
    // Gentle sine pulse on radius; focused nodes pulse harder.
    nodeSel.attr('r', (d) => {
      const base = RADII[d.type];
      const amp = focusSet && focusSet.has(d.id) ? 0.18 : 0.07;
      return base * (1 + amp * Math.sin(t / 900 + d.phase));
    });
    requestAnimationFrame(pulse);
  }

  function drag() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.25).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0.012);
        d.fx = null; d.fy = null;
      });
  }

  function focus(nodeIds, alertIds = []) {
    focusSet = new Set(nodeIds);
    const alerts = new Set(alertIds);

    nodeSel
      .classed('dimmed', (d) => !focusSet.has(d.id))
      .classed('focused', (d) => focusSet.has(d.id))
      .classed('alert', (d) => alerts.has(d.id));
    linkSel
      .classed('dimmed', (d) => !(focusSet.has(d.source.id) && focusSet.has(d.target.id)))
      .classed('focused', (d) => focusSet.has(d.source.id) && focusSet.has(d.target.id));
    labelSel.classed('dimmed', (d) => !focusSet.has(d.id));

    zoomToSet(focusSet);
  }

  function zoomToSet(set) {
    const pts = data.nodes.filter((d) => set.has(d.id));
    if (!pts.length) return;
    const x0 = d3.min(pts, (d) => d.x), x1 = d3.max(pts, (d) => d.x);
    const y0 = d3.min(pts, (d) => d.y), y1 = d3.max(pts, (d) => d.y);
    const dx = Math.max(x1 - x0, 60), dy = Math.max(y1 - y0, 60);
    const scale = Math.min(2.2, 0.75 / Math.max(dx / width, dy / height));
    const tx = width / 2 - scale * (x0 + x1) / 2;
    const ty = height / 2 - scale * (y0 + y1) / 2;
    svg.transition().duration(850).ease(d3.easeCubicInOut)
      .call(zoomBehaviour.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  function clearFocus() {
    focusSet = null;
    nodeSel.classed('dimmed', false).classed('focused', false).classed('alert', false);
    linkSel.classed('dimmed', false).classed('focused', false);
    labelSel.classed('dimmed', false);
    svg.transition().duration(850).ease(d3.easeCubicInOut)
      .call(zoomBehaviour.transform, d3.zoomIdentity);
  }

  function wake() {
    if (sim) sim.alpha(0.9).restart();
  }

  return { init, focus, clearFocus, wake };
})();
