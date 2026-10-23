# Gauntlet 3 — CFO decision, credible economics and net staff effort

23 October 2026. Independent third model review of the current uncommitted implementation. Read AGENTS.md, both prior raw reviews and CLIENT_WORKFLOW_EVALUATION.md. Inspected ClientStudio/ClientReview/ClientPlan/ClientMaterials, engagement.rs, lineage.rs, workflow.rs, materials.rs, evidence.rs and relevant financial/rendering code. Opened a separate T3 tab with reuseExistingTab:false (`tab_t_536cdade-d4a4-4f0b-b850-fdf8f7f56a3f`) and inspected the rebuilt app's supplied PepsiCo room, Decision and Materials pages 1 and 5. No application edits, owner-room writes, model/data/voice calls or external sources. UI observations below are actual; mutation-path findings are code inspection, not claimed executed reproductions. Existing technical integration results were not independently rerun.

**Verdict:** A useful bounded preparation workroom now exists. The funding gap, issue sizing, exact input drawers and immutable full-room copy materially improve the foundation. It still loses important decision semantics between the workroom and the client pages, and review state can remain falsely closed after related changes. Fix those before relying on a frozen copy as evidence of completed substantive review. No banker-validated 10x staff productivity or 5x client impact has been established.

Scale: 0 absent; 1 static; 2 functional; 3 evaluated; 4 actual banker-validated. Engineering tests and independent model critiques do not by themselves establish level 3 banker workflow performance.

| Dimension | Score | Assessment |
|---|---:|---|
| Client framing | 2 | Question, criteria, conditions and action selection persist; the client artifact omits the selected action |
| Workflow | 2 | Scoped deterministic revisions and sizing work paths exist; semantic review invalidation is incomplete |
| Financial trust | 2 | Exact sourced observations and scenario inputs inspectable; displayed formula conventions need repair |
| Artifact/review | 2 | Editable pages and immutable complete copies exist; stale issue closure and incomplete client summaries remain |
| Operating model | 2 | Responsible people, acceptance criteria and persistent commercial blocker; no human evaluation of net effort |
| Measurement | 1 | Defensible written observation protocol, honest unproven status; no actual paired banker observations |

## Prioritized findings

### 1. High — Related changes do not reliably reopen substantive review issues

**Evidence:** `engagement.rs:333` reopens only verified issues whose page is in the recalculation's explicit `analysisId` affected list. The first `client_decision` page has no analysisId, so an issue on the conditional advice is outside that list even though recalculation invalidates the advice. `decision` (`:349–380`) changes the semantic first page without a changeLog entry or reopening its verified issues. `update_brief` (`:396–447`) records the first page but does not reopen its verified issues. `workflow.rs:109–143` and `agent.rs:618–640` record document changes without reopening issues on those pages. An applied correction also remains applied if its page changes again. Freeze checks only current open/applied statuses and global declarations (`engagement.rs:652–689`).

**Consequence:** A story or source issue can retain a verified badge after its actual content changes. A fresh freeze can carry that stale closed issue into an immutable bundle. Immutability preserves the error in review provenance rather than establishing the new content was checked.

**Minimum fix:** Centralize semantic affected-page calculation for economic, brief, decision and document changes. Include the decision page when its underlying action/economics change. Reopen affected verified issues and invalidate applied links when intervening relevant changes supersede them; record the reason and prior verification. Require current verification or explicit deferral before freeze.

**Acceptance:** Verify issues on a first-page recommendation and a financial page; separately change the preferred action, brief, financial inputs and authored page text. Each relevant issue reopens; unrelated issues remain unchanged. A previously applied correction cannot silently survive a later superseding edit as current. Freeze rejects until the current state is checked or explicitly deferred.

### 2. High — The visible client advice omits the chosen action and truncates its conditions

**Evidence:** `AgentStudio.tsx:162–168` renders the saved question, criteria, recommendation and reversalCondition but never `preferredOption` or its action name. It truncates question/criteria/rationale/reversal at 300/220/240/220 characters with an ellipsis. Server allowances are respectively 2000/1500/2000/1500 characters. The same Page renderer is used for presentation and the frozen-copy inspector (`ClientReview.tsx`). The first page observed in the actual UI is the semantic decision block; its footer sends the reader back to the full workroom.

**Consequence:** A banker can save “alternative” and a valid rationale that does not repeat its name, yet the client page never says what is preferred. A material qualification at the end of the reversal condition can vanish in the actual presented and frozen page. A complete JSON archive does not make the client-facing argument complete.

**Minimum fix:** Bind and display the selected action explicitly, including defer/insufficient states. Make narrative overflow actionable: fit-aware continuation pages or a blocking preflight with editable summary and complete visible conditions. Do not silently shorten material advice.

