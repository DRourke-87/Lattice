/*
 * Seed data for the 90-day plan tracker — the reuse case.
 *
 * This is the *only* thing that differs from the acquisition demo besides
 * the schema: a different set of node and edge types, and the plan itself
 * transcribed into them. The engine, the force simulation, the query /
 * focus / dim interaction and the side panel behaviour are all shared.
 *
 * Node types:  phase | action | quick_win | stakeholder | metric | blocker
 * Edge types:  belongs_to | depends_on | owned_by | measured_by | blocked_by
 *
 * SEED below is the plan verbatim — nodes and edges exactly as authored, so
 * updating the plan is a paste rather than an edit. Everything after it is
 * generic adaptation into the arrays the engine and queries expect.
 */
window.Lattice = window.Lattice || {};

Lattice.planData = (function () {
  const SEED = {
    meta: {
      title: '90-Day Plan — Data, Automation & AI Practice',
      owner: 'Darren Rourke',
      context: 'Turner & Townsend · Director, Digital',
      note: "Statuses represent a simulated 'day 20' snapshot so the graph has visual variety in the demo. Set all actions to 'not_started' for a true day-zero view.",
      statusLegend: {
        complete: 'steady, dimmer glow',
        in_progress: 'active pulse, brighter glow',
        at_risk: 'red-tinted pulse, faster rhythm',
        not_started: 'static, low opacity',
      },
    },

    nodes: [
      { id: 'p1', type: 'phase', label: 'Days 1–30', sublabel: 'Listen & Map', color: '0F1E36' },
      { id: 'p2', type: 'phase', label: 'Days 31–60', sublabel: 'Focus & Prove', color: '0E7490' },
      { id: 'p3', type: 'phase', label: 'Days 61–90', sublabel: 'Commit & Measure', color: 'E8A020' },

      { id: 'a1', type: 'action', label: 'Meet the senior team & practice', detail: 'Meet every one of the senior team and a cross-section of the 60-person practice.', phase: 'p1', status: 'complete' },
      { id: 'a2', type: 'action', label: 'Map pipeline & conversion', detail: 'Map live pipeline, current bids and the real conversion rate — not the reported one.', phase: 'p1', status: 'in_progress' },
      { id: 'a3', type: 'action', label: 'Audit existing assets', detail: 'Audit what reusable assets already exist. Most practices under-count their own IP.', phase: 'p1', status: 'in_progress' },
      { id: 'a4', type: 'action', label: 'Meet market leads & account managers', detail: 'Meet the people who already hold the client relationships in Defence & Government.', phase: 'p1', status: 'complete' },

      { id: 'a5', type: 'action', label: 'Agree 5–6 priority accounts', detail: 'Select the accounts with warmth and a real digital need. Depth, not breadth.', phase: 'p2', status: 'in_progress' },
      { id: 'a6', type: 'action', label: 'Sharpen the capability story', detail: 'One page, plain English, tellable in 60 seconds by any consultant in the practice.', phase: 'p2', status: 'not_started' },
      { id: 'a7', type: 'action', label: 'Stand up the asset library', detail: 'Two accelerators identified, each with a named owner — not a committee.', phase: 'p2', status: 'at_risk' },
      { id: 'a8', type: 'action', label: 'Introduce 3·3·1 and win/loss review', detail: 'Embed a repeatable BD rhythm across the practice, not just the naturals.', phase: 'p2', status: 'not_started' },

      { id: 'a9', type: 'action', label: 'Publish the growth plan', detail: 'Named owners and numbers against every line. Public commitment.', phase: 'p3', status: 'not_started' },
      { id: 'a10', type: 'action', label: 'Take a productised proposition to client', detail: 'First accelerator-backed proposition in a live client conversation.', phase: 'p3', status: 'not_started' },
      { id: 'a11', type: 'action', label: 'Agree the talent plan', detail: 'Cleared pipeline building ahead of demand, not after the contract lands.', phase: 'p3', status: 'not_started' },
      { id: 'a12', type: 'action', label: 'Baseline and commit to measures', detail: 'A small number of measures, set with real data, committed to publicly.', phase: 'p3', status: 'not_started' },

      { id: 'q1', type: 'quick_win', label: 'Single honest view of pipeline & capacity', phase: 'p1', status: 'in_progress' },
      { id: 'q2', type: 'quick_win', label: 'First co-created account plan with a market lead', phase: 'p2', status: 'not_started' },
      { id: 'q3', type: 'quick_win', label: 'A demonstrable asset used in a real bid', phase: 'p3', status: 'not_started' },

      { id: 's1', type: 'stakeholder', label: 'Digital Leadership' },
      { id: 's2', type: 'stakeholder', label: 'Market Leads — Defence' },
      { id: 's3', type: 'stakeholder', label: 'Market Leads — Government' },
      { id: 's4', type: 'stakeholder', label: 'Account Managers' },
      { id: 's5', type: 'stakeholder', label: 'Bid Team' },
      { id: 's6', type: 'stakeholder', label: 'Resourcing & Talent' },
      { id: 's7', type: 'stakeholder', label: 'Cost Centre Lead' },
      { id: 's8', type: 'stakeholder', label: 'The Practice (c.60)' },

      { id: 'm1', type: 'metric', label: 'Pipeline value & conversion rate', area: 'Growth', outcome: 'Baselined at 90 days, improving trend by month 6' },
      { id: 'm2', type: 'metric', label: 'Bid win rate & average engagement value', area: 'Commercial', outcome: 'Higher win rate on fewer, better-qualified bids' },
      { id: 'm3', type: 'metric', label: 'Reusable assets & rate of reuse', area: 'Productisation', outcome: 'Two accelerators live and used in bids by month 6' },
      { id: 'm4', type: 'metric', label: 'Client satisfaction, delivery health, margin', area: 'Delivery', outcome: 'Held or improved while growth accelerates' },
      { id: 'm5', type: 'metric', label: 'Retention, cleared bench depth, progression', area: 'People', outcome: 'Bench ahead of demand, visible succession in place' },

      { id: 'b1', type: 'blocker', label: 'Clearance timelines', detail: 'SC/DV processing time constrains how fast the bench can grow.', severity: 'high' },
      { id: 'b2', type: 'blocker', label: 'No protected investment budget', detail: 'Accelerator work has no client to bill to — it is the first thing cut under pressure.', severity: 'high' },
      { id: 'b3', type: 'blocker', label: 'Pipeline data quality', detail: 'Reported pipeline and real pipeline may not match. Cannot baseline what is not accurate.', severity: 'medium' },
      { id: 'b4', type: 'blocker', label: 'Market lead capacity', detail: 'The people who hold the relationships are the busiest people in the business.', severity: 'medium' },
      { id: 'b5', type: 'blocker', label: 'Unassigned asset ownership', detail: 'Assets without a named owner decay. Committees do not maintain code.', severity: 'medium' },
    ],

    edges: [
      { source: 'a1', target: 'p1', type: 'belongs_to' },
      { source: 'a2', target: 'p1', type: 'belongs_to' },
      { source: 'a3', target: 'p1', type: 'belongs_to' },
      { source: 'a4', target: 'p1', type: 'belongs_to' },
      { source: 'a5', target: 'p2', type: 'belongs_to' },
      { source: 'a6', target: 'p2', type: 'belongs_to' },
      { source: 'a7', target: 'p2', type: 'belongs_to' },
      { source: 'a8', target: 'p2', type: 'belongs_to' },
      { source: 'a9', target: 'p3', type: 'belongs_to' },
      { source: 'a10', target: 'p3', type: 'belongs_to' },
      { source: 'a11', target: 'p3', type: 'belongs_to' },
      { source: 'a12', target: 'p3', type: 'belongs_to' },
      { source: 'q1', target: 'p1', type: 'belongs_to' },
      { source: 'q2', target: 'p2', type: 'belongs_to' },
      { source: 'q3', target: 'p3', type: 'belongs_to' },

      { source: 'a5', target: 'a2', type: 'depends_on' },
      { source: 'a5', target: 'a4', type: 'depends_on' },
      { source: 'a6', target: 'a1', type: 'depends_on' },
      { source: 'a7', target: 'a3', type: 'depends_on' },
      { source: 'a8', target: 'a4', type: 'depends_on' },
      { source: 'a9', target: 'a5', type: 'depends_on' },
      { source: 'a9', target: 'a6', type: 'depends_on' },
      { source: 'a10', target: 'a7', type: 'depends_on' },
      { source: 'a10', target: 'a5', type: 'depends_on' },
      { source: 'a11', target: 'a5', type: 'depends_on' },
      { source: 'a12', target: 'a2', type: 'depends_on' },
      { source: 'q1', target: 'a2', type: 'depends_on' },
      { source: 'q2', target: 'a5', type: 'depends_on' },
      { source: 'q3', target: 'a7', type: 'depends_on' },

      { source: 'a1', target: 's8', type: 'owned_by' },
      { source: 'a1', target: 's1', type: 'owned_by' },
      { source: 'a2', target: 's5', type: 'owned_by' },
      { source: 'a2', target: 's7', type: 'owned_by' },
      { source: 'a3', target: 's8', type: 'owned_by' },
      { source: 'a4', target: 's2', type: 'owned_by' },
      { source: 'a4', target: 's3', type: 'owned_by' },
      { source: 'a4', target: 's4', type: 'owned_by' },
      { source: 'a5', target: 's2', type: 'owned_by' },
      { source: 'a5', target: 's3', type: 'owned_by' },
      { source: 'a5', target: 's4', type: 'owned_by' },
      { source: 'a6', target: 's1', type: 'owned_by' },
      { source: 'a7', target: 's8', type: 'owned_by' },
      { source: 'a8', target: 's5', type: 'owned_by' },
      { source: 'a9', target: 's1', type: 'owned_by' },
      { source: 'a9', target: 's7', type: 'owned_by' },
      { source: 'a10', target: 's2', type: 'owned_by' },
      { source: 'a11', target: 's6', type: 'owned_by' },
      { source: 'a12', target: 's7', type: 'owned_by' },

      { source: 'a2', target: 'm1', type: 'measured_by' },
      { source: 'a5', target: 'm1', type: 'measured_by' },
      { source: 'a8', target: 'm2', type: 'measured_by' },
      { source: 'a9', target: 'm2', type: 'measured_by' },
      { source: 'a3', target: 'm3', type: 'measured_by' },
      { source: 'a7', target: 'm3', type: 'measured_by' },
      { source: 'a10', target: 'm3', type: 'measured_by' },
      { source: 'a12', target: 'm4', type: 'measured_by' },
      { source: 'a11', target: 'm5', type: 'measured_by' },
      { source: 'p3', target: 'm1', type: 'measured_by' },
      { source: 'p3', target: 'm4', type: 'measured_by' },

      { source: 'a7', target: 'b2', type: 'blocked_by' },
      { source: 'a7', target: 'b5', type: 'blocked_by' },
      { source: 'a2', target: 'b3', type: 'blocked_by' },
      { source: 'a12', target: 'b3', type: 'blocked_by' },
      { source: 'a11', target: 'b1', type: 'blocked_by' },
      { source: 'a5', target: 'b4', type: 'blocked_by' },
      { source: 'a4', target: 'b4', type: 'blocked_by' },
      { source: 'a10', target: 'b2', type: 'blocked_by' },
    ],
  };

  /* ---------------- Adaptation (generic — no plan content below) ---------------- */

  const STATUSES = ['not_started', 'in_progress', 'complete', 'at_risk'];
  const STATUS_LABEL = {
    not_started: 'Not started',
    in_progress: 'In progress',
    complete: 'Complete',
    at_risk: 'At risk',
  };
  // Types that carry a status, and so drive the "living" motion.
  const LIVE_TYPES = ['action', 'quick_win'];

  const nodes = SEED.nodes.map((n) => Object.assign({}, n));
  const links = SEED.edges.map((e) => ({ source: e.source, target: e.target, kind: e.type }));
  const byId = {};
  nodes.forEach((n) => { byId[n.id] = n; });

  const phases = nodes.filter((n) => n.type === 'phase');
  const phaseOrder = {};
  phases.forEach((p, i) => { phaseOrder[p.id] = i; });

  function phaseColour(phaseId) {
    const p = byId[phaseId];
    return p && p.color ? '#' + p.color : '#4b6994';
  }

  // rgba from the phase hex, for chip and column tints.
  function phaseTint(phaseId, alpha) {
    const p = byId[phaseId];
    if (!p || !p.color) return 'rgba(75, 105, 148, ' + alpha + ')';
    const v = parseInt(p.color, 16);
    return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + alpha + ')';
  }

  function cycleStatus(id) {
    const n = byId[id];
    if (!n || LIVE_TYPES.indexOf(n.type) === -1) return null;
    n.status = STATUSES[(STATUSES.indexOf(n.status) + 1) % STATUSES.length];
    return n.status;
  }

  return {
    meta: SEED.meta,
    title: SEED.meta.title,
    owner: SEED.meta.owner,
    context: SEED.meta.context,
    STATUSES,
    STATUS_LABEL,
    LIVE_TYPES,
    phases,
    phaseOrder,
    phaseColour,
    phaseTint,
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
