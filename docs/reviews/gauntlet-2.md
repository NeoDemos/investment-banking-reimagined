# Gauntlet 2 — CFO decisions, staff leverage and client utility

23 October 2026. Independent second pass against the current uncommitted tree and rebuilt localhost:4173 application. Read AGENTS.md and gauntlet-1.md. Used a new owned T3 tab `tab_s_536cdade-d4a4-4f0b-b850-fdf8f7f56a3f`, opening client workroom `744eaaeb-fb8c-4b7b-b30e-7e50449533cd`; observed Decision, Materials, Work plan and Review. Inspected ClientStudio.tsx, engagement.rs, finance.rs and workflow.rs. No application edits, financial-record mutations, external providers or models. Technical test results supplied by the implementing agent were not independently rerun in this pass.

**Verdict:** Meaningful improvement: this now opens as a bounded client decision workroom, with real editable economics and honest limits. It is still a preparation scaffold rather than a demonstrated senior-banker substitute. The next work should make choices economically comparable and propagate the actual banker judgement into the client discussion, then complete review and measurement. A faster calculation is not evidence of 10x staff productivity or 5x client impact.

Scale: 0 absent; 1 static; 2 bounded functional; 3 evaluated; 4 banker-validated.

| Dimension | Score | Evidence |
|---|---:|---|
| Client framing | 2 | Persisted question, criteria, owner/audience, meeting and conditional judgement; no operational constraint tests |
| Workflow | 2 | Assumption approval and scoped recalculation are implemented; plan is inspectable but not assignable/editable |
| Financial trust | 2 | Explicit scenario terms, workings and dated archive; no key-number drilldown and decision relevance incomplete |
| Artifact/review | 1 | Linked pages exist, but primary journey has no edit/review lifecycle and advice is disconnected from materials |
| Operating model | 1 | Role labels and blocked commercial gate; no responsible-person/issue handling or reviewed deliverable contract |
| Measurement | 1 | Honest target wording; no recorded accepted-quality paired observation |

## Seven priorities

### 1. High — Funding alternatives do not establish whether the funding need is met

**Evidence:** Actual Decision asks how to fund USD500m, but offers USD498.6m and USD499.0m net proceeds, identical USD31.3m annual coupon and 2.71x leverage. It gives no shortfall or constraint result. `ClientStudio.tsx:18,39` chooses these three columns; `engagement.rs:90–104` changes tenor only. `finance.rs:171–183` correctly treats amount as notional, while the client question treats USD500m as the requirement. Coupon cost is not the all-in financing cost; the comparison omits modeled yield, fees and refinancing horizon despite tenor being the distinguishing choice.

**Consequence:** A CFO can prefer the superficially cheaper option without seeing that neither meets the stated net cash requirement. Staff still reconstruct the financing tradeoff outside the workroom.

**Minimum fix:** Persist required net proceeds separately from notional; show shortfall/surplus and allow deterministic sizing to that target. Add issue yield, upfront fees and maturity/refinancing horizon alongside coupon, with explicit deployment/refinancing assumptions. Do not imply a live executable price.

**Acceptance:** A USD500m net need flags both present cases as underfunded; sizing produces net USD500m within stated tolerance, independently recomputed. At equal required proceeds the comparison explains why the three-year/five-year choice matters and never labels coupon as all-in cost.

### 2. High — Decision alternatives and downside states are conflated

**Evidence:** `engagement.rs:90–114` defines acquisition alternative solely by zeroing synergies and names it “No-synergy downside.” The same `options` collection drives working preference (`ClientStudio.tsx:39`) and `decision` accepts either option (`engagement.rs:317–332`). Thus the banker can choose a no-synergy state as if it were a separate executable course of action. Buyback uses half-size spend, a legitimate action, while bond uses alternate tenor; the semantic contract varies by workflow.

**Consequence:** The apparent three-way decision is stronger than the underlying investment case. A CFO needs to decide acquire/defer or change price/funding, then understand each action under adverse outcomes. Choosing lower synergies is not a management action.

**Minimum fix:** Distinguish action/structure from scenario state. At minimum explicitly label the no-synergy result a stress of the primary acquisition and exclude it from selectable actions. Prefer an editable alternative consideration/funding action with base/downside views; keep defer explicit and disclose unsupported strategic/value questions.

**Acceptance:** The acquisition preference cannot select an adverse state as an action. The same acquisition can be challenged at zero synergies without changing its action identity; a genuinely different price/funding action can be compared on like-for-like assumptions.

### 3. High — The banker’s decision does not become the client artifact

**Evidence:** Actual Materials page 1 remains “Frame the financing decision” with generic instructions and base-case metrics; no recorded question, decision criteria, preference or reversal condition. `engagement.rs:234–238` builds the generic storyboard; `decision:325–334` only updates mandate. `workflow.rs:130–163` does not consume the mandate. `ClientStudio.tsx:50` exposes navigation only in Materials; previous primary text/layout edits have disappeared. Recalculation sets `review_required` (`engagement.rs:293`), but the hero maps every nonconditional state to “Insufficient evidence for execution” (`ClientStudio.tsx:39`), obscuring the reason advice requires re-review.

**Consequence:** The banker must manually rebuild the actual advisory argument elsewhere. The screen may display a saved conditional view while the client pages still present an unrelated generic opening.

**Minimum fix:** Bind a decision-summary page to the mandate, active action IDs, rationale and reversal conditions; distinguish unrecorded, conditional and invalidated views. Restore bounded headline/body/layout edits with clear linked versus authored text. On economic change prominently flag affected advice/pages and require confirmation before review completion.

