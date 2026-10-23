# Gauntlet 1 — senior banker / CFO decision and staff productivity

Reviewed 23 October 2026, baseline `dd0f68e`. Independent first pass; no application edits. Read AGENTS.md and PEER_ARCHITECTURE_RESEARCH.md; inspected implementation and actual localhost:4173 UI using a separate owned preview tab (`tab_r_536cdade-d4a4-4f0b-b850-fdf8f7f56a3f`). Opened the existing PepsiCo financing workroom. No external APIs invoked. UI evidence is observed; verification JSON is repository-reported evidence, not independently rerun acceptance.

**Verdict:** A bounded public-archive calculation/document demonstrator exists. It is not yet a banker decision workflow. The highest-value redesign is to make a structured client decision and editable alternatives authoritative, with the deck a downstream artifact. More architecture panels or slide styling will not establish productivity or client impact.

## Functional scope and maturity

Functional: archived evidence and dated sources; real local MCP path; deterministic financial scenarios; linked materials and scene; editable headlines/layout/page order; version-conflict protection; analysis inspection and workings CSV. Review notes can be captured in-session and saved as a pending brief. Existing legacy deterministic APIs include recalculation and frozen review copies, per scripts/docs; these capabilities are not equivalent to the active workroom journey.

Deferred: arbitrary brief interpretation, autonomous tool planning/narrative, live financial providers, voice/transcription, full Office export and bank deployment/acceptance. Deferral is correctly disclosed and should remain. Manual structured decisions, comparisons and recalculation need no model connection.

Scale: 0 absent; 1 static; 2 bounded functional; 3 evaluated; 4 validated with bankers.

| Dimension | Score | Reason |
|---|---:|---|
| Client framing | 1 | Generic decision headlines; no persisted CFO objective/constraints/decision criteria |
| Workflow | 2 | Executable bounded blueprints, but no actionable engagement work plan |
| Financial trust | 2 | Pinned calculations, formulas and source snapshots; coarse lineage and generic assumptions |
| Artifact/review | 2 | Scoped page edits/revisions work; review resolution/recalculation/lifecycle incomplete in workroom |
| Operating model | 1 | Prototype boundary explicit; no task ownership/review responsibility in workroom |
| Measurement | 1 | Technical checks and latency reported; no equal-quality banker outcome experiment |

## Prioritized findings

### 1. High — The opening artifact does not answer a client decision

**Evidence:** Actual PepsiCo page 1 says “Frame the financing decision” and “Assess financing flexibility, cash cost and sensitivity before selecting an issuance structure,” then shows 6.20% yield, $498.6m proceeds, $31.3m coupon and 2.68x existing leverage. No decision date, funding purpose, required proceeds, constraints, preferred alternative or conditions to change it. `src/workflow.rs:130–163` hardcodes this framing; `Brief` (`:13–17`) stores only prompt/room/revision.

**Why care:** A CFO needs a choice and consequences. Staff still have to construct the advisory argument outside the tool.

**Minimum fix:** Persist a manually editable decision brief: decision owner/date, objective, amount/use, hard constraints, criteria, known facts, hypotheses and missing information. Generate a decision summary from explicit alternatives; permit “insufficient evidence” and conditional recommendations.

**Acceptance:** For a public illustrative $500m funding need, a banker can record criteria, compare at least two structures plus defer/status quo, see the conditional preferred option and explain which missing fact could reverse it. Reload preserves the brief and all outputs link back to it.

### 2. High — The blueprint is a completed technical trace, not an actionable work plan

**Evidence:** UI stages are discover/evidence/calculate/context/compile/review/model; `src/workflow.rs:267` immediately marks the first five complete. No tasks, owners, dependencies, missing-data resolution or review gates. Saving a brief produces only the deferred message (`:83–89`).

**Why care:** The analyst's work is deciding what to research, reconcile, challenge and escalate. An execution trace does not reduce coordination or prevent an incomplete recommendation reaching the meeting.

**Minimum fix:** Translate structured brief into an editable local checklist with deliverable, owner/role, dependency, input, status, blocker and acceptance criterion. Separate completed calculations from unresolved commercial/credit checks. Include an explicit stop point before client-ready status.

**Acceptance:** A missing issuer spread is an assigned blocker rather than an implicit completed analytical stage; the banker can resolve it with an illustrative assumption, retain that choice and see downstream tasks unblock.

### 3. High — Alternatives cannot be inspected or recalculated within the primary journey

**Evidence:** `Preview` accepts kind/issuer/target only (`src/workflow.rs:6–10`), then calculates one `base_case` using `finance::defaults` (`:263`). `frontend/src/AgentStudio.tsx:1291–1348` presents analysis as metrics, rationale, JSON and CSV; no input/recalculate action. Page patch changes document composition, not economics. Follow-up prompts save for a deferred phase.

**Why care:** In a client meeting, “What if we issue three years instead?” must produce a controlled answer. Generating a new blueprint or reading JSON shifts work back to Excel.

