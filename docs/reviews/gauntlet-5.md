# Gauntlet 5 — final independent candidate review

23 October 2026. Reviewed candidate `e8b2f991320b088bb2efe3b7a660d94d7188fe39` and its actual embedded UI. This is a fresh model applying a demanding client-facing investment-banker lens, not a qualified human banker observation. Read AGENTS.md, gauntlet 1–4, CLIENT_WORKROOM_ARCHITECTURE.md, CLIENT_WORKFLOW_EVALUATION.md and PEER_ARCHITECTURE_RESEARCH.md. Inspected financial, lineage, engagement, review, document, evaluation and React state paths. Used preview status followed by a new owned tab with `reuseExistingTab:false`, `tab_x_536cdade-d4a4-4f0b-b850-fdf8f7f56a3f`. Inspected the actual 4173 owner room read-only and disposable 4175 bond/acquisition/buyback UI. Only this report was written; no owner-room or QA-record changes, external model/data/voice connections, keys, commits or human timing observations.

The parent began implementing the reported defects while this review was being written. Findings below describe the reviewed candidate/served UI, and are deliberately retained. They are not assertions that the parent's later fixes passed verification.

**Verdict:** This has become a credible bounded public-data preparation workroom, with meaningful financial and review controls. It is suitable for a candid local demonstration after the defects below are corrected and retested. It does not establish 10× staff productivity or 5× client impact. Those remain hypotheses. The most important remaining failure is an upgrade continuity problem: the existing demonstration engagement displays an incomplete advisory argument under the new renderer even though fresh fixtures are correct. Two further executed UI paths lose the user's intended context or unsaved work. I would not sign off the reviewed candidate for a client-facing rehearsal without repairing them.

Scale: 0 absent; 1 static; 2 functional; 3 evaluated in real accepted-quality human workflow use; 4 banker-validated. These ordinal scores cannot be converted into productivity or impact ratios.

| Dimension | Score | Assessment |
|---|---:|---|
| Client framing | 2 | Question, criteria, conditional action and constraints are real saved objects; complete presentation works in fresh rooms, but the existing room is not upgraded |
| Workflow | 2 | Controlled sizing, requirement amendments, accountable tasks and revision checks work; rapid client switching can select stale context |
| Financial trust | 2 | Exact input definitions and reproducible bond arithmetic; narrow proxy methods and illustrative terms remain explicit |
| Artifact/review | 2 | Strong immutable-copy and issue controls; existing document migration and unsaved page edits remain defective |
| Operating model | 2 | Local preparation gates and permanent commercial blocker are distinct; self-attested people/review are not authenticated bank authority |
| Measurement | 2 | Runnable paired observation and complete pagination contract; no real human accepted-quality observations |

## Executed evidence that materially improves the case

I independently reran `python3 scripts/verify_client_controls.py` against its fresh temporary database and the actual release binary. All five groups passed. The harness disables external connections and uses explicit synthetic records. It demonstrated: blocked local evidence/material/review tasks prevent freezing and survive later commits; affected deferred story issues reopen while an unchanged source issue remains scoped; a confirmed USD500m→600m amendment preserves old sources/models/copies, refreshes gaps without resizing, and deliberately sizes only one action; workings and lineage agree on percent/bps conventions and retained debt components; fixed-snapshot pagination retrieves all 101 observations including the oldest failure and all 53 copies, excluding a later insert. These are technical control observations, not banker acceptance or productivity measurements.

Using a separate read-only Python calculation, I reconstructed both actual owner-room bond prices and net proceeds from the retained curve and scenario inputs, without calling the application's pricing function. Primary notional USD501.4432999178703m produces USD500.0m net; alternative notional USD500m produces USD498.986277534821m net, matching the engine to floating-point precision. The actual Decision screen exposes the corresponding zero/approximately USD1m funding gaps, post-use leverage, tenor, yield, upfront fees and coupon distinction. This supports the bounded regular semiannual illustration; it does not establish executable pricing, an all-in financing recommendation or credit capacity.

