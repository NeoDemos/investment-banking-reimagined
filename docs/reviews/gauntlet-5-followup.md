# Gauntlet 5 — bounded verification addendum

23 October 2026. Follow-up by the fifth reviewer against committed candidate `ed9a5e0e275b561b8f17701b78f8b0b5c5e57914`. This is verification of the four original repairs and the owner's subsequent conversation-led steering, not a sixth independent gauntlet or a replacement for the raw fifth report. `gauntlet-5.md` is unchanged. Original scores and the absence of human productivity/client validation remain unchanged.

Used preview status, closed only my former review tab to release capacity, and created a new owned tab with `reuseExistingTab:false`: `tab_z_536cdade-d4a4-4f0b-b850-fdf8f7f56a3f`. Performed read-only inspection on 4173 and UI-only synthetic navigation/edit-buffer checks on disposable 4175 rooms. Independently ran the isolated director contract harness with its explicit fake CLI. No real model request, external source refresh, owner-room write, review declaration, evaluation observation, application edit or commit was initiated. Only this addendum was written.

The parent began further repairs during this verification. The two residual findings below describe the served candidate before those repairs, and are preserved regardless of later resolution. Later fixes require their own stated targeted verification; they do not erase this evidence.

## Four original repairs

| Original finding | Independent verification | Result |
|---|---|---|
| Existing room has an incomplete document under the new renderer | Read the actual owner room `0af3e285-21b4-41d9-9c0e-b4058ed6c56a`: now revision 5, nine pages, `client-decision/2`, with `client_decision`, `client_view`, `client_conditions` and `decision_comparison`. Judgement is explicitly `review_required`. Archived revision 4 still has seven pages and its original preference. Compared retained sources and all models: unchanged. | Original supplied-room reproduction repaired; prior work preserved and review invalidated |
| Late sidebar response overrides a newer room selection | Repeated the original controlled response-order test on 4175: held the acquisition read, selected buyback, then released acquisition. Buyback remained selected with the buyback hash. Restored original browser fetch. | Original race reproduction repaired |
| Evidence navigation loses unsaved authored page edits | Entered an unsaved synthetic acquisition page headline, navigated Evidence → Materials. Editor remained open with the marker intact. Cancel then reopening restored the saved original headline. No save occurred. | Original lost-edit reproduction repaired; explicit discard works |
| Alternative acquisition stress says it follows primary | Actual Decision now says primary terms follow “Primary structure,” and alternative terms follow “Alternative funding mix.” Their distinct EPS outputs remain visible. | Caption repaired |

I independently reran `python3 scripts/verify_director.py`: all five groups passed. The isolated harness exercises fixed-source/registration boundaries, unsupported-plan clarification, plan → local MCP → Rust → typed document, invalid-prose and stale-turn rejection, and versioned migration preserving old document/source/model state with restart idempotence. It uses an **explicit fake CLI**, not a real model. It contributes control evidence only. The supplied-room comparison above independently checks the actual migrated owner state as well.

## Conversation-led flow observed

The actual main home is now a natural-language director assignment with three examples and the structured form collapsed under an inspection alternative. After its status request settles, the local agent is enabled. Storyline is the opening workroom surface, with a frame browser, source-pool inspection and secondary decision/model/review controls. This is a meaningful correction to the owner's rejection of forms as the primary product.

Inspected the completed actual main case `5877aef9-080b-4a65-9692-09784d9c36b3`, revision 4, and stored director run `4affc9e7-8c45-470f-8723-f4ce693d7a18`. It contains twelve model-composed pages with a proposed client synthesis, reported company/rate context, assumptions and financial alternatives, peer position, a sourced Rabobank proposition and sources. The stored provider is `codex_local`, model `gpt-6.1-sol`; the run is completed and records generated materials with human review “Not yet performed.” I did not initiate or independently repeat inference.

The proposed synthesis explains when longer tenor, shorter tenor or deferral might make sense; it does not impersonate a recorded banker preference. The actual proposition distinguishes public service descriptions and proposed relevance from an underwriting commitment, mandate record or competitive ranking. This is more useful client framing than a collection of standalone calculation screens.

