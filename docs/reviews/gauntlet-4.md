# Gauntlet 4 — operating continuity and defensible value

23 October 2026. Independent fourth model review, candidate `0766518`. This is a model applying a demanding client-facing banker lens, not a qualified human banker observation. Read AGENTS.md, all three prior raw reviews and docs/CLIENT_WORKFLOW_EVALUATION.md. Inspected engagement, evaluation, finance, lineage, client decision, work-plan, materials and review implementations. Used a new owned T3 tab, `tab_v_536cdade-d4a4-4f0b-b850-fdf8f7f56a3f`, after status/open with `reuseExistingTab:false`. Observed the actual 4173 Decision and leverage evidence drawer, plus isolated 4175 acquisition Materials, Scenarios and Evaluation. Executed two bounded synthetic review/work-plan transition tests against disposable public-data QA room `721ee83d-bfda-471b-9546-230ead8d35bb`. No owner-room mutations, application edits, provider/model/voice connections or human timing observations. Only this review file was written. Existing reported Rust/build/integration successes were not independently rerun.

**Verdict:** A credible bounded preparation workroom is emerging. The explicit client action, complete qualifications, funding-gap comparison, exact-input drawer and immutable review bundle materially reduce reconstruction work. The remaining concern is that the operational state can contradict itself: a frozen review can coexist with an expressly blocked local deliverable, and a deferral can silently retain an obsolete basis. Repair those transitions before treating the review copy as the endpoint of the local preparation job. Both 10× staff productivity and 5× client impact remain unproven.

Scale: 0 absent; 1 static; 2 functional; 3 evaluated; 4 banker-validated. Technical tests and model critiques establish defect-finding evidence, not accepted-quality human task performance.

| Dimension | Score | Assessment |
|---|---:|---|
| Client framing | 2 | Actual question, alternatives, conditions and selected action are linked; changed funding need requires a separate engagement |
| Workflow | 2 | Controlled recalculation and review transitions work; local blocked tasks do not gate freezing |
| Financial trust | 2 | Exact input/accountability drawer is useful; workings still contradict repaired percentage conventions |
| Artifact/review | 2 | Complete visible action and preserved copies; stale deferral basis and local task inconsistency remain |
| Operating model | 2 | Responsible people and acceptance criteria persist; no human evaluation of coordination/review burden |
| Measurement | 2 | Runnable observation contract with sensible arithmetic gates; no actual paired banker observations |

## Prioritized findings

### 1. High — Freezing bypasses an explicitly blocked local preparation task

**Executed evidence:** On QA bond room, set the materials task to `blocked` with acceptance “Synthetic: mandatory local correction before discussion-copy delivery” and rationale “Synthetic test: required material correction remains unresolved.” Then submitted the three freeze declarations. The actual binary accepted copy `e0ad2efd-9f41-4969-b0da-dce3ddf77d08`, while materials remained blocked. The fixture reviewer is explicitly “Automated fixture, not human reviewer.” This is a state-machine test, not evidence of actual senior review. `src/engagement.rs:848–885` validates document, advice, declarations and issues, but does not inspect local work-plan prerequisites; it then marks review complete.

**Consequence:** One team member can record an unresolved mandatory local correction in the work plan, while another completes the review endpoint without resolving or explicitly accepting it. The permanent commercial blocker is appropriately excluded from local completion; this finding concerns a separate local preparation blocker.

**Minimum fix:** Gate a frozen discussion review on required local prerequisite tasks being complete or explicitly deferred for that copy, with a reason visible in its qualifications. Keep the permanent external commercial gate separate. If the product instead permits a partial reviewed checkpoint, label it as partial and retain review incomplete.

**Acceptance:** Block materials or evidence after preparation, then attempt freeze. It must refuse or produce an explicitly partial checkpoint, without marking review complete. Complete/defer the specific local obligation and freeze successfully; commercial execution remains blocked.

### 2. Medium — Deferred issues retain obsolete deferral explanations after related substantive changes

**Executed evidence:** Added a story issue on QA page `decision`, deferred it with “Synthetic old-condition deferral, valid for the original primary financing rationale only,” then changed preference to status quo and replaced rationale and reversal conditions. Actual result: `status: deferred`, no `reopenedAtRevision`. The subsequent freeze in finding 1 accepted it. `src/engagement.rs:95–109` reopens only `verified` and `applied`; semantic action/brief/economic changes cannot revisit deferred issues.

**Consequence:** Explicitly accepting a risk once should not mean accepting a changed risk indefinitely. A deferral conditional on the original structure can become detached from the actual client argument, yet still satisfy the freeze gate. A global narrative declaration does not explain that specific changed exception.

**Minimum fix:** Reopen affected deferred issues when their anchored semantic content changes, preserving the prior deferral and reason. Alternatively require a current-revision reaffirmation of the deferral before freeze. Unrelated source/design deferrals should remain unchanged.

**Acceptance:** Defer a decision issue with a structure-specific basis, change that structure or rationale, and verify it requires renewed disposition. Preserve old deferral provenance in historical and frozen records.

### 3. Medium — Correct lineage formulas coexist with incorrect formulas in the actual calculation inspection

**Observed evidence:** QA acquisition Scenarios → “Inspect the calculation” visibly displays `… × (1 − tax)` for pro forma common earnings, although the tax editor uses percent. `src/finance.rs:237` supplies this string, while the numerical calculation at `:217–218` correctly uses `/100`. Bond workings at `:183` still display `(1 + yield/2)^t` despite a percent yield input and omit definitions of N and periodic coupon. `frontend/src/ClientStudio.tsx:591–603` renders those workings directly; legacy workings CSV also uses them (`AgentStudio.tsx:1534–1536`). The repaired lineage drawer is not the only reviewer surface.