**Acceptance:** Save a conditional view and see it, criteria and reversal condition on the first client page after reload. Recalculate its economics: the old view is visibly invalidated in both Decision and Materials; authored text is retained and flagged for review. No model is needed.

### 4. High — Review must freeze the exact advisory state, not only page calculations

**Evidence:** Actual Review has only a paragraph. `ClientStudio.tsx:50` sends discussion notes to deferred capture, with no applied/verified issue lifecycle. `workflow.rs:39` history snapshots retain draft/scene/sources/analyses/context but omit mandate, work items, issues and conditional judgement. `engagement.rs:5–6` creates review-copy/evaluation tables but does not implement that journey. Complete-room JSON download is useful inspection, not a named, immutable reviewed copy.

**Consequence:** A VP cannot establish exactly which advice, assumptions and unresolved qualifications accompanied the reviewed client copy. A later room state cannot repair omitted historical judgement.

**Minimum fix:** Persist issues with anchor, owner, status and applied revision; require verification of concrete changes. Freeze a complete immutable payload including mandate, option mappings, assumption rationale, document, sources and issues. Keep deferred free-text notes explicitly unapplied and never equate reviewed rehearsal with execution approval.

**Acceptance:** Note survives reload; correction links to the changed revision; separate verification closes it. Freeze, change preferred action and economics, then reopen the frozen copy: its original judgement, figures, assumptions and issues are unchanged. The frozen copy still exposes the commercial blocker.

### 5. High — Key-number accountability is still too expensive for a senior reviewer

**Evidence:** Comparison cells are plain formatted values (`ClientStudio.tsx:39`), while workings show formula strings (`:35`) and Evidence separately lists facts (`:50`). Neither provides the exact dependency chain from 2.71x to source-period debt/cash/operating income/D&A, new notional, deployment assumption and proxy definition. Initial rationale is shared across both cases (`engagement.rs:230`); no per-input owner/range appears in the decision view. This confirms rather than resolves gauntlet-1's lineage finding.

**Consequence:** The associate must reconcile tabs or raw JSON to substantiate the number in a CFO meeting. Dated facts and illustrative judgement are still too easy to conflate.

**Minimum fix:** Click-to-inspect key outputs with exact numeric inputs, units, source IDs/dates, formula/version, source-versus-assumption classification and rationale. Show a clear range or “not assessed” for judgement inputs; do not manufacture confidence.

**Acceptance:** From a comparison cell a reviewer independently reconstructs leverage and net proceeds without reading unrelated facts. The assumed spread clearly has no market-source claim; changing it updates only the relevant dependency chain and active case.

### 6. Medium — The plan organizes output, but does not yet delegate accountable work

**Evidence:** Actual Work plan shows fixed role owners, raw dependency IDs and completed workflow tasks. There are no edit controls. `engagement.rs:40–48` hardcodes the list; `:241` marks analytical/material tasks complete automatically. `Brief` has no update journey. Work plan says review acceptance includes an exact copy even though that capability is absent. Permanent commercial blocking is appropriate under deferred APIs, but is not a substitute for assigning the remaining local work.

**Consequence:** Staff still coordinate who checks funding purpose, challenges sources and resolves client questions outside the tool. Changing the mandate can require a new room, impairing continuity.

**Minimum fix:** Editable brief and task owner/acceptance/status, with meaningful dependency labels and logged revisions. Keep commercial execution blocked; permit assigned local research/review subtasks and reasons for deferral. Change scope should explicitly invalidate affected work rather than silently preserve completion.

**Acceptance:** Assign a reviewer, amend a criterion and reload. Owner and audit history persist; relevant review work reopens; the fixed external-market blocker remains. Completed local preparation never becomes execution approval.

### 7. High — Measurement needs an observation contract before any multiplier

**Evidence:** Evaluation is accurate explanatory copy (`ClientStudio.tsx:50`), not a runnable measurement log. No paired banker observations were presented. Existing model/protocol tests, restart checks and millisecond generation are engineering evidence only.

**Consequence:** Neither 10x nor 5x is defensible, and the team cannot tell whether the new workroom removes analyst effort or simply relocates it to review and manual presentation repair.

**Minimum fix:** Record paired, equal-scope baseline and assisted tasks from brief through independent acceptance. Use the same public evidence snapshot, requirements and quality threshold; counterbalance order or use matched cases, disclose familiarity and setup costs. Log active research/calculation/material/review/rework time, elapsed time, defects and missing conditions. Have a blinded senior reviewer accept both before computing productivity = accepted baseline staff-hours / accepted assisted staff-hours. Report per-case and distribution, not only best run; unfinished or lower-quality outputs cannot count as speed wins.

For client impact define a meaningful outcome with a denominator: for example proportion of material, pre-specified CFO questions correctly resolved with evidence and actionable conditions during a fixed-time simulated meeting. Count the questions and verified resolutions; disclose ceiling effects and uncertainty. A ratio of ordinal scores is invalid. Real economic impact needs subsequent client/outcome validation and must remain unproven here.

**Acceptance:** UI stores one complete real paired observation, reviewer acceptance and all review/rework components; missing denominator or failed quality gate suppresses the multiplier. A 5x claim requires a predefined outcome ratio supported by observations, not synthetic logs or maturity ratings. Current status remains “unproven.”

## What is already worth preserving

The first screen now lets a banker recognize the client question without execution logs. Alternatives use the same snapshot; scenario changes retain old calculations; server commits check revision conflicts. The explicit local/deterministic and historical-data boundary, illustrative-input confirmation and persistent commercial blocker are appropriate. These are sound foundations for the next local demonstration, not evidence of provider capability, bank acceptance or productivity multipliers.
