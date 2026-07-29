/*
 * The living graph — D3 force simulation with continuous ambient motion.
 *
 * Deliberately domain-agnostic: everything dataset-specific (colour, size,
 * shape, labelling, motion, force tuning) arrives as a `schema` at init.
 * The acquisition model and the 90-day plan model are two schemas over this
 * one engine — same code, different data model. That is the reuse argument,
 * made in the source rather than on a slide.
 *
 * Public API:
 *   Lattice.graph.init(svgSelector, data, { schema, onNodeClick, onNodeDblClick })
 *   Lattice.graph.focus(nodeIds, alertIds)   — dim everything else, zoom to set
 *   Lattice.graph.clearFocus()
 *   Lattice.graph.refresh()                  — re-read node state (status, colour)
 *   Lattice.graph.wake()                     — burst of energy (used on reveal)
 */
window.Lattice = window.Lattice || {};

Lattice.graph = (function () {
  const SYMBOLS = {
    circle: d3.symbolCircle,
    square: d3.symbolSquare,
    diamond: d3.symbolDiamond,
    triangle: d3.symbolTriangle,
    star: d3.symbolStar,
    wye: d3.symbolWye,
  };

  // Defaults reproduce the original acquisition tuning exactly, so a schema
  // only has to declare what it actually differs on.
  const DEFAULTS = {
    colour: () => '#0090dc',
    radius: () => 6,
    symbol: () => 'circle',
    showLabel: () => false,
    labelOnFocus: false,      // render a label for every node, reveal on focus
    statusClass: null,        // d => status string, applied as .st-<status>
    statusClasses: [],        // the full set, so refresh() can clear stale ones
    motion: () => ({ amp: 0.07, period: 900 }),
    linkDistance: () => 48,
    linkStrength: 0.35,
    charge: -95,
    collidePad: 4,
    gravity: { x: 0.035, y: 0.045 },
    focusBoost: 2.5,
  };

  let svg, zoomLayer, linkSel, nodeSel, labelSel, sim, zoomBehaviour;
  let data, schema, width, height;
  let focusSet = null;

  function pathFor(d) {
    const r = schema.radius(d);
    const type = SYMBOLS[schema.symbol(d)] || d3.symbolCircle;
    // d3 symbol size is an area; πr² makes a circle exactly radius r, and
    // keeps every other shape visually weighted the same as that circle.
    return d3.symbol().type(type).size(Math.PI * r * r)();
  }

  function nodeClass(d) {
    let cls = 'node node-' + d.type;
    if (schema.statusClass) cls += ' st-' + schema.statusClass(d);
    return cls;
  }

  function init(selector, latticeData, opts = {}) {
    data = latticeData;
    schema = Object.assign({}, DEFAULTS, opts.schema || {});
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
      .selectAll('path')
      .data(data.nodes)
      .join('path')
      .attr('class', nodeClass)
      .attr('d', pathFor)
      .attr('fill', (d) => schema.colour(d))
      .call(drag())
      .on('click', (event, d) => {
        event.stopPropagation();
        if (opts.onNodeClick) opts.onNodeClick(d);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        if (opts.onNodeDblClick) opts.onNodeDblClick(d);
      });

    nodeSel.append('title').text((d) => d.id + ' — ' + d.label);

    // Labels: always-on for the orienting node types; optionally rendered for
    // everything else and revealed only when a query focuses them.
    const labelled = schema.labelOnFocus
      ? data.nodes
      : data.nodes.filter((d) => schema.showLabel(d));
    labelSel = zoomLayer.append('g').attr('class', 'labels')
      .selectAll('text')
      .data(labelled)
      .join('text')
      .attr('class', (d) => 'node-label' + (schema.showLabel(d) ? ' label-always' : ''))
      .text((d) => d.label);

    // Per-node pulse offset, so the constellation shimmers out of sync.
    // Namespaced: the engine must not collide with a dataset's own fields
    // (the plan model, for instance, gives every action a `phase`).
    data.nodes.forEach((d) => { d.__pulse = Math.random() * Math.PI * 2; });

    sim = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id((d) => d.id)
        .distance((l) => schema.linkDistance(l))
        .strength(schema.linkStrength))
      .force('charge', d3.forceManyBody().strength(schema.charge))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d) => schema.radius(d) + schema.collidePad))
      .force('x', d3.forceX(width / 2).strength(schema.gravity.x))
      .force('y', d3.forceY(height / 2).strength(schema.gravity.y))
      .alphaMin(0.0005)
      .alphaTarget(0.012) // never quite settles — the "breathing" baseline
      .on('tick', tick);

    requestAnimationFrame(paint);
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
    labelSel.attr('x', (d) => d.x).attr('y', (d) => d.y - schema.radius(d) - 6);
  }

  function paint(t) {
    // Position and pulse in one transform. Motion is read from the schema on
    // every frame, so a node whose status changes mid-demo starts breathing
    // differently the instant it is changed — no re-render needed.
    nodeSel.attr('transform', (d) => {
      const m = schema.motion(d) || { amp: 0, period: 900 };
      const amp = m.amp * (focusSet && focusSet.has(d.id) ? schema.focusBoost : 1);
      const s = amp ? 1 + amp * Math.sin(t / m.period + d.__pulse) : 1;
      return 'translate(' + d.x + ',' + d.y + ') scale(' + s.toFixed(3) + ')';
    });
    requestAnimationFrame(paint);
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

  // Re-read mutable node state (status, and anything colour depends on).
  // Focus/dim classes are set with classed() so they survive this.
  function refresh() {
    if (!nodeSel) return;
    nodeSel.attr('fill', (d) => schema.colour(d));
    if (schema.statusClass) {
      schema.statusClasses.forEach((s) => {
        nodeSel.classed('st-' + s, (d) => schema.statusClass(d) === s);
      });
    }
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
    labelSel
      .classed('dimmed', (d) => !focusSet.has(d.id))
      .classed('focused', (d) => focusSet.has(d.id));

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
    labelSel.classed('dimmed', false).classed('focused', false);
    svg.transition().duration(850).ease(d3.easeCubicInOut)
      .call(zoomBehaviour.transform, d3.zoomIdentity);
  }

  function wake() {
    if (sim) sim.alpha(0.9).restart();
  }

  return { init, focus, clearFocus, refresh, wake };
})();
