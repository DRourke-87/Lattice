/*
 * Seed data for the 90-day plan tracker — the reuse case.
 *
 * This is the *only* thing that differs from the acquisition demo besides
 * the schema: a different set of node and edge types, and the plan itself
 * transcribed into them. The engine, the force simulation, the query /
 * focus / dim interaction and the side panel behaviour are all shared.
 *
 * Node types:  phase | action | stakeholder | metric | quickwin | blocker
 * Edge kinds:  belongs_to | depends_on | owned_by | measured_by | blocked_by
 *              | delivers   (action → quick win; the one addition the brief's
 *                            edge table implies but doesn't name)
 *
 * ── REPLACE-ME ────────────────────────────────────────────────────────────
 * The phases, actions, stakeholders and quick wins below are a placeholder
 * transcription in the shape of the real plan. Swap the arrays in this file
 * for the actual 90-day plan content and everything downstream — graph,
 * queries, slide, status board — follows automatically. Nothing else needs
 * to change.
 * ─────────────────────────────────────────────────────────────────────────
 */
window.Lattice = window.Lattice || {};

Lattice.planData = (function () {
  const STATUSES = ['not_started', 'in_progress', 'complete', 'at_risk'];
  const STATUS_LABEL = {
    not_started: 'Not started',
    in_progress: 'In progress',
    complete: 'Complete',
    at_risk: 'At risk',
  };

  const nodes = [];
  const links = [];
  const byId = {};

  function addNode(n) { nodes.push(n); byId[n.id] = n; return n; }
  function addLink(source, target, kind) { links.push({ source, target, kind }); }

  /* ---------------- Phases (the three hub nodes) ---------------- */

  const phases = [
    {
      id: 'PH-1', label: 'Days 1–30 · Listen & Map', short: 'Days 1–30',
      theme: 'navy', from: 1, to: 30,
      intent: 'Understand the practice as it actually is — not as the org chart describes it — and baseline the numbers everything later is measured against.',
    },
    {
      id: 'PH-2', label: 'Days 31–60 · Focus & Prove', short: 'Days 31–60',
      theme: 'teal', from: 31, to: 60,
      intent: 'Narrow to the few things that matter, and prove them on live work rather than in a strategy document.',
    },
    {
      id: 'PH-3', label: 'Days 61–90 · Scale & Systemise', short: 'Days 61–90',
      theme: 'amber', from: 61, to: 90,
      intent: 'Turn what worked into something repeatable, and hand the board a scorecard rather than an anecdote.',
    },
  ];
  phases.forEach((p) => addNode({ ...p, type: 'phase' }));

  /* ---------------- Stakeholders ---------------- */

  const stakeholders = [
    { id: 'STK-GUY',  label: 'Guy Beaumont', role: 'Cost centre & investment sign-off' },
    { id: 'STK-ML',   label: 'Market Leads', role: 'Client relationships and sector priorities' },
    { id: 'STK-PRA',  label: 'Practice Team', role: 'Delivery and capability' },
    { id: 'STK-BID',  label: 'Work-Winning Team', role: 'Bid process and qualification' },
    { id: 'STK-CLI',  label: 'Priority Clients', role: 'Named accounts in the first 90 days' },
    { id: 'STK-MKT',  label: 'Marketing & Comms', role: 'Narrative, campaign and channel' },
    { id: 'STK-HR',   label: 'Resourcing & Talent', role: 'Hiring, clearance and onboarding' },
    { id: 'STK-EXEC', label: 'Executive Board', role: 'Mandate and year-one investment case' },
  ];
  stakeholders.forEach((s) => addNode({ ...s, type: 'stakeholder' }));

  /* ---------------- Metrics ---------------- */

  const metrics = [
    { id: 'MET-WIN',  label: 'Bid win rate', target: '32% → 40% by day 90' },
    { id: 'MET-PIPE', label: 'Qualified pipeline value', target: 'Baselined by day 30, +25% by day 90' },
    { id: 'MET-REUSE', label: 'Reuse rate on bids', target: '60% of a bid drawn from existing assets' },
    { id: 'MET-TTV',  label: 'Time to first draft', target: '10 working days → 5' },
    { id: 'MET-NPS',  label: 'Client feedback score', target: 'Structured feedback on every priority account' },
    { id: 'MET-UTIL', label: 'Chargeable utilisation', target: 'Stable through the transition, no dip below 68%' },
    { id: 'MET-HEAD', label: 'Cleared headcount', target: 'Two senior hires cleared and started by day 90' },
  ];
  metrics.forEach((m) => addNode({ ...m, type: 'metric' }));

  /* ---------------- Blockers / risks ---------------- */

  const blockers = [
    { id: 'BLK-01', label: 'Clearance timeline for new hires', severity: 'red',
      note: 'Vetting is running at 12–16 weeks. Anyone not already cleared cannot contribute inside the 90 days.' },
    { id: 'BLK-02', label: 'No agreed home for shared assets', severity: 'amber',
      note: 'SharePoint vs the Teams estate is unresolved; nobody will file work into a location they expect to move.' },
    { id: 'BLK-03', label: 'Market leads committed to Q3 bids', severity: 'amber',
      note: 'The people needed for account planning are the same people carrying the current bid load.' },
    { id: 'BLK-04', label: 'Legacy credentials not cleared for reuse', severity: 'red',
      note: 'Client permission and IP position unconfirmed on roughly half the back catalogue.' },
    { id: 'BLK-05', label: 'Recruitment paused pending budget', severity: 'amber',
      note: 'No requisition can be raised until the cost centre and envelope are agreed.' },
    { id: 'BLK-06', label: 'Marketing calendar already committed', severity: 'amber',
      note: 'Channel and campaign slots for the quarter are allocated to other practices.' },
  ];
  blockers.forEach((b) => addNode({ ...b, type: 'blocker' }));

  /* ---------------- Actions ---------------- */

  const actions = [
    /* --- Phase 1: Listen & Map --- */
    {
      id: 'ACT-01', label: 'Structured listening tour', phase: 'PH-1', day: 14,
      status: 'complete',
      detail: 'Forty-five minute structured conversations with every market lead and the practice team, to one question set so the answers are comparable rather than anecdotal.',
      owners: ['STK-ML', 'STK-PRA'],
    },
    {
      id: 'ACT-02', label: 'Capability & credentials audit', phase: 'PH-1', day: 21,
      status: 'complete',
      detail: 'What we can actually evidence, versus what we claim in bids. Produces the inventory the asset library is later built from.',
      owners: ['STK-PRA'],
    },
    {
      id: 'ACT-03', label: 'Baseline the numbers', phase: 'PH-1', day: 21,
      status: 'complete',
      detail: 'Pipeline, win rate, utilisation and bid cost, established as a baseline before any change so improvement is arguable rather than asserted.',
      owners: ['STK-GUY'],
      metrics: ['MET-WIN', 'MET-PIPE', 'MET-UTIL'],
    },
    {
      id: 'ACT-04', label: "Agree cost centre & investment envelope", phase: 'PH-1', day: 30,
      status: 'in_progress',
      detail: 'A named cost centre and an agreed envelope for the 90 days. Everything with a cost attached waits behind this.',
      owners: ['STK-GUY', 'STK-EXEC'],
      dependsOn: ['ACT-03'],
    },
    {
      id: 'ACT-05', label: 'Shortlist priority clients', phase: 'PH-1', day: 28,
      status: 'in_progress',
      detail: 'Six named accounts, chosen on evidence from the listening tour rather than on who shouts loudest.',
      owners: ['STK-ML', 'STK-CLI'],
      dependsOn: ['ACT-01'],
      blockedBy: ['BLK-03'],
    },
    {
      id: 'ACT-06', label: 'Publish the practice narrative', phase: 'PH-1', day: 30,
      status: 'in_progress',
      detail: 'One page: what this practice is for, who it serves, and what it refuses. Everything external later hangs off it.',
      owners: ['STK-MKT', 'STK-PRA'],
      dependsOn: ['ACT-01', 'ACT-02'],
    },

    /* --- Phase 2: Focus & Prove --- */
    {
      id: 'ACT-07', label: 'Three co-created account plans', phase: 'PH-2', day: 45,
      status: 'in_progress',
      detail: 'Account plans written with the market leads and, for two of them, with the client in the room. Co-created, not presented.',
      owners: ['STK-ML', 'STK-CLI'],
      dependsOn: ['ACT-05'],
      blockedBy: ['BLK-03'],
      metrics: ['MET-PIPE'],
    },
    {
      id: 'ACT-08', label: 'Stand up the asset library', phase: 'PH-2', day: 50,
      status: 'at_risk',
      detail: 'A single searchable home for credentials, case studies, method assets and reusable bid content — the thing that stops the same work being built twice.',
      owners: ['STK-PRA'],
      dependsOn: ['ACT-02', 'ACT-04'],
      blockedBy: ['BLK-02', 'BLK-04'],
      metrics: ['MET-REUSE'],
    },
    {
      id: 'ACT-09', label: 'Rebuild the bid qualification gate', phase: 'PH-2', day: 42,
      status: 'in_progress',
      detail: 'A short, honest go/no-go with teeth. The fastest route to a better win rate is bidding less, not bidding harder.',
      owners: ['STK-BID'],
      dependsOn: ['ACT-03'],
      metrics: ['MET-WIN'],
    },
    {
      id: 'ACT-10', label: 'Run two pilot bids through the new process', phase: 'PH-2', day: 58,
      status: 'not_started',
      detail: 'Prove the gate and the library on live bids inside the 90 days. Two is enough to learn from and small enough to survive.',
      owners: ['STK-BID', 'STK-PRA'],
      dependsOn: ['ACT-08', 'ACT-09'],
      metrics: ['MET-TTV', 'MET-WIN', 'MET-REUSE'],
    },
    {
      id: 'ACT-11', label: 'Open recruitment for two senior hires', phase: 'PH-2', day: 40,
      status: 'at_risk',
      detail: 'Two senior hires against identified capability gaps. Clearance lead time means anything raised after day 40 lands outside the plan.',
      owners: ['STK-HR', 'STK-GUY'],
      dependsOn: ['ACT-04'],
      blockedBy: ['BLK-01', 'BLK-05'],
      metrics: ['MET-HEAD'],
    },
    {
      id: 'ACT-12', label: 'Monthly practice forum', phase: 'PH-2', day: 35,
      status: 'in_progress',
      detail: 'A standing hour where the practice sees its own work. Cheap, and the main defence against the narrative staying a document.',
      owners: ['STK-PRA'],
      dependsOn: ['ACT-06'],
    },
    {
      id: 'ACT-13', label: 'Client feedback loop on live accounts', phase: 'PH-2', day: 55,
      status: 'not_started',
      detail: 'Structured feedback on two live accounts, asked for early enough that we can still act on the answer.',
      owners: ['STK-CLI', 'STK-ML'],
      dependsOn: ['ACT-07'],
      metrics: ['MET-NPS'],
    },

    /* --- Phase 3: Scale & Systemise --- */
    {
      id: 'ACT-14', label: 'Productise two repeatable offers', phase: 'PH-3', day: 75,
      status: 'not_started',
      detail: 'Take the two things we have now done more than once and turn them into offers with a method, a price and a set of assets behind them.',
      owners: ['STK-PRA', 'STK-ML'],
      dependsOn: ['ACT-08', 'ACT-10'],
      metrics: ['MET-REUSE'],
    },
    {
      id: 'ACT-15', label: 'Embed the qualification gate as standard', phase: 'PH-3', day: 70,
      status: 'not_started',
      detail: 'From pilot to default. The gate applies to every bid, with the exceptions named rather than assumed.',
      owners: ['STK-BID'],
      dependsOn: ['ACT-10'],
      metrics: ['MET-WIN'],
    },
    {
      id: 'ACT-16', label: 'Publish the 90-day scorecard', phase: 'PH-3', day: 85,
      status: 'not_started',
      detail: 'The baseline from day 21, re-run. Same measures, same method, no re-cutting of the numbers to flatter the result.',
      owners: ['STK-EXEC', 'STK-GUY'],
      dependsOn: ['ACT-03', 'ACT-09', 'ACT-13'],
      metrics: ['MET-WIN', 'MET-PIPE', 'MET-UTIL'],
    },
    {
      id: 'ACT-17', label: 'Onboard new hires against the plan', phase: 'PH-3', day: 80,
      status: 'not_started',
      detail: 'New starters join onto named accounts and named offers, not onto a general induction.',
      owners: ['STK-HR', 'STK-PRA'],
      dependsOn: ['ACT-11'],
      blockedBy: ['BLK-01'],
      metrics: ['MET-HEAD'],
    },
    {
      id: 'ACT-18', label: 'Agree the year-one investment case', phase: 'PH-3', day: 90,
      status: 'not_started',
      detail: 'What the next twelve months costs and returns, argued from the scorecard rather than from ambition.',
      owners: ['STK-GUY', 'STK-EXEC'],
      dependsOn: ['ACT-04', 'ACT-16'],
    },
    {
      id: 'ACT-19', label: 'Campaign around the practice narrative', phase: 'PH-3', day: 88,
      status: 'not_started',
      detail: 'External push, built on the productised offers so the campaign has something to sell rather than a position to state.',
      owners: ['STK-MKT'],
      dependsOn: ['ACT-06', 'ACT-14'],
      blockedBy: ['BLK-06'],
    },
  ];

  actions.forEach((a) => {
    addNode({
      id: a.id, type: 'action', label: a.label, detail: a.detail,
      phase: a.phase, day: a.day, status: a.status,
    });
    addLink(a.id, a.phase, 'belongs_to');
    (a.owners || []).forEach((o) => addLink(a.id, o, 'owned_by'));
    (a.dependsOn || []).forEach((d) => addLink(a.id, d, 'depends_on'));
    (a.blockedBy || []).forEach((b) => addLink(a.id, b, 'blocked_by'));
    (a.metrics || []).forEach((m) => addLink(a.id, m, 'measured_by'));
  });

  /* ---------------- Quick wins — one per phase ---------------- */

  const quickWins = [
    {
      id: 'QW-01', label: 'First co-created account plan', phase: 'PH-1', by: 'ACT-05', day: 28,
      note: 'An account plan written with the client rather than for them — visible proof of the operating model inside the first month.',
    },
    {
      id: 'QW-02', label: 'First bid drafted from reusable assets', phase: 'PH-2', by: 'ACT-10', day: 58,
      note: 'A live bid where the first draft comes out of the library. The moment the reuse argument stops being theoretical.',
    },
    {
      id: 'QW-03', label: 'First sale from a productised offer', phase: 'PH-3', by: 'ACT-14', day: 88,
      note: 'Something sold from the productised set rather than assembled from scratch — the 90 days paying for itself.',
    },
  ];
  quickWins.forEach((q) => {
    addNode({ id: q.id, type: 'quickwin', label: q.label, note: q.note, phase: q.phase, day: q.day });
    addLink(q.id, q.phase, 'belongs_to');
    addLink(q.by, q.id, 'delivers');
  });

  /* ---------------- Phase-level headline metrics ---------------- */

  [['PH-1', 'MET-PIPE'], ['PH-2', 'MET-WIN'], ['PH-3', 'MET-REUSE']]
    .forEach(([p, m]) => addLink(p, m, 'measured_by'));

  /* ---------------- Mutable status (the "living" bit) ---------------- */

  function cycleStatus(id) {
    const n = byId[id];
    if (!n || n.type !== 'action') return null;
    n.status = STATUSES[(STATUSES.indexOf(n.status) + 1) % STATUSES.length];
    return n.status;
  }

  return {
    title: '90-DAY PLAN',
    subtitle: 'Practice leadership — the same engine, a different data model',
    STATUSES,
    STATUS_LABEL,
    phases,
    nodes,
    links,
    byId,
    cycleStatus,
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
