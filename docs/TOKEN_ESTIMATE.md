# Coding-agent token and cost estimate

As of 21 October 2026. Models requested: GPT-6.1 Sol and Claude Opus 5.5.

## How to interpret the estimate

There is no measured token count for this unbuilt project. The following are deliberately broad planning envelopes, not quotes or model benchmark results. The same token workload is priced for both models to isolate price differences; this does not claim that they need equal tokens or deliver equal results. Actual retries, reasoning effort, context reuse, reviews, and integration surprises can change consumption by multiples.

Processed tokens mean the sum of input, cache-read input, and billed output across all calls, including repeated context and billable reasoning. They do not mean source-code tokens. Coding, tests, agent reviews, revisions, documentation, and model-driven evaluation are included in the envelopes. Future production use, maintenance, and ongoing research consumption are excluded.

The estimates assume licensed, reasonably usable provider data, existing models, established software frameworks, and experienced human direction. They exclude rebuilding a financial data vendor, independent audits and penetration-test fees, bank review labour, legal/procurement work, infrastructure, provider charges, taxes, and operational staffing.

## Published standard API prices

USD per one million tokens, standard processing:

| Model | Ordinary input | Cache-read input | Output |
| --- | ---: | ---: | ---: |
| GPT-6.1 Sol | $2.00 | $0.10 | $10.00 |
| Claude Opus 5.5 | $4.00 | $0.20 | $20.00 |

Sources: [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [OpenAI pricing](https://developers.openai.com/api/docs/pricing), and [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing), checked on the assessment date.

GPT-6.1 Sol's standard short-context rates above apply to requests up to 272K input tokens. Its published long-context rates are $4 input, $0.20 cached input, and $15 output. Fast modes, regional processing, cache writes, and hosted tools may add charges. Anthropic publishes distinct cache-write, fast-mode, and regional pricing as well. These modifiers are not silently included in the base estimate.

API-equivalent dollars do not translate directly into Codex or Claude subscription allowances. Subscription limits, model multipliers, and the chosen harness may differ; no number of subscription months or remaining personal allowance is inferred here.

## Base arithmetic

To make the calculation reproducible, assume 85% input and 15% output, with all input initially priced as uncached. This is an illustrative workload mix, not an observation of this project. Output includes billed reasoning, so a high-reasoning workload may have a much larger output share.

For T million processed tokens:

    GPT-6.1 Sol cost = T × (0.85 × $2 + 0.15 × $10) = T × $3.20
    Opus 5.5 cost    = T × (0.85 × $4 + 0.15 × $20) = T × $6.40

If 80% of input qualifies as cache reads, the corresponding rates are $1.908 and $3.816 per million total tokens, before cache-write premiums. Cache hits reduce price, not the count of processed tokens. Real caching depends on each provider and harness.

## Cumulative scope envelopes

Each row is a total from project start to that scope; do not add the rows together.

| Scope | Processed tokens | GPT-6.1 Sol, base mix | Opus 5.5, base mix |
| --- | ---: | ---: | ---: |
| Demonstration of one workflow | 2–10 million | $6.40–$32 | $12.80–$64 |
| Useful analyst pilot | 20–80 million | $64–$256 | $128–$512 |
| Bounded internal product for bank assessment | 100–500 million | $320–$1,600 | $640–$3,200 |
| Broad competitor-style application | 500 million–2 billion+ | $1,600–$6,400+ | $3,200–$12,800+ |

The bank-assessment candidate assumes one organisation, a few representative M&A/debt/equity advisory workflows, reusable enterprise services, and bounded output types. It does not mean every advertised competitor feature is reproduced, every bank requirement is satisfied, or the bank has approved deployment. The broad-platform row remains an application estimate, excluding the proprietary global data estate.

For the bank-assessment row, an illustrative 80% input-cache-hit scenario gives approximately $191–$954 for GPT-6.1 Sol or $382–$1,908 for Opus 5.5, before write premiums and other modifiers. At a 50% output share with no caching the same 100–500 million tokens cost $600–$3,000 or $1,200–$6,000. An all-output pricing sensitivity would be $1,000–$5,000 or $2,000–$10,000 at standard short-context prices. These examples show why total tokens alone are insufficient to predict the bill.

## Work decomposition behind the bank-assessment envelope

These additive component ranges are speculative engineering estimates, not measured productivity figures. They sum to 120–460 million processed tokens, rounded outward to the 100–500 million planning envelope above.

| Workstream | Tokens, millions |
| --- | ---: |
| Scope, requirements, architecture and threat modelling | 5–15 |
| Core workspace, permissions-aware documents and tasks | 15–45 |
| Provider adapters, entitlements and data contracts | 10–40 |
| Research, evidence, citations and historical semantics | 15–60 |
| Bounded financial calculations and advisory workflows | 15–70 |
| Interactive briefings, review, snapshots and exports | 10–30 |
| Identity, information barriers, secrets and isolation | 15–60 |
| Deployment, monitoring, recovery and operational evidence | 10–40 |
| Expert evaluations, integration tests, security findings and remediation | 25–100 |

## Confidence and budget decision

Confidence in published unit prices is high as of the source-check date. Confidence in project token volume is low before implementation and inspection of the real bank and provider requirements. There is no defensible basis yet to state that either requested model will complete this project with fewer tokens or less correction effort.

The next authorised implementation phase should be capped and measured: one provider integration, one numerical workflow, and one permission-isolation slice. Record uncached input, cached input, cache writes, output/reasoning, tool charges, elapsed time, and human correction time separately. Use those measurements to revise the estimate. This document does not authorise those builds.

Cheap code generation does not imply cheap institutional deployment. Data subscriptions, expert review, security testing, operations, and approval are separate budget lines and may dominate the total cost.
