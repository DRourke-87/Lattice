/*
 * The living graph — 3D constellation while browsing, flattening into a
 * 2D plane when a query runs (clarity mode), re-inflating on reset.
 *
 * One renderer (3d-force-graph / three.js) drives both modes: "2D" is the
 * same simulation with a z-collapsing force and a face-on camera, so the
 * transition is a continuous morph rather than a renderer swap.
 *
 * Public API (unchanged from the SVG version):
 *   Lattice.graph.init(selector, data, { onNodeClick })
 *   Lattice.graph.focus(nodeIds, alertIds)
 *   Lattice.graph.clearFocus()
 *   Lattice.graph.wake()
 */
window.Lattice = window.Lattice || {};

Lattice.graph = (function () {
  const PALETTE = {
    requirement: '#4ea3ff',
    component: '#9aa7b8',
    interface: '#56cfd6',
    risk: '#ffb454',
    verification: '#5fd68b',
  };
  const SIZES = { requirement: 4, component: 10, interface: 3, risk: 6, verification: 2.5 };
  const DIM_NODE = 'rgba(110, 130, 165, 0.08)';
  const DIM_LINK = 'rgba(58, 75, 120, 0.04)';

  let graph, data, container, labelLayer, labelEls;
  let focusSet = null;
  let alertSet = new Set();
  let flattenStrength = 0; // 0 = free 3D; >0 pulls every node toward z=0

  function nodeColour(d) {
    if (focusSet && !focusSet.has(d.id)) return DIM_NODE;
    if (d.type === 'risk' && d.severity === 'red') return '#ff6b5e';
    return PALETTE[d.type];
  }

  function linkFocused(l) {
    return focusSet && focusSet.has(l.source.id) && focusSet.has(l.target.id);
  }

  function linkColour(l) {
    if (focusSet && !linkFocused(l)) return DIM_LINK;
    const kind = { dependency: 'rgba(78,163,255,0.55)', risk: 'rgba(255,180,84,0.55)', verifies: 'rgba(95,214,139,0.35)' }[l.kind];
    return kind || 'rgba(90,110,160,0.4)';
  }

  // Re-issuing the accessors makes the library restyle existing objects.
  function refreshStyles() {
    graph
      .nodeColor((d) => nodeColour(d))
      .linkColor((l) => linkColour(l))
      .linkWidth((l) => (linkFocused(l) ? 1.4 : 0.4))
      .linkDirectionalParticles((l) => (linkFocused(l) ? 3 : focusSet ? 0 : 1));
  }

  function init(selector, latticeData, opts = {}) {
    data = latticeData;
    container = document.querySelector(selector);

    graph = ForceGraph3D({ controlType: 'orbit' })(container)
      .backgroundColor('rgba(0,0,0,0)')
      .showNavInfo(false)
      .nodeVal((d) => SIZES[d.type])
      .nodeLabel((d) => d.id + ' — ' + d.label)
      .nodeResolution(12)
      .linkOpacity(0.45)
      .linkDirectionalParticleSpeed(0.0035)
      .linkDirectionalParticleWidth(1.4)
      .d3AlphaMin(0) // engine never sleeps — our ambient force runs forever
      .cooldownTime(Infinity)
      .d3VelocityDecay(0.35)
      .onNodeClick((d) => { if (opts.onNodeClick) opts.onNodeClick(d); })
      .graphData({ nodes: data.nodes, links: data.links });

    // HTML overlay for the ten component labels — crisper than 3D text,
    // repositioned every frame via graph2ScreenCoords. Must be appended
    // after the graph instantiates: the library clears the container.
    labelLayer = document.createElement('div');
    labelLayer.className = 'label-layer';
    container.appendChild(labelLayer);

    refreshStyles();

    // Custom force, deliberately independent of simulation alpha so it
    // keeps acting after the layout cools: gentle random drift always,
    // plus a pull into the z=0 plane while a query is live.
    let simNodes = [];
    const ambient = () => {
      simNodes.forEach((n) => {
        // Jitter plus a weak pull to the origin, so the cloud breathes
        // without slowly random-walking off-centre.
        n.vx += (Math.random() - 0.5) * 0.05 - n.x * 0.0008;
        n.vy += (Math.random() - 0.5) * 0.05 - n.y * 0.0008;
        n.vz += (Math.random() - 0.5) * 0.05 - n.z * 0.0008;
        if (flattenStrength) n.vz -= n.z * flattenStrength;
      });
    };
    ambient.initialize = (ns) => { simNodes = ns; };
    graph.d3Force('ambient', ambient);

    const controls = graph.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;

    data.nodes.forEach((d) => { d.phase = Math.random() * Math.PI * 2; });

    labelEls = data.nodes.filter((d) => d.type === 'component').map((d) => {
      const el = document.createElement('span');
      el.className = 'node-label3d';
      el.textContent = d.label;
      labelLayer.appendChild(el);
      return { node: d, el };
    });

    requestAnimationFrame(framePulse);

    // Frame the whole constellation once the layout has spread out.
    setTimeout(() => graph.zoomToFit(900, 70), 1800);
  }

  function framePulse(t) {
    if (graph) {
      data.nodes.forEach((d) => {
        const obj = d.__threeObj;
        if (!obj) return;
        const inFocus = focusSet && focusSet.has(d.id);
        const amp = alertSet.has(d.id) ? 0.3 : inFocus ? 0.14 : 0.06;
        obj.scale.setScalar(1 + amp * Math.sin(t / 280 / (alertSet.has(d.id) ? 1 : 3) + d.phase));
      });
      labelEls.forEach(({ node, el }) => {
        if (typeof node.x !== 'number') return;
        const p = graph.graph2ScreenCoords(node.x, node.y, node.z);
        el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + (p.y - 18).toFixed(1) + 'px)';
        el.classList.toggle('dimmed', !!(focusSet && !focusSet.has(node.id)));
      });
    }
    requestAnimationFrame(framePulse);
  }

  function focus(nodeIds, alertIds = []) {
    focusSet = new Set(nodeIds);
    alertSet = new Set(alertIds);
    refreshStyles();

    // Collapse to the plane. The flatten force acts regardless of alpha,
    // so no reheat is needed — z just glides to zero.
    flattenStrength = 0.06;

    const controls = graph.controls();
    controls.autoRotate = false;
    controls.enableRotate = false; // pan/zoom only while in clarity mode

    // Give the flatten a moment to begin, then fly face-on to the cluster.
    setTimeout(() => {
      const pts = data.nodes.filter((d) => focusSet.has(d.id) && typeof d.x === 'number');
      if (!pts.length) return;
      const xs = pts.map((d) => d.x), ys = pts.map((d) => d.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 120);
      const dist = (extent / 2) / Math.tan((graph.camera().fov / 2) * Math.PI / 180) * 1.45;
      graph.cameraPosition({ x: cx, y: cy, z: dist }, { x: cx, y: cy, z: 0 }, 1400);
    }, 500);
  }

  function clearFocus() {
    focusSet = null;
    alertSet = new Set();
    flattenStrength = 0;
    refreshStyles();
    // Reheat so charge repulsion re-inflates the z axis.
    graph.d3ReheatSimulation();

    const controls = graph.controls();
    controls.autoRotate = true;
    controls.enableRotate = true;
    graph.zoomToFit(1300, 70);
  }

  function wake() {
    // No reheat needed: a freshly initialised layout is already at full
    // energy (and reheating mid-digest crashes the engine). Just do the
    // reveal flourish: start pulled back, then drift in.
    if (graph) {
      const cam = graph.cameraPosition();
      graph.cameraPosition({ x: cam.x * 2.2, y: cam.y * 2.2, z: cam.z * 2.2 });
      setTimeout(() => graph.zoomToFit(1600, 70), 700);
    }
  }

  return { init, focus, clearFocus, wake };
})();