The actual net-proceeds drawer shows the complete half-year pricing conventions, exact illustrative parameters and 4.95% dated Treasury reference. Assumptions explicitly make no market-source claim. Read-only inspection of both acquisition stresses confirmed zero synergies, debt funding of 60% and 40% respectively, and every other term matching its own action. I found no numerical error in these checks. I did not independently verify the underlying external SEC filings or repeat the full reported Rust/MCP/API suite.

## Prioritized remaining findings

### 1. High — Existing engagements are rendered with an incomplete new advisory contract

**Executed reproduction:** Open the supplied owner room `0af3e285-21b4-41d9-9c0e-b4058ed6c56a` on the actual 4173 build, without making a change. It remains at revision 4 with seven pages and no `mandate.documentContract`. Its first page contains only `client_decision`; there are no `client_view` or `client_conditions` pages. The new renderer displays only the question and selected action on that block. The saved recommendation and reversal condition are therefore absent from all these client pages. Actual comparison page 5 still consists of two generic metrics blocks: it shows existing 2.68× leverage, proceeds/yield/coupon, and omits required funding, gaps, status quo and post-use leverage. Decision correctly shows the fuller economics.

**Code explanation:** Candidate `AgentStudio.tsx:178` expects three distinct semantic blocks. `engagement.rs:110–166` can upgrade a draft during certain subsequent mutations, but `engagement::init` migrates historical storage only; an ordinary room read does not upgrade or reject this older active document. Fresh 4175 rooms have the new nine-page structure and work correctly. Fresh-fixture success does not repair saved work already used for the demonstration.

**Banker consequence:** The client discussion loses the qualification that makes the recommendation defensible and presents a weaker comparison than the banker reviewed. This is a substantive cross-artifact regression, not merely an old title or cosmetic mismatch. Requiring staff to happen to save another edit before presenting is an unreliable recovery step.

**Minimum fix:** Version active engagement/document contracts and migrate existing active drafts before they can be presented, preserving authored content, exact old revisions and frozen copies. Record the migration as a new revision with review required. If migration cannot safely reconcile a conflicting page or oversized summary, block presentation with a specific repair action rather than rendering incomplete advice. Do not rewrite immutable reviewed history to make it look current.

**Acceptance:** Load an unmodified pre-upgrade engagement after restart. Its active document visibly includes the complete chosen action, rationale, constraints/reversal conditions and current semantic comparison, or explicitly refuses presentation pending repair. Sources, prior models and frozen-copy bytes remain unchanged. The actual owner demonstration room must be checked, alongside a fresh room.

### 2. Medium — A late sidebar room response overrides the banker's newer selection

**Executed reproduction:** In my own 4175 tab, temporarily held the first room GET response in the browser, with no server writes. Clicked acquisition room `7f91d4f6-bd7e-4111-a05d-380364febc1f`, then buyback room `a4c1ec80-2c6c-425a-8675-469aaa8f2d61`. The buyback hash and selected sidebar item appeared correctly. Releasing the earlier acquisition response changed both the hash and selected room back to acquisition. Restored the original browser fetch immediately afterwards. The delay is an explicit synthetic ordering test, not a claim that normal local requests took that long.

**Code explanation:** Candidate `ClientStudio.tsx:985–989` unconditionally commits the result of `open()` and navigates. The newer hash/action guards do not guard this separate sidebar entry path.

**Banker consequence:** Context can change after the banker has selected the next assignment, encouraging comments, scenario edits or review in the wrong workroom. The UI does display the resulting room; this test did not demonstrate a hidden cross-room database write. It nevertheless creates avoidable context risk and rework.

**Minimum fix:** Give every room-opening intent a monotonically increasing navigation generation or equivalent cancellation guard. Invalidate pending opens on newer sidebar selections, hash navigation, new work and platform navigation. Ignore stale successes and stale errors.

**Acceptance:** Repeat the held-response test in both completion orders. The last selected room remains selected, including its hash, header and draft. Navigating to another surface while a read is pending must not be undone by that read.

