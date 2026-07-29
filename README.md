# LATTICE — Model-Based Acquisition Concept Demo

A lightweight, self-contained portal demonstrating what it looks like when a
dense acquisition requirements document becomes a **shared, structured,
queryable model** — instead of a static PDF that two organisations interpret
differently.

All data is **fictional** (an invented maritime sensor integration programme,
"Project LATTICE"). There is no backend, no build step, and no network
dependency: D3 is vendored locally, so the demo runs offline.

## Running it

Open `index.html` directly in any modern browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Two demos share one engine: `index.html` (model-based acquisition) and
`plan.html` (the 90-day plan reuse case, documented at the bottom of this
file). Each top bar links to the other.

## The three screens

1. **Document** — a dense, familiar-looking ITT/SRD extract. The point of this
   screen is that it looks like every requirements pack you've ever read.
   Hit **"Structure the document"** and it dissolves into a living
   force-directed graph: requirements, components, interfaces, risks and
   verification evidence — the structure that was always in the document,
   finally visible.

2. **Model** — the graph breathes (gentle drift, pulsing nodes, flowing
   edges). Type a question or click a suggested query:
   - *"What's affected if we tighten the latency requirement on the targeting
     subsystem?"* — the impact ripple highlights, linked risks throb red, and
     a side panel shows the same answer as structured cards.
   - *"Show unverified requirements linked to the radar subsystem"* — the
     graph dims to just the assurance gap.
   - *"Which requirements lack a verification method?"* — programme-wide gap
     scan in one pass.

   Queries are deliberately canned (simple keyword matching) — the demo is
   about the *interaction*, not NLP. Clicking any node opens its detail card.
   Drag nodes, scroll to zoom, `Esc` or **Reset view** to clear.

3. **Assurance** — the calm sign-off layer: verification coverage, status
   donut, per-subsystem coverage bars, and the outstanding-gaps table — all
   computed live from the same model the graph renders. One source of truth,
   two views of it.

## Suggested two-minute walkthrough

1. Open on the Document screen. Let it sit for a beat — everyone recognises it.
2. Click **Structure the document**. Pause on the graph: *"the document was
   always this complex — you just couldn't see it."*
3. Run the latency query. Point at the red risks lighting up: *"that answer is
   a clarification meeting and a fortnight, done in a second — and both sides
   see the same one."*
4. Run the radar gap query, then switch to **Assurance**: *"and this is the
   view both parties sign off against."*

---

# The reuse case — 90-day plan tracker (`plan.html`)

The productisation argument says nothing should get built twice: every
engagement should end with *"what here is reusable?"*. Rather than assert
that on a slide, `plan.html` demonstrates it — **the same engine, re-pointed
at a completely different domain**. Same rendering code, same force
simulation, same query/focus/dim interaction, same three-screen structure.
Only the node/edge schema and the seed data change.

Open `plan.html`, or use the cross-links in either top bar.

### What it models

| Node type | Represents | Drawn as |
|---|---|---|
| **Phase** | One of the three 90-day phases (hub node) | Large circle, phase colour |
| **Action** | An individual initiative | Circle, coloured by its phase |
| **Quick win** | A milestone flagged as an early win | Gold star |
| **Stakeholder** | A person or group the plan depends on | Square, slate |
| **Metric** | A success measure | Small diamond, peripheral |
| **Blocker** | Something that could delay an action | Triangle, red at high severity and amber at medium |

Edges: `belongs_to`, `depends_on`, `owned_by`, `measured_by`, `blocked_by`.
Quick wins hang off the action that delivers them via `depends_on`, and carry
a status of their own.

The three phase hubs are anchored in plan order — left-to-right on a
landscape screen, top-to-bottom on a portrait one — so the graph reads as
90 days of time rather than an undirected cloud.

### The two visual channels

- **Colour is phase.** Days 1–30 `#0F1E36`, 31–60 `#0E7490`, 61–90 `#E8A020` —
  taken straight from the deck (they live in `js/plan-data.js`, not the CSS),
  so a panellist who has just seen the 90-day slide recognises the palette
  instantly.
- **Motion and glow are status.** `in_progress` pulses actively and glows
  brighter; `complete` settles to a dim, slow breath; `at_risk` pulses faster
  under a red-tinted glow; `not_started` is static and low-opacity. Keeping
  status out of the colour channel means both stay legible at once.

**Double-click any action or quick win to cycle its status** (or use *Cycle
status* in the side panel). The node's motion changes immediately, and the
status board on screen 3 recomputes from the same model — useful for showing
the plan responding live in the room.

The statuses in the seed data are a **simulated day-20 snapshot**, so the
graph has visual variety in the demo. Set every action to `not_started` for a
true day-zero view.

### The three screens

1. **Plan** — the 90-day plan as it appears on a slide: three columns of
   bullets. Rendered from the graph, so it is provably the same content.
   *"A column of bullets per phase. Not one of the dependencies, owners or
   blockers between them is visible here."* Hit **Structure the plan**.
2. **Model** — the living graph, with five canned questions:
   *what is blocking the asset library?* · *show everything the market leads
   own* · *what depends on the cost centre lead?* · *show all quick wins*
   (the closer) · *what is at risk right now?*
3. **Status** — phase progress, status donut, quick wins and the blocked-
   actions table, all computed from the same graph.

Answers are **derived by traversal, not listed** — that is the point of
modelling the plan at all. Each canned query also carries the authored
highlight set from the plan brief; run `Lattice.planQueries.verify()` in the
console to confirm the traversals still cover it after editing the plan.

### Say the reuse out loud

Don't let the panel find the connection themselves — the banner on screen 2
states it, and so should you: *"This is the same engine behind the
acquisition concept — same code, different data model. That's what
productisation actually looks like."*

The claim is checkable in the source: `js/graph.js` mentions neither
requirements nor phases, and both demos load it unchanged.

### Replacing the plan

`js/plan-data.js` opens with a `SEED` object holding the plan verbatim —
`meta`, `nodes` and `edges` exactly as authored — and everything below it is
generic adaptation. Updating the plan is a paste over `SEED`, not an edit
through the file. Graph, slide, queries and status board all follow; phase
colours, counts and legend swatches are read from the data rather than
hard-coded.

Two things reference specific node IDs: the canned queries in
`js/plan-queries.js` (their traversal seeds, summaries and `expects` sets),
and nothing else. Run `Lattice.planQueries.verify()` after a change.

---

## Code layout

| File | Purpose |
|---|---|
| `js/graph.js` | **Shared engine.** D3 force simulation, ambient motion, focus/dim/zoom. Domain-agnostic: colour, size, shape, labelling, motion and force tuning all arrive as a `schema` at `init` |
| `js/data.js` | Acquisition model: ~170 nodes / ~270 links, seeded RNG so it's identical every run |
| `js/queries.js` | Acquisition queries as traversals over the model |
| `js/dashboard.js` | Assurance metrics computed from the model |
| `js/main.js` | Acquisition screens, document→graph transition, side panel, and the acquisition schema |
| `js/plan-data.js` | 90-day plan model — the reuse case's seed data, held verbatim in `SEED` |
| `js/plan-queries.js` | Plan queries, same contract as `queries.js` |
| `js/plan-dashboard.js` | Plan status board |
| `js/plan-main.js` | Plan screens, status cycling, and the plan schema |

The reuse claim is checkable: `js/graph.js` contains no reference to
requirements, phases, or anything else domain-specific. Both demos load the
same file.