The run explicitly retains a failed SEC refresh (`HTTP 403 Forbidden`) and a successful Treasury ingestion receipt. Failure does not become a fresh SEC-data claim. The document uses public annual snapshots, with model-owned prose and bound financial blocks separated. The report-intake UI says generic extraction is next phase and registered URLs do not silently become model inputs. The wider IPO/DCF/LBO/European-reporting catalog is still a roadmap rather than executed coverage. These distinctions should remain visible in the demonstration.

## Residual findings on the reviewed candidate

### 1. High for the conversation workflow — A completed follow-up can discard changed decision criteria

**Executed isolated reproduction:** Extended the existing director harness in memory, using its temporary database and explicit fake CLI, without changing repository files or making real model calls. On an existing room, the fake plan returned a valid explicit criterion change to “Prioritize a short refinancing horizon and preserve cash flexibility.” Its composed document retained valid stable page IDs. The run completed with `state: draft_ready`, but the saved criterion remained “Net cash sufficiency, maturity fit and downside resilience.” All five original contract groups still passed with this additional reproduction.

The first custom fixture accidentally duplicated its own synthesis page ID and was correctly rejected by document validation. After correcting the fixture to preserve the existing stable ID, the completed-turn criterion-loss reproduction above succeeded. This is a host-state finding independent of whether a real model would understand the instruction.

**Code basis:** The existing-room branch in `src/director.rs` updates the brief only when funding need changes. It otherwise ignores the plan's question, audience, criteria, constraints and meeting date while proceeding to composition. Its entity/method guard compares issuer and kind but not acquisition target; target-switch risk is code-inspected, not separately executed here.

**Why it matters:** A director who changes what matters to the client can receive a completed regenerated story while the authoritative decision criteria remain old. The next composition and review therefore operate on conflicting instructions. A conversation-first surface needs controlled persistence of the interpreted brief, not only a new document.

**Minimum fix:** Apply changed typed brief fields through the existing revision-checked brief operation, preserve unchanged fields deliberately, refresh relevant context and invalidate affected judgement/dispositions. Retain the follow-up instruction in the conversation. Reject unsupported issuer/method/target changes rather than silently continuing with the prior entity.

**Acceptance:** The isolated changed-criterion turn completes with the new criterion in the authoritative mandate, bound client criteria and archived new revision; untouched fields and old revisions remain intact. A target switch is explicitly rejected before revising the old acquisition. Add this exact case to the contract harness. No additional real model run is needed to verify the host repair.

### 2. Medium — Two frames in the actual new twelve-page story still overflow

**Executed evidence:** Iterated through all twelve actual main-case Materials frames in my own read-only browser at 1280 × 800, measuring each rendered `.page-block`. Ten frames had no block overflow above a two-pixel tolerance. Page 11's `bank_proposition` block had client height 292 and scroll height 383; page 12's `sources` block had client height 292 and scroll height 422. Widths fit. These are the current generated bank/source frames, not the older fourteen-page QA composition.

**Why it matters:** Making a dense block full-width does not ensure its text fits. The proposed bank relevance and qualifications/source record must remain readable in the client frame. A complete underlying JSON object cannot substitute for a complete visible presentation.

**Minimum fix / acceptance:** Adjust the layout or continue these frames while preserving every qualification and source. Recheck all twelve actual pages and inspect bank/source content visibly; require no clipped content at the demonstration viewport and presentation mode. Do not solve it by silently dropping the last disclaimer or shrinking text below usable size. The parent independently reported the same overflow and is repairing it.

## Bounded verdict

The four original fifth-pass reproductions are repaired within the checks described. The new first-assignment flow visibly implements the requested conversation → storyline → pooled evidence → deterministic finance → narrative/frames pattern for its supported public examples. The follow-up brief-persistence defect and actual frame overflow prevent unconditional acceptance of this reviewed candidate; they are specific, repairable controls/layout problems, not a request to broaden the project again.

The actual generated draft and fake-CLI contract fixtures establish neither qualified banker acceptance nor 10× productivity or 5× client impact. The original paired-human-task requirement remains. No new maturity score, subscription capacity estimate, bank approval or general financial-method validation is inferred from this addendum.