### 3. Medium — Source checking discards an unsaved authored page correction

**Executed reproduction:** In disposable acquisition Materials, chose “Edit authored text” and replaced “Page headline” with a clearly synthetic unsaved marker. Navigated to Evidence and back to Materials. Reopening the editor showed the original saved headline; there was no discard warning. No save or database mutation was performed.

**Code explanation:** Candidate `ClientMaterials.tsx` stores editor visibility, title and prose in component-local state and resets editing on page/room movement. Unlike the newly buffered decision/scenario/discussion/review-note paths, authored materials edits have no revision/page-scoped buffer.

**Banker consequence:** A normal fact-check during revision loses the correction the associate was constructing. This works directly against the claimed reduction in review/rework and encourages staff to finish narrative without checking its evidence.

**Minimum fix:** Preserve authored edits in a room/revision/page-scoped buffer with explicit save/cancel behavior, or require an explicit discard before losing them. Keep stale buffers visibly separate after a committed financial revision.

**Acceptance:** Type an unsaved title and narrative; inspect Evidence or a source drawer, another page and another room, then return. The correct page's edit survives without leaking into another page/room. Saving clears its buffer; cancel explicitly discards it; new committed revisions cannot silently submit stale text over newer content.

### 4. Low — The alternative acquisition stress is described as following the primary action

**Observed evidence:** Actual acquisition Decision says “all other terms follow the primary action” under both stresses, including “Alternative funding · no-synergy stress.” Their displayed EPS differs ($6.01 versus $6.03), and read-only parameters confirm the alternative correctly uses its own 40% debt funding while primary uses 60%. Candidate `ClientStudio.tsx:828–829` hardcodes the misleading sentence.

**Consequence:** The control is financially correct, but its explanation undermines confidence in which funding action was stressed.

**Minimum fix / acceptance:** Resolve the named action from each stress's `actionId`. Revise only alternative debt funding; its caption, stress parameters and result must identify that alternative, while primary remains unchanged.

## What the business claim still needs

There is a plausible mechanism for saving staff effort in this narrow job: no re-keying the public archive, automatic recalculation of a named action, linked client figures, explicit shortfalls, exact-number inspection, scoped review reopening and immutable delivery records. That is a reason to test the product. It is not evidence of a tenfold end-to-end gain. Research selection, financial interpretation, market/execution assessment, narrative judgement and qualified checking still consume staff time; several remain deliberately manual or outside this phase. I cannot estimate the net gain honestly from backend latency or model critique.

Run real paired tasks through accepted delivery, using the written protocol. Include a coverage banker, preparer and independent qualified reviewer; record all their active minutes, elapsed time, setup, checking and rework. Use matched public cases and counterbalanced order. Include a funding-need amendment, a challenge to an exact source definition, a changed assumption after an issue was deferred, complete client qualifications and recovery of an older reviewed copy. Preserve baseline and assisted work products and failed attempts. Reviewers should check material numbers, definitions, assumptions, alternatives/downside, response to the actual brief and presentation usability before any time ratio qualifies. Report each pair and its dispersion; do not generalize from a best run.

For the 5× hypothesis, predefine distinct CFO questions and have a qualified reviewer judge which were correctly answered with substantiated choices and conditions in an equal meeting opportunity. The current coverage ratio can be an explicitly limited discussion-utility proxy; its ceiling and baseline denominator matter. It is not a ratio of ordinal scores, realized economic benefit or proof of fivefold client impact. Actual client usefulness and financial outcomes require subsequent client evidence and a credible attribution design.

The review copy is an exact saved local record with self-attested declarations, not authenticated independent sign-off. No qualified human acceptance, real productivity observation, autonomous conversation execution, current provider capability, bank deployment approval or bank compliance was established by this review. The owner-deferred model/data/voice/Office/native connections remain scope boundaries; they do not excuse the existing-room presentation, context and lost-edit defects above.
