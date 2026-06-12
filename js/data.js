/*
 * Fictional dataset for Project LATTICE — a made-up maritime sensor
 * integration programme. Every requirement, component and risk here is
 * invented; deliberately nothing resembles real MOD programme data.
 *
 * Node types: requirement | component | interface | risk | verification
 */
window.Lattice = window.Lattice || {};

Lattice.data = (function () {
  // Deterministic RNG (mulberry32) so the graph is identical every run —
  // a demo must not surprise you on the day.
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(20260612);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const nodes = [];
  const links = [];
  const byId = {};

  function addNode(n) { nodes.push(n); byId[n.id] = n; return n; }
  function addLink(source, target, kind) { links.push({ source, target, kind }); }

  /* ---------------- Components & interfaces ---------------- */

  const components = [
    { id: 'CMP-RDR',  label: 'Radar Subsystem' },
    { id: 'CMP-TGT',  label: 'Targeting Subsystem' },
    { id: 'CMP-EOIR', label: 'EO/IR Sensor' },
    { id: 'CMP-MC',   label: 'Mission Computer' },
    { id: 'CMP-DL',   label: 'Tactical Data Link' },
    { id: 'CMP-PWR',  label: 'Power Distribution' },
    { id: 'CMP-COOL', label: 'Cooling & Thermal' },
    { id: 'CMP-CON',  label: 'Operator Console' },
    { id: 'CMP-NAV',  label: 'Navigation & Timing' },
    { id: 'CMP-REC',  label: 'Mission Recording' },
  ];
  components.forEach((c) => addNode({ ...c, type: 'component' }));

  const interfaces = [
    { id: 'IF-001', label: 'Radar ↔ Mission Computer', a: 'CMP-RDR',  b: 'CMP-MC' },
    { id: 'IF-002', label: 'Targeting ↔ Mission Computer', a: 'CMP-TGT', b: 'CMP-MC' },
    { id: 'IF-003', label: 'EO/IR ↔ Mission Computer', a: 'CMP-EOIR', b: 'CMP-MC' },
    { id: 'IF-004', label: 'Mission Computer ↔ Data Link', a: 'CMP-MC', b: 'CMP-DL' },
    { id: 'IF-005', label: 'Console ↔ Mission Computer', a: 'CMP-CON', b: 'CMP-MC' },
    { id: 'IF-006', label: 'Power ↔ Radar', a: 'CMP-PWR', b: 'CMP-RDR' },
    { id: 'IF-007', label: 'Cooling ↔ Radar', a: 'CMP-COOL', b: 'CMP-RDR' },
    { id: 'IF-008', label: 'Nav/Timing ↔ Targeting', a: 'CMP-NAV', b: 'CMP-TGT' },
  ];
  interfaces.forEach((i) => {
    addNode({ id: i.id, label: i.label, type: 'interface' });
    addLink(i.id, i.a, 'interface');
    addLink(i.id, i.b, 'interface');
  });

  /* ---------------- Risks ---------------- */

  const risks = [
    { id: 'RSK-01', label: 'Radar antenna obsolescence', severity: 'amber' },
    { id: 'RSK-02', label: 'Data link bandwidth shortfall', severity: 'amber' },
    { id: 'RSK-03', label: 'Mission computer processing headroom', severity: 'red' },
    { id: 'RSK-04', label: 'EO/IR supplier lead time', severity: 'amber' },
    { id: 'RSK-05', label: 'EMC clearance for mast installation', severity: 'amber' },
    { id: 'RSK-06', label: 'Operator workload under multi-track load', severity: 'amber' },
    { id: 'RSK-07', label: 'Thermal margin in enclosed mast', severity: 'red' },
    { id: 'RSK-08', label: 'GPS-denied timing degradation', severity: 'amber' },
    { id: 'RSK-09', label: 'Software safety case maturity', severity: 'red' },
    { id: 'RSK-10', label: 'Trials window availability', severity: 'amber' },
  ];
  risks.forEach((r) => addNode({ ...r, type: 'risk' }));
  [['RSK-01', 'CMP-RDR'], ['RSK-02', 'CMP-DL'], ['RSK-03', 'CMP-MC'],
   ['RSK-04', 'CMP-EOIR'], ['RSK-05', 'CMP-RDR'], ['RSK-06', 'CMP-CON'],
   ['RSK-07', 'CMP-COOL'], ['RSK-08', 'CMP-NAV'], ['RSK-09', 'CMP-MC'],
   ['RSK-10', 'CMP-RDR']].forEach(([r, c]) => addLink(r, c, 'risk'));

  /* ---------------- Requirements ---------------- */

  let reqSeq = 0;
  let verSeq = 0;
  const verMethods = ['Test', 'Analysis', 'Demonstration', 'Inspection'];

  // verification: 'verified' | 'planned' | 'none'
  function addRequirement(opts) {
    let id = opts.id;
    if (!id) {
      // Skip ids already taken by the curated, hand-pinned requirements.
      do {
        reqSeq += 1;
        id = 'REQ-' + String(reqSeq).padStart(3, '0');
      } while (byId[id]);
    }
    const req = addNode({
      id,
      type: 'requirement',
      label: opts.label,
      text: opts.text,
      section: opts.section,
      verification: opts.verification,
    });
    (opts.components || []).forEach((c) => addLink(id, c, 'allocation'));
    (opts.dependsOn || []).forEach((d) => addLink(id, d, 'dependency'));
    (opts.risks || []).forEach((r) => addLink(r, id, 'risk'));
    if (opts.verification !== 'none') {
      verSeq += 1;
      const vid = 'VER-' + String(verSeq).padStart(3, '0');
      const method = opts.method || pick(verMethods);
      addNode({
        id: vid, type: 'verification',
        label: method + ' — ' + id,
        method,
        status: opts.verification, // 'verified' | 'planned'
      });
      addLink(vid, id, 'verifies');
    }
    return req;
  }

  // --- Curated requirements that the canned demo queries hinge on ---

  addRequirement({
    id: 'REQ-021',
    label: 'Multi-sensor track fusion',
    text: 'The Mission Computer shall fuse radar and EO/IR detections into a single track picture, maintaining track continuity across sensor handover.',
    section: 'Combat System Integration',
    components: ['CMP-MC', 'CMP-RDR', 'CMP-EOIR'],
    verification: 'planned',
    method: 'Test',
  });

  addRequirement({
    id: 'REQ-033',
    label: 'Radar track update rate',
    text: 'The Radar Subsystem shall provide confirmed track updates to the Mission Computer at a rate of not less than 2 Hz per track.',
    section: 'Sensor Performance',
    components: ['CMP-RDR', 'CMP-MC'],
    verification: 'verified',
    method: 'Test',
  });

  addRequirement({
    id: 'REQ-014',
    label: 'Targeting solution latency',
    text: 'The Targeting Subsystem shall compute a firing solution within 250 ms of track confirmation, under full sensor load with not fewer than 64 simultaneous tracks.',
    section: 'Targeting Performance',
    components: ['CMP-TGT', 'CMP-MC'],
    dependsOn: ['REQ-021', 'REQ-033'],
    risks: ['RSK-03', 'RSK-07'],
    verification: 'planned',
    method: 'Test',
  });

  addRequirement({
    id: 'REQ-047',
    label: 'Solution latency growth margin',
    text: 'The targeting processing chain shall retain not less than 30% processing margin against the latency requirement at system acceptance.',
    section: 'Targeting Performance',
    components: ['CMP-TGT', 'CMP-MC'],
    dependsOn: ['REQ-014'],
    risks: ['RSK-03'],
    verification: 'none',
  });

  addRequirement({
    id: 'REQ-052',
    label: 'Time synchronisation',
    text: 'All sensor timestamps shall be synchronised to the platform master clock within 1 ms, including under GPS-denied conditions.',
    section: 'Navigation & Timing',
    components: ['CMP-NAV', 'CMP-TGT', 'CMP-RDR'],
    dependsOn: ['REQ-014'],
    risks: ['RSK-08'],
    verification: 'planned',
    method: 'Analysis',
  });

  // Radar requirements deliberately left without a verification method,
  // so the "unverified radar requirements" query returns a meaningful set.
  const radarGaps = [
    ['Radar sidelobe performance',
     'Radar antenna sidelobes shall not exceed −35 dB relative to main beam gain across the operating band.'],
    ['Radar sector blanking',
     'The Radar Subsystem shall support operator-defined transmission blanking sectors with activation latency below 100 ms.'],
    ['Radar littoral clutter rejection',
     'The Radar Subsystem shall maintain track on a 1 m² target in sea state 5 littoral clutter conditions.'],
    ['Radar built-in test coverage',
     'Radar built-in test shall detect and isolate not less than 95% of line-replaceable-unit failures.'],
    ['Radar mast EMC compliance',
     'Radar emissions shall comply with platform EMC requirements when installed in the enclosed mast.'],
  ];
  radarGaps.forEach(([label, text], i) => addRequirement({
    label, text,
    section: 'Sensor Performance',
    components: i === 4 ? ['CMP-RDR', 'CMP-COOL'] : ['CMP-RDR'],
    risks: i === 4 ? ['RSK-05'] : [],
    verification: 'none',
  }));

  // --- Generated filler requirements: dense, plausible, fictional ---

  const templates = {
    'CMP-RDR': ['detection range', 'track initiation time', 'doppler resolution', 'transmit duty cycle', 'antenna rotation rate', 'mode switch latency', 'frequency agility', 'track capacity', 'small-target detection', 'maintenance access'],
    'CMP-TGT': ['engagement queue depth', 'solution accuracy', 'target prioritisation', 'manual override response', 'engagement de-confliction', 'safety interlocks', 'training mode fidelity'],
    'CMP-EOIR': ['thermal sensitivity', 'optical zoom range', 'stabilisation accuracy', 'auto-tracker acquisition', 'laser rangefinder accuracy', 'image latency', 'environmental sealing'],
    'CMP-MC': ['processing reserve', 'software partitioning', 'fault recovery time', 'data recording throughput', 'cyber hardening baseline', 'health monitoring', 'audit logging', 'software update process'],
    'CMP-DL': ['message latency', 'track forwarding rate', 'link encryption', 'beyond-line-of-sight relay', 'interoperability standards', 'jam resistance', 'emission control mode'],
    'CMP-PWR': ['power quality', 'transient ride-through', 'battery autonomy', 'load shedding priority', 'harmonic distortion', 'emergency isolation'],
    'CMP-COOL': ['coolant flow rate', 'ambient operating envelope', 'thermal alarm thresholds', 'pump redundancy', 'leak detection', 'acoustic signature'],
    'CMP-CON': ['display refresh rate', 'alert presentation', 'operator login time', 'colour and symbology standards', 'reversionary display mode', 'gloved operation', 'night vision compatibility', 'audio alerting'],
    'CMP-NAV': ['position accuracy', 'inertial drift', 'timing holdover', 'alignment time', 'attitude accuracy', 'geodetic datum compliance'],
    'CMP-REC': ['mission data retention', 'replay fidelity', 'export formats', 'tamper evidence', 'encryption at rest', 'data offload time'],
  };
  const sections = {
    'CMP-RDR': 'Sensor Performance', 'CMP-EOIR': 'Sensor Performance',
    'CMP-TGT': 'Targeting Performance', 'CMP-MC': 'Combat System Integration',
    'CMP-DL': 'Communications', 'CMP-PWR': 'Platform Integration',
    'CMP-COOL': 'Platform Integration', 'CMP-CON': 'Human-Machine Interface',
    'CMP-NAV': 'Navigation & Timing', 'CMP-REC': 'Combat System Integration',
  };

  const fillerReqs = [];
  Object.entries(templates).forEach(([cmp, topics]) => {
    topics.forEach((topic) => {
      const r = rand();
      const verification = r < 0.55 ? 'verified' : (r < 0.82 ? 'planned' : 'none');
      const extra = rand() < 0.25 ? [pick(components).id] : [];
      const req = addRequirement({
        label: byId[cmp].label + ' — ' + topic,
        text: 'The ' + byId[cmp].label + ' shall meet the specified ' + topic +
              ' performance defined in Annex B of the System Requirements Document.',
        section: sections[cmp],
        components: [cmp].concat(extra.filter((e) => e !== cmp)),
        verification,
      });
      fillerReqs.push(req);
    });
  });

  // Sparse requirement-to-requirement dependencies among filler, so query
  // ripples look organic rather than star-shaped.
  fillerReqs.forEach((req) => {
    if (rand() < 0.3) {
      const other = pick(fillerReqs);
      if (other.id !== req.id) addLink(req.id, other.id, 'dependency');
    }
  });
  // A few filler requirements carry risk linkage.
  ['RSK-02', 'RSK-04', 'RSK-06', 'RSK-09', 'RSK-10'].forEach((rsk) => {
    addLink(rsk, pick(fillerReqs).id, 'risk');
  });

  return {
    programme: 'PROJECT LATTICE',
    subtitle: 'Maritime Sensor Integration Programme (fictional demonstration data)',
    nodes,
    links,
    byId,
    neighbours(id) {
      const out = new Set();
      links.forEach((l) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (s === id) out.add(t);
        if (t === id) out.add(s);
      });
      return out;
    },
  };
})();
