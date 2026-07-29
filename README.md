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
| **Stakeholder** | A person or group the plan depends on | Square, slate |
| **Metric** | A success measure | Small diamond, peripheral |
| **Quick win** | A milestone flagged as an early win | Gold star |
| **Blocker** | Something that could delay an action | Red triangle |

Edges: `belongs_to`, `depends_on`, `owned_by`, `measured_by`, `blocked_by`,
plus `delivers` (action → quick win).

### The two visual channels

- **Colour is phase.** Days 1–30 navy, 31–60 teal, 61–90 amber — carried
  straight over from the deck, so a panellist who has just seen the 90-day
  slide recognises the palette instantly.
- **Motion and glow are status.** `in_progress` pulses actively and glows
  brighter; `complete` settles to a dim, slow breath; `at_risk` pulses faster
  under a red-tinted glow; `not_started` is static and low-opacity. Keeping
  status out of the colour channel means both stay legible at once.

**Double-click any action to cycle its status** (or use *Cycle status* in the
side panel). The node's motion changes immediately, and the status board on
screen 3 recomputes from the same model — useful for showing the plan
responding live in the room.

### The three screens

1. **Plan** — the 90-day plan as it appears on a slide: three columns of
   bullets. Rendered from the graph, so it is provably the same content.
   *"A column of bullets per phase. Not one of the dependencies, owners or
   blockers between them is visible here."* Hit **Structure the plan**.
2. **Model** — the living graph, with five canned questions:
   *what's blocking the asset library reaching production?* · *show
   everything owned by the market leads in the first 60 days* · *what depends
   on Guy's cost centre sign-off?* · *show all quick wins across the 90 days*
   (the closer) · *what's at risk right now?*
3. **Status** — phase progress, status donut, quick wins and the blocked-
   actions table, all computed from the same graph.

### Say the reuse out loud

Don't let the panel find the connection themselves — the banner on screen 2
states it, and so should you: *"This is the same engine behind the
acquisition concept — same code, different data model. That's what
productisation actually looks like."*

### Replacing the seed data

The plan content in `js/plan-data.js` is a placeholder in the shape of the
real plan (marked `REPLACE-ME` in the file). Swap the `phases`, `actions`,
`stakeholders`, `metrics`, `blockers` and `quickWins` arrays for the actual
90-day plan and everything downstream — graph, queries, slide, status board —
follows. Nothing else needs to change. Only the canned query summaries in
`js/plan-queries.js` reference specific IDs.

---

## Code layout

| File | Purpose |
|---|---|
| `js/graph.js` | **Shared engine.** D3 force simulation, ambient motion, focus/dim/zoom. Domain-agnostic: colour, size, shape, labelling, motion and force tuning all arrive as a `schema` at `init` |
| `js/data.js` | Acquisition model: ~170 nodes / ~270 links, seeded RNG so it's identical every run |
| `js/queries.js` | Acquisition queries as traversals over the model |
| `js/dashboard.js` | Assurance metrics computed from the model |
| `js/main.js` | Acquisition screens, document→graph transition, side panel, and the acquisition schema |
| `js/plan-data.js` | 90-day plan model — the reuse case's seed data |
| `js/plan-queries.js` | Plan queries, same contract as `queries.js` |
| `js/plan-dashboard.js` | Plan status board |
| `js/plan-main.js` | Plan screens, status cycling, and the plan schema |

The reuse claim is checkable: `js/graph.js` contains no reference to
requirements, phases, or anything else domain-specific. Both demos load the
same file.
