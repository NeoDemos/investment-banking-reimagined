# Feasibility assessment

Assessment date: 21 October 2026. Status: initial research, not an implementation proposal approved by a bank.

## Finding

A focused internal alternative to the analyst workflows advertised by Finster and Model ML is technically feasible using existing language models and licensed financial data. Generating an attractive interactive briefing is a relatively small part of the complete problem. Financial correctness, information barriers, reliable execution, and operational evidence dominate the institutional version.

The thesis is credible: clients value information that improves a strategic decision, rather than the software used to assemble the deliverable. An interactive briefing can present options, assumptions, sensitivities, and supporting evidence more directly than a static deck. Its reviewed version must still be frozen and recoverable; a live update must not silently change previously approved advice.

This assessment examines advertised functionality. Neither competitor has been tested hands-on, and feature or quality parity cannot be inferred from marketing pages.

## What the reference companies sell

[Model ML's linked dataset page](https://modelml.com/product/dataset-llm) describes a substantial data operation: filings, extraction, entity resolution, normalised financials, and source traceability, delivered through MCP, REST, and data feeds. That particular offering is a data layer. The company also advertises workflow products.

[Finster's product page](https://www.finster.ai/product) describes a workspace with research, company dashboards, background tasks, interactive outputs, and presentation generation. It is a workflow platform. Its [homepage](https://www.finster.ai/) also advertises its own document pipeline and integrations with external and internal sources.

Therefore neither should be reduced to a thin interface or a data reseller. However, buying equivalent data and using general models removes the need to reproduce much of a proprietary collection operation. No new foundation-model training is assumed.

## Data strategy and fallbacks

MCP is an access protocol, not a dataset, licence, completeness guarantee, or security certification. Access to an MCP connector does not establish the right to use every dataset through it or redistribute its outputs to clients.

| Route | Verified public offering | What still needs validation |
| --- | --- | --- |
| FactSet | Official [MCP catalog](https://developer.factset.com/mcp-catalog) advertises AI-ready financial data; a separate [portfolio analytics announcement](https://investor.factset.com/news-releases/news-release-details/factset-expands-model-context-protocol-suite-portfolio-analytics) describes pre-calculated analytics | Purchased datasets, actual tool schema and limits, screening/bulk access, source granularity, machine use and external-client output rights |
| S&P Global / Kensho | [LLM-ready API and MCP](https://docs.kensho.com/llmreadyapi/overview) cover financials, market data, company information, transcripts, and M&A data | Dataset entitlements, bond and transaction detail needed for each workflow, historical coverage, throughput, and output rights |
| LSEG | [MCP offering](https://www.lseg.com/en/solutions/ai-finance-solutions/lseg-mcp) supplies licensed financial content and analytics with entitlement controls | Available services under the organisation's contract, instrument coverage, permitted distribution, history, and operational limits |
| Provider API, SDK, or data feed | Use the provider's contracted interface directly and expose narrow internal tools if MCP lacks a needed operation | Engineering and authentication effort; the same underlying licence and data limitations still apply |
| Primary public filings | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) provide submissions and structured XBRL data for SEC filers | Global coverage, accounting normalisation, identifiers, restatements, and document extraction require additional work |
| Issuer material and authorised internal documents | A possible supplementary route, subject to access and use rights | Ingestion, parsing, permissions, source quality, freshness, and client confidentiality |

These are alternatives to investigate, not interchangeable subscriptions. Public filings are useful for a demonstration and selected research. They do not replace global estimates, proprietary research, comprehensive private-company data, transaction intelligence, executable prices, or detailed bond analytics.

Start with a coverage matrix for three concrete assignments: an acquisition assessment, a bond issuance assessment, and an IPO readiness assessment. For each required field record provider, entitlement, timestamp, units, period, source, completeness, and fallback. A missing critical field must produce an explicit limitation, rather than an invented proxy.

A ranked search result cannot establish that a screen covered every company. Universe screening needs bulk/filter access or a provider-side screening operation. A current data snapshot cannot answer a historical 'what was known then?' question unless publication history and revisions are available.

## Product direction

The proposed primary deliverable is a controlled decision workspace:

1. State the decision, objectives, constraints, and information date.
2. Present options and the conditions under which each is attractive.
3. Allow approved scenario inputs and deterministic calculations.
4. Trace material figures and claims to sources and transformations.
5. Distinguish observations, assumptions, model estimates, and judgement.
6. Capture review, approval, and a versioned client-facing snapshot.

Use a formal corporate register with clear conclusions, explicit qualifications, consistent terminology, and restrained claims. Tone templates help but do not prove analytical quality.

HTML and interactive charts are straightforward to generate. In a bank, arbitrary agent-written JavaScript should not execute with application privileges or unrestricted network access. Prefer structured output rendered by reviewed components; isolate any generated code and control external requests. Preserve accessible, printable, and offline snapshots where the delivery channel requires them.

Excel can cease to be the main interface while transparent financial models remain essential. Valuation, leverage, debt capacity, bond cash flows, and sensitivities need tested calculation engines with explicit conventions. An LLM should select and explain calculations, not supply unverified arithmetic. Equity, M&A, and debt advice also require distinct analytical methods; one generic prompt does not establish expertise across them.

## Security and bank acceptance

Rabobank was the illustrative bank named in the project discussion. Its internal security requirements, architecture standards, AI governance process, contracts, and data classifications have not been provided. This is a generic international-bank design target, not a claim that a solution meets Rabobank's requirements.

Rabobank publicly discusses its organisation-wide [DORA programme](https://www.rabobank.nl/en/business/support/dora). The [European Commission's DORA material](https://finance.ec.europa.eu/regulation-and-supervision/financial-services-legislation/implementing-and-delegated-acts/digital-operational-resilience-regulation_en) provides public regulatory context. Applicability and evidence obligations must be mapped by the bank's responsible teams; an ISO certificate or a cloud provider's certifications would not by themselves approve the application.

Candidate engineering and evidence work includes:

- Identity integrated with bank SSO, least privilege, joiner/mover/leaver handling, and privileged access control.
- Deal-, client-, document-, and team-level permissions, enforced before retrieval and tool execution. Information barriers must extend to caches, embeddings, logs, summaries, exports, and background jobs. Access revocation must propagate.
- Approved model deployment and subprocessors, contractual processing terms, agreed retention and residency, key management, and controlled outbound traffic. A bank-hosted frontend still sends data externally if its model or MCP calls do.
- Tool credentials scoped to the user or an authorised service identity; no shared credential that silently bypasses entitlements. Document content must not grant new tool privileges.
- Prompt-injection and data-exfiltration testing, sandboxed execution, controlled client sharing, and prevention of cross-matter leakage.
- Auditable source and calculation records, protected logs with appropriate minimisation, reviewable model/prompt versions, and approval before external delivery.
- Secure development, dependency and secret scanning, independent penetration testing and remediation, operational monitoring, recovery exercises, incident procedures, and supplier/exit arrangements.
- Evaluations using expert-reviewed assignments: numerical agreement, citation support, permissions, missing-data behaviour, historical correctness, repeatability, and appropriate limitations.

The lowest-friction route is likely an application inside an already approved bank platform using approved identity, hosting, model gateways, monitoring, and deployment controls. That is an architectural hypothesis, not knowledge of the bank's current stack. Becoming a standalone software supplier would add an organisational security and procurement programme.

### Initial risk register

Ratings are preliminary engineering judgements; the owners below are proposed roles, not assigned bank staff.

| Risk | Likelihood / impact / level | Specific mitigation | Proposed owner | Status |
| --- | --- | --- | --- | --- |
| Cross-deal or client information leakage | Medium / high / critical | Permission enforcement at each retrieval/tool boundary; derived-artifact permissions; adversarial isolation and revocation tests | Security lead | Open |
| Persuasive output with incorrect financial meaning | High / high / critical | Typed facts, deterministic calculations, expert gold cases, source checks and review | Finance lead | Open |
| Data coverage or licence unsuitable for client deliverables | Medium / high / high | Field-level coverage matrix and written usage-rights verification before integration commitment | Data procurement / legal | Open |
| Unapproved processing via models, MCP services, or generated HTML | Medium / high / high | Approved destinations, processing contracts, egress policy, controlled rendering and sandboxing | Architecture / security | Open |
| Failure to recover or reproduce a reviewed recommendation | Medium / high / high | Versioned evidence and calculations, immutable reviewed snapshots, restore and dependency-outage exercises | Operations lead | Open |
| Generic controls fail actual bank acceptance | High / high / critical | Obtain internal requirements and map each to an owner, implementation, evidence, and acceptance decision | Bank sponsor / control owners | Open |

## Work and elapsed time

These are initial planning ranges for an experienced engineer using coding agents with available finance and security reviewers. They are not benchmarked delivery predictions. Token budgets are in the companion estimate.

| Deliverable | Boundaries | Indicative elapsed time |
| --- | --- | --- |
| Demonstration | One assignment, public or entitled data, cited interactive briefing | 1–2 weeks |
| Analyst pilot | 2–3 bounded workflows, evaluations and real provider integration; no bank-production claim | 4–8 weeks |
| Bank assessment candidate | Bounded internal advisory product, identity and information barriers, operational evidence, finance validation, security remediation | 6–12 months, potentially longer; assumes existing approved bank infrastructure and reviewer availability |
| Broad competitor-style platform | Multiple data sources and workflow families, flexible task system, client delivery and administration, sustained quality and operations | 12–24+ months with a small team |

The bank-assessment stage supersedes the earlier generic 3–6 month internal-product estimate: a generic internal application is a lower acceptance threshold. A bank decision or supplier approval is not a task a coding model can finish by consuming more tokens. Rebuilding a global proprietary data estate is excluded and could be a separate multi-year undertaking.

## Decision before implementation

The next milestone is a scope and dependency decision, not a build:

- Inspect a real provider tool catalog and contract against the three assignments.
- Obtain the target bank's applicable requirements, approved services, and review route.
- Choose one first workflow and define expert-reviewed acceptance cases.
- Decide whether this is an internal bank application or an external supplier product.
- When implementation is authorised, measure tokens and correction effort on three representative slices before approving the full budget.
