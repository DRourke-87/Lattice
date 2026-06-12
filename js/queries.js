/*
 * Canned queries. No NLP — each query is a keyword match mapped to a
 * traversal over the model, exactly as the concept brief prescribes.
 * The point is the interaction, not the parser.
 */
window.Lattice = window.Lattice || {};

Lattice.queries = (function () {
  const data = () => Lattice.data;

  function linkEnds(l) {
    return [
      typeof l.source === 'object' ? l.source.id : l.source,
      typeof l.target === 'object' ? l.target.id : l.target,
    ];
  }

  // Everything reachable from `startId` over the given link kinds,
  // up to `depth` hops.
  function traverse(startId, kinds, depth) {
    const seen = new Set([startId]);
    let frontier = [startId];
    for (let i = 0; i < depth; i++) {
      const next = [];
      data().links.forEach((l) => {
        if (!kinds.includes(l.kind)) return;
        const [s, t] = linkEnds(l);
        if (seen.has(s) && !seen.has(t)) { seen.add(t); next.push(t); }
        else if (seen.has(t) && !seen.has(s)) { seen.add(s); next.push(s); }
      });
      frontier = next;
    }
    return seen;
  }

  function requirementsOf(set) {
    return [...set].map((id) => data().byId[id])
      .filter((n) => n && n.type === 'requirement');
  }

  function verificationStatus(reqId) {
    let status = 'none';
    data().links.forEach((l) => {
      const [s, t] = linkEnds(l);
      if (l.kind === 'verifies' && t === reqId) status = data().byId[s].status;
    });
    return status;
  }

  function linkedComponents(reqId) {
    const out = [];
    data().links.forEach((l) => {
      const [s, t] = linkEnds(l);
      if (l.kind === 'allocation' && s === reqId) out.push(data().byId[t]);
    });
    return out;
  }

  function linkedRisks(reqId) {
    const out = [];
    data().links.forEach((l) => {
      const [s, t] = linkEnds(l);
      if (l.kind === 'risk' && t === reqId) out.push(data().byId[s]);
    });
    return out;
  }

  const CANNED = [
    {
      id: 'latency',
      label: "What's affected if we tighten the latency requirement on the targeting subsystem?",
      keywords: ['latency', 'tighten', '250'],
      summary: 'Impact ripple from REQ-014 (Targeting solution latency): dependent requirements, allocated components and two red risks light up.',
      run() {
        // Ripple along requirement-to-requirement dependencies only, then
        // decorate that requirement set with its components, risks and
        // verification evidence — keeps the answer tight instead of
        // exploding through shared components.
        const reqs = traverse('REQ-014', ['dependency'], 2);
        const set = new Set(reqs);
        data().links.forEach((l) => {
          const [s, t] = linkEnds(l);
          if (l.kind === 'allocation' && reqs.has(s)) set.add(t);
          if ((l.kind === 'risk' || l.kind === 'verifies') && reqs.has(t)) set.add(s);
        });
        set.add('IF-002'); set.add('IF-008');
        const alerts = [...set].filter((id) => data().byId[id].type === 'risk');
        return { set, alerts, primary: 'REQ-014' };
      },
    },
    {
      id: 'radar-unverified',
      label: 'Show unverified requirements linked to the radar subsystem',
      keywords: ['unverified', 'radar'],
      summary: 'Requirements allocated to the Radar Subsystem with no verification method assigned — the assurance gap, isolated in one query.',
      run() {
        const set = new Set(['CMP-RDR']);
        data().links.forEach((l) => {
          const [s, t] = linkEnds(l);
          if (l.kind === 'allocation' && t === 'CMP-RDR' &&
              verificationStatus(s) === 'none') set.add(s);
        });
        return { set, alerts: [], primary: 'CMP-RDR' };
      },
    },
    {
      id: 'no-verification',
      label: 'Which requirements lack a verification method?',
      keywords: ['lack', 'verification method', 'no verification'],
      summary: 'Every requirement in the model with no verification method — programme-wide, in one pass. Try doing this against a 400-page PDF.',
      run() {
        const set = new Set();
        data().nodes.forEach((n) => {
          if (n.type === 'requirement' && verificationStatus(n.id) === 'none') set.add(n.id);
        });
        return { set, alerts: [], primary: null };
      },
    },
  ];

  function match(text) {
    const q = text.toLowerCase();
    return CANNED.find((c) =>
      c.keywords.some((k) => q.includes(k)) || c.label.toLowerCase() === q
    ) || null;
  }

  return {
    CANNED, match, requirementsOf,
    verificationStatus, linkedComponents, linkedRisks,
  };
})();
