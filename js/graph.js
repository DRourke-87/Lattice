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

  let graph, data, container, labelLayer, labelEls;
  let focusSet = null;
  let alertSet = new Set();
  let flattenStrength = 0; // 0 = free 3D; >0 pulls every node toward z=0

  function nodeColour(d) {
    if (d.type === 'risk' && d.severity === 'red') return '#ff6b5e';
    return PALETTE[d.type];
  }

  function linkFocused(l) {
    return focusSet && focusSet.has(l.source.id) && focusSet.has(l.target.id);
  }

  function linkColour(l) {
    const kind = { dependency: 'rgba(96,172,255,0.9)', risk: 'rgba(255,188,100,0.9)', verifies: 'rgba(110,222,155,0.7)' }[l.kind];
    return kind || 'rgba(140,165,210,0.75)';
  }

  // Re-issuing the accessors makes the library restyle existing objects.
  // nodeVisibility/linkVisibility hide unfocused items outright — Three.js
  // does not honour the alpha channel in rgba() colour strings, so transparent
  // dimming via colour alone would leave opaque ghost spheres on screen.
  function refreshStyles() {
    graph
      .nodeColor((d) => nodeColour(d))
      .nodeVisibility((d) => !focusSet || focusSet.has(d.id))
      .linkColor((l) => linkColour(l))
      .linkVisibility((l) => !focusSet || linkFocused(l))
      .linkWidth((l) => (linkFocused(l) ? 3 : 1.2))
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
      .linkOpacity(0.85)
      .linkDirectionalParticleSpeed(0.0035)
      .linkDirectionalParticleWidth(1.6)
      .d3AlphaMin(0)
      .d3AlphaDecay(0) // keep simulation ticking so the flatten force can act
      .cooldownTime(Infinity)
      .d3VelocityDecay(0.4)
      .onNodeClick((d) => { if (opts.onNodeClick) opts.onNodeClick(d); })
      .graphData({ nodes: data.nodes, links: data.links });

    // HTML overlay for the ten component labels — crisper than 3D text,
    // repositioned every frame via graph2ScreenCoords. Must be appended
    // after the graph instantiates: the library clears the container.
    labelLayer = document.createElement('div');
    labelLayer.className = 'label-layer';
    container.appendChild(labelLayer);

    refreshStyles();

    // z-collapse force: drags every node toward z=0 when flattenStrength > 0
    // (during clarity/2D mode). Has no effect in 3D (flattenStrength === 0).
    let simNodes = [];
    const flattenForce = () => {
      if (flattenStrength) simNodes.forEach((n) => { n.vz -= n.z * flattenStrength; });
    };
    flattenForce.initialize = (ns) => { simNodes = ns; };
    graph.d3Force('flatten', flattenForce);

    const controls = graph.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;

    labelEls = data.nodes.map((d) => {
      const el = document.createElement('span');
      el.className = 'node-label3d';
      el.textContent = d.label || d.id;
      labelLayer.appendChild(el);
      return { node: d, el };
    });

    requestAnimationFrame(framePulse);

    // Frame the whole constellation once the layout has spread out.
    setTimeout(() => graph.zoomToFit(900, 70), 1800);
  }

  function framePulse(_t) {
    if (graph) {
      labelEls.forEach(({ node, el }) => {
        // 3D mode: only component labels; 2D/focus mode: all focused nodes.
        const visible = focusSet
          ? focusSet.has(node.id)
          : node.type === 'component';
        if (!visible || typeof node.x !== 'number') {
          el.style.display = 'none';
          return;
        }
        el.style.display = '';
        const p = graph.graph2ScreenCoords(node.x, node.y, node.z);
        el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + (p.y - 18).toFixed(1) + 'px)';
      });
    }
    requestAnimationFrame(framePulse);
  }

  function focus(nodeIds, alertIds = []) {
    focusSet = new Set(nodeIds);
    alertSet = new Set(alertIds);
    refreshStyles();

    flattenStrength = 0.06;

    const controls = graph.controls();
    controls.autoRotate = false;
    controls.enableRotate = false; // pan/zoom only while in clarity mode

    // After the z-collapse settles, pin every node in place (fx/fy/fz) so the
    // layout is fully static, then fly the camera face-on to the cluster.
    setTimeout(() => {
      flattenStrength = 0;
      data.nodes.forEach((n) => { n.fx = n.x; n.fy = n.y; n.fz = 0; });

      const pts = data.nodes.filter((d) => focusSet.has(d.id) && typeof d.x === 'number');
      if (!pts.length) return;
      const xs = pts.map((d) => d.x), ys = pts.map((d) => d.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 120);
      const dist = (extent / 2) / Math.tan((graph.camera().fov / 2) * Math.PI / 180) * 1.45;
      graph.cameraPosition({ x: cx, y: cy, z: dist }, { x: cx, y: cy, z: 0 }, 1400);
    }, 900);
  }

  function clearFocus() {
    focusSet = null;
    alertSet = new Set();
    flattenStrength = 0;
    // Unpin nodes so the 3D layout can re-spread.
    data.nodes.forEach((n) => { n.fx = undefined; n.fy = undefined; n.fz = undefined; });
    refreshStyles();
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