**Acceptance:** Save an alternative preference with a rationale that does not name it and a qualifying reversal condition after character 220. Presentation and reopened frozen pages visibly identify the action and retain the complete qualification, or clearly block freezing pending a complete summary.

### 3. High — The financing comparison page omits the need/gap and shows existing leverage in place of decision leverage

**Evidence:** Actual Materials page 5 shows primary $498.6m, alternative $499.0m, annual coupon $31.3m each, and **Existing net debt / EBITDA proxy 2.68x** each. Actual Decision correctly shows the USD500m need, USD1.4m/USD1.0m shortfalls and **2.71x after proceeds deployed**. `engagement.rs:249` constructs the comparison as two generic metrics blocks; `AgentStudio.tsx` takes the first four model metrics, which include baseLeverage. Neither net requirement/gap, post-use leverage, status quo nor explicit tenor/refinancing horizon is in that comparison page.

**Consequence:** The CFO sees a substantially weaker and potentially misleading comparison than the banker reviewed on Decision. Existing leverage is labelled accurately but is the wrong figure for judging the incremental borrowing capacity. Staff must verbally repair the deck or use another screen, adding review and meeting effort.

**Minimum fix:** Use a semantic decision-comparison block driven by active option mappings and the same key outputs as Decision. Include required proceeds, residual gap, post-use leverage, coupon cost, fees and tenor, with explicit historical/proxy qualifications and status quo. Preserve the important yield/coupon distinction.

**Acceptance:** The supplied underfunded case visibly flags both gaps in presentation and frozen copy. After target sizing and a tenor revision, client pages match Decision on exact active calculations and distinguish existing versus post-use leverage without manual duplication.

### 4. Medium — “Exact calculation” formula strings omit required percentage conventions

**Evidence:** `lineage.rs:112` displays net proceeds as discounting at `(1 + yield/2)^t`, while the drawer's yield input is expressed in percent (6.20 in this case). It should convert percent to decimal before discounting. The same formula does not define coupon cash per period or number of periods. The acquisition EPS formula in lineage uses `(1 − tax)` while the actual input tax is a percentage; finance.rs correctly uses `/100`. The numerical engine uses the correct conversions, but the advertised formula is not directly reconstructable using the displayed units.

**Consequence:** A reviewer cannot literally recompute from the supposed exact trust chain without guessing conventions. This is a documentation/calculation-lineage defect, not evidence that the engine's computed bond price is wrong.

**Minimum fix:** State dimensionally explicit formulas, e.g. periodic rate = annual yield percent / 200, coupon per 100 per half-year = annual coupon percent / 2, N = 2 × tenor, with redemption only at N. Define percent conversion consistently for taxes and rates across all traces.

**Acceptance:** A reviewer copies only displayed numeric inputs and formula definitions into an independent calculator and reproduces net proceeds and acquisition EPS without undocumented conversions.

### 5. Medium — The second acquisition action has no corresponding adverse-state view

**Evidence:** `engagement.rs:255` creates a single no-synergy stress with `actionId:base`. `:326` recomputes it only when base changes. The alternative financing-mix action remains eligible for preference, but its different debt/cash interest burden is never evaluated at zero synergy. `ClientStudio` exposes no stress editor for the alternative; scenarios edit only the two actions. This is distinct from the prior fixed defect: stress is now correctly excluded from actionable choices.

**Consequence:** A CFO choosing the alternative funding mix cannot compare its downside resilience on the same basis. Using the primary stress for the alternative would silently use the wrong funding terms; staff must construct the omitted check separately.

**Minimum fix:** Provide a zero-synergy view for each actionable acquisition structure, identified by actionId and derived from that action's current parameters. Put base/downside pairs together in the decision and client comparison, with existing PPA/timing/value limitations retained.

**Acceptance:** Change only the alternative debt percentage. Its stress updates with zero synergies and matching funding terms; primary action/stress remain unchanged. Both actionable alternatives show comparable adverse-state EPS/leverage, and no stress becomes a selectable management action.

## What to preserve and what this establishes

The actual Decision screen now clearly flags underfunding, separates annual coupon from all-in cost, and distinguishes refinancing horizons. Source and assumption classification is much better than a generic citation list. Transactional immutable full-room copies, self-attested reviewer language, revision checks and the permanent external commercial blocker are appropriate for this authorized local public-data rehearsal. Keep them.

The next review should test the resulting visible client pages and review transitions, not add more architecture dashboards. The existing written evaluation protocol correctly includes all staff research, checking, senior review and rework; actual accepted-quality paired observations are still required to assess net productivity. A count-based discussion-utility proxy is not proof of realized client economic benefit. No multiplier, autonomous natural-language capability, provider capability or bank acceptance is established by this pass.