**Consequence:** The reviewer gets different conventions depending on entry point. Copying the explicit inspection table can produce a different result from the engine and the evidence drawer. This is residual display inconsistency from round 3, not evidence that numerical PV or EPS is incorrect.

**Minimum fix:** Use consistent, dimensionally explicit formula definitions for both workings and lineage, including percent/bps conversion, half-year coupon/rate and N. Prefer one source for those descriptions.

**Acceptance:** Inspect bond and acquisition through Scenarios, key-number drawer and exported workings. All surfaces reproduce the same outputs from displayed inputs without inferred unit conversions.

### 4. Medium — “Exact public source” still requires the reviewer to locate the original fact manually

**Observed evidence:** In the actual main-room 2.71× leverage drawer, debt, cash, operating income and D&A all link to the same SEC accession directory, `https://www.sec.gov/Archives/edgar/data/77476/000007747626000007/`. The drawer helpfully shows numeric inputs and periods, but labels them as `PEP debt`, etc. `src/lineage.rs:24` retains XBRL `tag` and `accession`; `frontend/src/ClientReview.tsx:589–627` does not display either. Evidence tab likewise supplies filing links without fact context (`ClientStudio.tsx:1336–1358`). This is local link-target/UI inspection; the external filing contents were not independently verified in this pass.

**Consequence:** Calculation reconstruction is much easier, but source verification still involves opening a directory, choosing a document and finding the right definition/context. Staff can check arithmetic while missing that the selected reported tag does not match the intended banking definition.

**Minimum fix:** Expose the exact retained tag, accession and context/period in the drawer, and provide a primary-document or fact/context destination when available. Label a directory link as a filing directory. Include the selected fact definition in the trace rather than only its internal hash.

**Acceptance:** A reviewer starting from leverage can identify the precise source tag, period, units and original filing document for each input without searching a JSON bundle or choosing among unrelated accession files.

### 5. Medium — “Export all” omits earlier measurement records and the visible summary hides its window

**Code evidence:** `src/evaluation.rs:164` returns only the latest 100 observations and computes entered pair count and median from that window. It exposes an `observationWindow` string, but `ClientEvaluation.tsx` does not render it. The button at `:485–490` says “Export all entered observations and quality failures” and serializes only the loaded response. Older failures remain in SQLite but have no pagination/retrieval path in this interface. Similarly, copy discovery is limited to 50 without a continuation (`engagement.rs:933`), although individual known IDs remain fetchable. No 101-row human dataset was invented to reproduce this; this is a direct query/UI contract finding.

**Consequence:** A sustained evaluation can silently lose early failures from an export presented as complete. A reviewer may mistake a recent-window median/count for the full experiment. Honest “unproven” labels do not repair incomplete denominator evidence.

**Minimum fix:** Render the observation window and total stored count; distinguish window statistics from experiment statistics. Provide bounded pagination plus a complete streaming/paged export that includes failures, or accurately label the limited export. Make older review copies discoverable as well.

**Acceptance:** With 101 synthetic entries, an early failed-quality row remains retrievable and included in the complete export, while the UI explicitly distinguishes recent and full counts. Keep synthetic fixtures separate from human evidence.

### 6. Medium — A routine change to the funding requirement breaks engagement continuity

**Code/UI evidence:** `BriefUpdate` (`engagement.rs:565–572`) has no funding-need field, and the brief editor explicitly instructs staff to start new client work to change the structured net-funding requirement (`ClientPlan.tsx:205–210`). The question can be changed to USD600m while the structured requirement, gap and size-to-target logic remain USD500m. The UI does disclose the limitation; this is an operating limitation, not a hidden financial engine error.

**Consequence:** “Our funding requirement is now 600” is a normal CFO revision. Starting another room loses a single continuous task/review thread and requires reconstruction of assigned work, authored content and judgements. Editing just the question can create conflicting instructions and figures inside one artifact.

**Minimum fix:** Permit a typed amendment of the funding requirement for the same issuer/method. Preserve prior copies; refresh gap lineage and dependent comparison pages, invalidate the conditional view and relevant dispositions, and require deliberate resizing rather than silently changing notional. At minimum prevent inconsistent question edits with a prominent structured-requirement confirmation.

**Acceptance:** Amend 500 to 600 in the same room. Both structures retain their prior results, current gaps show the new need, advice reopens, and sizing one structure to 600 preserves the other and all previous frozen copies.

## Value evidence and what to preserve

The actual main Decision clearly distinguishes 500.0 net proceeds from the alternative's 1.0 funding gap, current proxy leverage from post-use leverage, coupon from yield, and three-year from five-year refinancing. The drawer supplies exact values and source periods. QA Materials visibly identify the selected alternative; complete conditions have their own pages. These are meaningful reductions in manual reconciliation for the bounded job.

The actual Evaluation screen contains zero observations, correctly calls both multipliers unproven, separates elapsed from aggregate all-staff effort, includes setup/review/rework, suppresses unsupported denominator ratios, and warns that reviewer identities/acceptance are unverified. Preserve those rules. They are sufficient for an honest local observation log, not for claiming that a general productivity or client-value target has been demonstrated. Before any business claim, use real paired tasks, retain baseline and assisted work products plus acceptance evidence, report failures and distribution, and document which client questions were correctly resolved. Synthetic QA copies and the two tests above contribute no human outcome evidence.

The deferred model/data/voice ports, full Office exports and bank deployment/authority controls are existing exclusions, not new defects discovered here. This pass does not establish bank acceptance, autonomous planning or investment advice suitability.