**Minimum fix:** Add typed local assumption editors, named alternatives and deterministic recalculation into the same room. Display deltas in proceeds, annual cash cost, leverage and relevant constraints; preserve old assumptions/results. Rebind only affected figures/pages and mark narrative requiring review.

**Acceptance:** Change tenor/spread on one alternative, independently verify resulting bond values, inspect old/new delta, and prove unrelated alternative/page content remains unchanged. Invalid inputs and stale versions fail without mutation.

### 4. High — Source presence is stronger than assumption and derived-number accountability

**Evidence:** Generic illustrative rationale accompanies defaults including 125bp spread and $150m synergies (`src/finance.rs:5–29`; `workflow.rs:263`). Scene analysis frames cite all company facts rather than each derived figure's actual inputs (`src/materials.rs:118–120`). Repository verification explicitly excludes “Full per-derived-number lineage.” Existing net debt/EBITDA proxy is displayed on the first page without its composition beside the number.

**Why care:** Reviewers must distinguish reported fact, judgment, scenario and proxy, then challenge the exact inputs. A broad citation bundle does not let an associate substantiate the CFO's key number quickly.

**Minimum fix:** Per input retain type, unit, date, source or explicit banker rationale, owner and confidence/range. For each key output expose formula plus exact input/evidence IDs and financial definition. Label proxy limitations at point of use. Do not fabricate market justification for illustrative terms.

**Acceptance:** Clicking 2.68x exposes debt, cash and operating-income-plus-D&A inputs with dates/definitions; clicking assumed spread shows no market-source claim, the owner rationale and sensitivity range. A reviewer can recompute every decision-summary metric without inspecting unrelated facts.

### 5. High — Review notes and client-ready artifacts lack a complete lifecycle

**Evidence:** Notes are React `useState` (`AgentStudio.tsx:377–380`); “Save review brief” serializes notes to `send` then clears them (`:935–948`), while capture stores a pending model instruction. History snapshots are persisted (`workflow.rs:37–40`), but current workroom lacks a visible issue-resolution, revision comparison, frozen reviewed copy or approval/reopen flow. CSV export contains label/value/unit/formula, not the source/assumption snapshot (`AgentStudio.tsx:1329–1347`).

**Why care:** A VP cannot know whether a requested correction happened, whether a client copy matches the reviewed calculation, or whether unsaved meeting feedback survived refresh.

**Minimum fix:** Persist page-anchored review issues immediately; distinguish open/applied/verified/deferred. Expose revision comparison and freeze an exact review bundle containing brief, alternatives, calculations, source dates, assumptions, document and issues. Editing a frozen copy creates a new draft. An inspection JSON/HTML bundle suffices while Office export remains deferred.

**Acceptance:** Add a note, reload, apply a structured financial correction, verify the issue, freeze, edit, then reopen the frozen copy and prove its old figures and notes unchanged. Pending natural-language feedback must never appear applied.

### 6. Medium — Technical observability dominates the staff interface

**Evidence:** Actual workroom opens with MCP/context/compilation stages and “Inspect execution · 7 tools”; primary tabs include Context. Client economics appear inside a five-page canvas; first headline is an instruction rather than a conclusion. `PlatformWorkspace.tsx:186–210` library offers title/page count/revision, with no decision, owner, deadline or unresolved risk.

**Why care:** A busy banker should first see the decision, preferred option, critical unresolved question and next task. Reconstructing these across slides and logs costs attention.

**Minimum fix:** Open workrooms with a decision summary, alternatives table, next actions and unresolved review issues. Keep execution/context inspectable in a secondary drawer. Library cards should show decision/status/as-of/next action; slide editing remains a downstream mode.

**Acceptance:** A banker unfamiliar with the room can identify objective, current preferred option, most material uncertainty and next responsible action from one screen without reading JSON or execution logs.

### 7. High — 10x productivity and 5x impact have no measurement basis

**Evidence:** `docs/mcp-verification.json` records 4.87–6.36ms blueprint execution, unit/protocol checks and example-page checks; no banker task baseline, elapsed review/rework, decision accuracy or client outcome observations. Peer research explicitly does not establish competitor performance.

**Why care:** Fast template compilation can coexist with unchanged advisory effort or greater review risk. An ordinal quality rating cannot establish a fivefold client outcome improvement.

**Minimum fix:** Add a runnable evaluation protocol and evidence log before claiming multipliers. Use equal-scope, equal-quality end-to-end tasks: baseline public-source research/calculation/material preparation/review and tool-assisted work through reviewer acceptance. Capture active time, elapsed time, review/rework, errors, unresolved assumptions, completeness and reviewer-blinded decision usefulness. Predefine exclusions and success thresholds. For client impact use a defensible observable outcome with a meaningful ratio denominator; otherwise report decision-quality dimensions without a 5x claim.

**Acceptance:** At least one complete paired task can be logged with all time components and independently checked results; displayed multiplier is “unproven” until observed accepted-quality baseline/assisted measurements exist. No generated test data or 0–4 maturity score is presented as impact proof.
