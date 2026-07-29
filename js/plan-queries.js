/*
 * Canned queries over the 90-day plan — same shape, same contract and the
 * same "no NLP, keyword match to a traversal" approach as js/queries.js.
 * Each returns { set, alerts, primary } for Lattice.graph.focus().
 *
 * The highlighted set is *derived* from the graph rather than listed, which
 * is the whole point: change the plan and the answers change with it. Each
 * query also carries the authored `expects` set from the plan brief, which
 * verify() checks the traversal still covers.
 *
 * Edge direction convention (source → target):
 *   action     belongs_to   phase
 *   action     depends_on   prerequisite action
 *   action     owned_by     stakeholder
 *   action     measured_by  metric      (phases too)
 *   action     blocked_by   blocker
 *   quick_win  belongs_to   phase
 *   quick_win  depends_on   the action that delivers it
 */
window.Lattice = window.Lattice || {};

Lattice.planQueries = (function () {
  const data = () => Lattice.planData;

  function ends(l) {
    return [
      typeof l.source === 'object' ? l.source.id : l.source,
      typeof l.target === 'object' ? l.target.id : l.target,
    ];
  }

  // Targets of `kind` edges leaving id — e.g. what this action depends on.
  function out(id, kind) {
    const res = [];
    data().links.forEach((l) => {
      const [s, t] = ends(l);
      if (l.kind === kind && s === id) res.push(data().byId[t]);
    });
    return res.filter(Boolean);
  }

  // Sources of `kind` edges arriving at id — e.g. what depends on this action.
  function into(id, kind) {
    const res = [];
    data().links.forEach((l) => {
      const [s, t] = ends(l);
      if (l.kind === kind && t === id) res.push(data().byId[s]);
    });
    return res.filter(Boolean);
  }

  const prerequisites = (id) => out(id, 'depends_on');
  const dependents    = (id) => into(id, 'depends_on');
  const owners        = (id) => out(id, 'owned_by');
  const blockers      = (id) => out(id, 'blocked_by');
  const metricsOf     = (id) => out(id, 'measured_by');
  const phaseOf       = (id) => out(id, 'belongs_to')[0] || null;
  const actionsIn     = (phaseId) => into(phaseId, 'belongs_to').filter((n) => n.type === 'action');
  const ownedBy       = (stkId) => into(stkId, 'owned_by');
  const blocking      = (blkId) => into(blkId, 'blocked_by');
  const driving       = (metId) => into(metId, 'measured_by');

  // Quick wins hang off the action that delivers them, via depends_on.
  const quickWinsOf   = (actionId) => dependents(actionId).filter((n) => n.type === 'quick_win');
  const enablingAction = (qwId) => prerequisites(qwId)[0] || null;

  const allActions   = () => data().nodes.filter((n) => n.type === 'action');
  const allQuickWins = () => data().nodes.filter((n) => n.type === 'quick_win');
  const allBlockers  = () => data().nodes.filter((n) => n.type === 'blocker');

  // Everything transitively downstream of id along depends_on (i.e. work
  // that cannot land until id does), id excluded.
  function downstreamOf(id) {
    const seen = new Set();
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift();
      dependents(cur).forEach((n) => {
        if (!seen.has(n.id)) { seen.add(n.id); queue.push(n.id); }
      });
    }
    return [...seen];
  }

  // Decorate a set with the context that makes it readable. Each dimension
  // is opt-out, because a query that drags in every owner and every metric
  // stops being an answer and becomes the whole graph again.
  function withContext(set, opts = {}) {
    [...set].forEach((id) => {
      const n = data().byId[id];
      if (!n) return;
      if (opts.phases !== false) {
        const p = phaseOf(id);
        if (p) set.add(p.id);
      }
      if (n.type !== 'action') return;
      if (opts.owners !== false) owners(id).forEach((o) => set.add(o.id));
      if (opts.blockers !== false) blockers(id).forEach((b) => set.add(b.id));
      if (opts.metrics) metricsOf(id).forEach((m) => set.add(m.id));
      if (opts.quickWins) quickWinsOf(id).forEach((q) => set.add(q.id));
    });
    return set;
  }

  // Anything in the set that should throb red: live blockers, and work
  // currently flagged at risk.
  function alertsIn(set) {
    return [...set].filter((id) => {
      const n = data().byId[id];
      return n && (n.type === 'blocker' || n.status === 'at_risk');
    });
  }

  const CANNED = [
    {
      id: 'asset-library',
      label: 'What is blocking the asset library?',
      keywords: ['asset library', 'blocking', 'library'],
      summary: 'Two blockers: no protected investment budget, and unassigned asset ownership. Both cascade — the first productised proposition and the phase 3 quick win depend on this.',
      expects: ['a7', 'b2', 'b5', 'a3', 'a10', 'q3', 'm3'],
      run() {
        const set = new Set(['a7']);
        prerequisites('a7').forEach((n) => set.add(n.id));
        downstreamOf('a7').forEach((id) => set.add(id));
        withContext(set, { metrics: true, quickWins: true });
        return { set, alerts: alertsIn(set), primary: 'a7' };
      },
    },
    {
      id: 'market-leads',
      label: 'Show everything the market leads own',
      keywords: ['market lead', 'market leads'],
      summary: 'The market leads sit on the critical path for account selection and the first productised client conversation — and their capacity is itself a flagged risk.',
      expects: ['s2', 's3', 'a4', 'a5', 'a10', 'b4', 'q2'],
      run() {
        const leads = data().nodes.filter((n) =>
          n.type === 'stakeholder' && /market lead/i.test(n.label));
        const set = new Set(leads.map((n) => n.id));
        leads.forEach((l) => ownedBy(l.id).forEach((a) => set.add(a.id)));
        withContext(set, { owners: false, quickWins: true });
        return { set, alerts: alertsIn(set), primary: leads.length ? leads[0].id : null };
      },
    },
    {
      id: 'cost-centre',
      label: 'What depends on the cost centre lead?',
      keywords: ['cost centre', 'cost center'],
      summary: 'Pipeline mapping, the published growth plan and the measures baseline all route through the cost centre. Pipeline data quality is the blocker to watch.',
      expects: ['s7', 'a2', 'a9', 'a12', 'm1', 'm4', 'b3'],
      run() {
        const set = new Set(['s7']);
        ownedBy('s7').forEach((a) => set.add(a.id));
        withContext(set, { owners: false, metrics: true });
        return { set, alerts: alertsIn(set), primary: 's7' };
      },
    },
    {
      id: 'quick-wins',
      label: 'Show all quick wins',
      keywords: ['quick win', 'quick wins'],
      summary: 'One per phase, each tied to a specific action — an honest pipeline view, a co-created account plan, and a real asset used in a live bid.',
      expects: ['q1', 'q2', 'q3', 'a2', 'a5', 'a7'],
      run() {
        const set = new Set();
        allQuickWins().forEach((q) => {
          set.add(q.id);
          const a = enablingAction(q.id);
          if (a) set.add(a.id);
        });
        withContext(set, { owners: false, blockers: false });
        return { set, alerts: alertsIn(set), primary: null };
      },
    },
    {
      id: 'at-risk',
      label: 'What is at risk right now?',
      keywords: ['at risk', 'risk right now', 'slipping'],
      summary: 'The asset library is the single at-risk action, and it has the widest downstream impact of anything in the plan.',
      expects: ['a7', 'b2', 'b5', 'b1', 'b3', 'b4', 'a10', 'q3'],
      run() {
        const set = new Set();
        // Everything flagged at risk, everything downstream of it, and the
        // full blocker set — the risk register alongside the work it hits.
        data().nodes.filter((n) => n.status === 'at_risk').forEach((n) => {
          set.add(n.id);
          downstreamOf(n.id).forEach((id) => set.add(id));
        });
        allBlockers().forEach((b) => set.add(b.id));
        withContext(set, { owners: false });
        return { set, alerts: alertsIn(set), primary: null };
      },
    },
  ];

  function match(text) {
    const q = text.toLowerCase();
    return CANNED.find((c) =>
      c.keywords.some((k) => q.includes(k)) || c.label.toLowerCase() === q
    ) || null;
  }

  // Dev check: every authored highlight is still reachable by traversal.
  // Call Lattice.planQueries.verify() from the console after editing the plan.
  function verify() {
    return CANNED.map((c) => {
      const { set } = c.run();
      const missing = (c.expects || []).filter((id) => !set.has(id));
      return { id: c.id, ok: !missing.length, missing, size: set.size };
    });
  }

  return {
    CANNED, match, verify,
    prerequisites, dependents, downstreamOf, owners, blockers, metricsOf,
    phaseOf, actionsIn, ownedBy, blocking, driving,
    quickWinsOf, enablingAction,
    allActions, allQuickWins, allBlockers, alertsIn,
  };
})();
