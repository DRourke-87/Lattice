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

## Code layout

| File | Purpose |
|---|---|
| `js/data.js` | Fictional model: ~190 nodes / ~270 links, seeded RNG so it's identical every run |
| `js/graph.js` | D3 force simulation, ambient motion, focus/dim/zoom interactions |
| `js/queries.js` | Canned queries as traversals over the model |
| `js/dashboard.js` | Assurance metrics computed from the model |
| `js/main.js` | Screen orchestration, document→graph transition, side panel |
