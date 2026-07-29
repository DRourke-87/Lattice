/*
 * Canned queries over the 90-day plan — same shape, same contract and the
 * same "no NLP, keyword match to a traversal" approach as js/queries.js.
 * Each returns { set, alerts, primary } for Lattice.graph.focus().
 *
 * Edge direction convention (source → target):
 *   action  belongs_to   phase
 *   action  depends_on   prerequisite action
 *   action  owned_by     stakeholder
 *   action  measured_by  metric      (phases too)
 *   action  blocked_by   blocker
 *   action  delivers     quick win
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
  const deliverables  = (id) => out(id, 'delivers');
  const deliveredBy   = (id) => into(id, 'delivers');
  const phaseOf       = (id) => out(id, 'belongs_to')[0] || null;
  const actionsIn     = (phaseId) => into(phaseId, 'belongs_to').filter((n) => n.type === 'action');
  const ownedBy       = (stkId) => into(stkId, 'owned_by');

  // Everything transitively downstream of id along depends_on (i.e. work
  // that cannot start until id lands), id excluded.
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

  const allActions = () => data().nodes.filter((n) => n.type === 'action');
  const statusOf = (id) => (data().byId[id] || {}).status;

  // Decorate an action set with the context that makes it readable: the
  // phase it sits in, who owns it, and anything blocking it.
  function withContext(set, opts = {}) {
    [...set].forEach((id) => {
      const n = data().byId[id];
      if (!n || n.type !== 'action') return;
      const p = phaseOf(id);
      if (p) set.add(p.id);
      if (opts.owners !== false) owners(id).forEach((o) => set.add(o.id));
      if (opts.blockers !== false) blockers(id).forEach((b) => set.add(b.id));
      if (opts.metrics) metricsOf(id).forEach((m) => set.add(m.id));
      if (opts.quickWins) deliverables(id).forEach((q) => set.add(q.id));
    });
    return set;
  }

  // Anything in the set that should throb red: live blockers, and actions
  // currently flagged at risk.
  function alertsIn(set) {
    return [...set].filter((id) => {
      const n = data().byId[id];
      return n && (n.type === 'blocker' || (n.type === 'action' && n.status === 'at_risk'));
    });
  }

  const CANNED = [
    {
      id: 'asset-library',
      label: "What's blocking the asset library reaching production?",
      keywords: ['asset library', 'blocking', 'library'],
      summary: 'ACT-08 (Stand up the asset library) with both blockers, the two actions it waits on, and everything downstream that cannot land until it does — the pilot bids, the productised offers and the campaign built on them.',
      run() {
        const set = new Set(['ACT-08']);
        prerequisites('ACT-08').forEach((n) => set.add(n.id));
        downstreamOf('ACT-08').forEach((id) => set.add(id));
        withContext(set, { metrics: true, quickWins: true });
        return { set, alerts: alertsIn(set), primary: 'ACT-08' };
      },
    },
    {
      id: 'market-leads-60',
      label: 'Show everything owned by the market leads in the first 60 days',
      keywords: ['market leads', 'first 60', 'owned by'],
      summary: 'Everything with Market Leads named as an owner inside days 1–60. Ownership concentration is the point: one group carries four actions across two phases — and the first quick win — while still running the Q3 bid load.',
      run() {
        const early = new Set(['PH-1', 'PH-2']);
        const set = new Set(['STK-ML']);
        ownedBy('STK-ML')
          .filter((a) => a.type === 'action' && early.has(a.phase))
          .forEach((a) => set.add(a.id));
        withContext(set, { owners: false, quickWins: true });
        return { set, alerts: alertsIn(set), primary: 'STK-ML' };
      },
    },
    {
      id: 'cost-centre',
      label: "What depends on Guy's cost centre sign-off?",
      keywords: ['cost centre', 'guy', 'sign-off', 'sign off'],
      summary: 'The dependency chain out of ACT-04 (Agree cost centre & investment envelope). One sign-off gates recruitment, the asset library, both pilot bids and — three hops later — the year-one investment case.',
      run() {
        const set = new Set(['ACT-04', 'STK-GUY']);
        downstreamOf('ACT-04').forEach((id) => set.add(id));
        withContext(set, { metrics: true, quickWins: true });
        return { set, alerts: alertsIn(set), primary: 'ACT-04' };
      },
    },
    {
      id: 'quick-wins',
      label: 'Show all quick wins across the 90 days',
      keywords: ['quick win', 'quick wins'],
      summary: 'One quick win per phase, each with the action that delivers it: a co-created account plan by day 28, a bid drafted from the library by day 58, a productised offer sold by day 88.',
      run() {
        const set = new Set();
        data().nodes.filter((n) => n.type === 'quickwin').forEach((q) => {
          set.add(q.id);
          set.add(q.phase);
          deliveredBy(q.id).forEach((a) => set.add(a.id));
        });
        withContext(set, { blockers: false });
        return { set, alerts: alertsIn(set), primary: null };
      },
    },
    {
      id: 'at-risk',
      label: "What's at risk right now?",
      keywords: ['at risk', 'risk right now', 'slipping'],
      summary: 'Every action currently flagged at risk, with what is blocking it and who owns it. Change a status on the graph and this answer changes with it.',
      run() {
        const set = new Set();
        allActions().filter((a) => a.status === 'at_risk').forEach((a) => set.add(a.id));
        withContext(set, { metrics: true });
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

  return {
    CANNED, match,
    prerequisites, dependents, downstreamOf, owners, blockers, metricsOf,
    deliverables, deliveredBy, phaseOf, actionsIn, ownedBy,
    allActions, statusOf, alertsIn,
  };
})();
