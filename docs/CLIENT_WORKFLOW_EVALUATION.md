# Evaluating a client-facing financial workroom

23 October 2026. The owner requested five independent GPT-6.1 Sol gauntlet passes using a client-facing investment-banker lens. These are independent **model reviews**, not qualified human banker validation. Each reviewer receives the original objective, previous findings, implementation responses and unresolved objections. The parent implements and verifies changes between rounds. Raw findings live in `docs/reviews/gauntlet-N.md`; unfavorable findings must remain in the record.

The current product scope remains a local external public-data MVP. Model/data/voice connections are deferred by the owner. A deterministic structured workflow is useful test infrastructure, but does not demonstrate autonomous understanding or unobserved productivity. No confidential bank or client information belongs in this public repository.

## What counts as a successful task

A banker should be able to record the client's actual decision, constraints, criteria and meeting; approve a transparent work plan; prepare sourced alternatives and a status quo; challenge terms; inspect the exact calculation and evidence; carry review issues through correction; and reopen the exact reviewed artifact. A deck is downstream of that decision, rather than the product's authoritative starting point.

For the three bounded public examples, verify financial outputs independently and explicitly reject unsupported coverage. Bond calculations are regular semiannual flat-yield illustrations using Treasury par references plus assumed spreads. Buyback and acquisition results retain the existing narrow methods and exclusions. Passing these tasks does not validate DCF, LBO, real underwriting, covenant/rating models or institutional datasets.

### Technical acceptance

- A brief and its work plan survive reload; preparing requires confirmation of illustrative inputs.
- Alternatives use the same pinned observations. Changing one creates a new calculation, preserves previous results and unaffected pages, refreshes selected context, and invalidates stale judgement/review.
- Key decision figures expose the formula, exact financial inputs, units, dates and assumption rationale. Source citations are not interchangeable with justification for a scenario input.
- Review issues persist independently of chat. Deferred instructions never appear applied. Review copies pin the decision, scenarios, evidence, document and issues; later edits cannot alter those copies.
- Invalid/stale operations fail without partial workroom commits. Unresolved current-market, method and commercial checks remain visible.
- The actual app is exercised in the collaborative browser. Code inspection and screenshots are recorded separately from executed behavior.

## Testing the 10× productivity hypothesis

Use real bankers completing paired, equivalent public-data tasks with a pre-agreed quality floor. Counterbalance baseline/tool order and use matched but different inputs to reduce learning effects. Include research, normalization, financial construction, presentation, quality assurance, senior review and rework through accepted delivery. Record active staff minutes and wall-clock elapsed minutes separately, with all contributing staff included. Keep failed attempts, missing inputs and abandoned sessions in the denominator.

For each accepted-quality pair, compute **baseline total active staff minutes / assisted total active staff minutes**. A 10× result requires assisted effort no greater than one tenth of the equivalent baseline, without a reduction in quality. Report sample size, individual pairs, median and dispersion; do not infer a general team effect from one example. A smaller, observed improvement is more useful evidence than an invented target result. Backend latency, tokens processed and autonomous runtime are not active staff time.

Predefine critical quality gates: no material numeric/source error; correct entity, period and units; explicit assumptions and method exclusions; internally consistent figures across outputs; relevant alternatives/downside; complete response to the client brief; and usable, reviewable materials. A faster failed-quality output does not earn a productivity multiplier.

## Testing the 5× client-impact hypothesis

An ordinal “quality 1–5” or model-review score has no meaningful ratio interpretation. Define an observable ratio-scale outcome before the experiment. One limited operational proxy is **independently accepted decision-useful alternatives or findings per comparable client meeting** at a fixed minimum quality floor and equal meeting opportunity. Count only distinct, substantiated findings that the client or a blinded qualified reviewer judges useful for that decision; record the acceptance evidence. A fivefold increase in this count is a proxy for discussion utility, not fivefold realized economic benefit, mandate wins or client value. It can overlap with productivity and must not be presented as a separate causal effect without an appropriate design.

Track decision relevance, downside coverage, unresolved assumptions and reviewer/client usefulness separately. Actual financial outcomes require longitudinal evidence and a credible attribution design. If no defensible denominator or independent acceptance exists, report qualitative dimensions and **impact unproven**.

## Evidence hierarchy and interpretation

1. Reproduced technical examples with pinned data and independent reference calculations.
2. Independent model review of design, code and visible behavior: useful defect discovery, not banker adoption evidence.
3. Paired human task observations with time components and equal-quality review.
4. Blinded qualified review and documented client use with predefined outcome measures.

No seeded demo observations, model-invented timings or simulated reviewer scores may be used as human/client evidence. Any manually entered assessment must disclose its provenance and unverified reviewer identity. Production claims, confidential processing, native managed deployment and bank acceptance require separate evidence.

## Research grounding

[Model ML Operator](https://modelml.com/articles/operator-the-ai-agent-for-investment-banking-workflows) describes multi-step work in editable financial documents. [Rogo's banking overview](https://rogo.com/blog/ai-for-investment-banking) emphasizes sourcing, firm-format deliverables and revisions to the existing document. [Finster's product description](https://www.finster.ai/product) describes background tasks, cited exploration and interactive outputs. These are vendor descriptions, not independently measured productivity comparisons.

[BankerToolBench](https://arxiv.org/abs/2604.11304) evaluates complete banking work products with banker-defined criteria and highlights cross-artifact consistency failures. It informs the choice to evaluate deliverables and review burden rather than tool-call completion. This app has not run that benchmark, and its published results do not establish the performance of this application or current models.
