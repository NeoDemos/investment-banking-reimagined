# Market research and build-versus-buy decision

Research date: 21 October 2026. Public-source research; no vendor demo, contracted feed, licensed data sample, or bank acceptance review has been performed. Capabilities below are vendor descriptions, not independently measured performance. Planning conclusions are our estimates.

## Conclusion

The hypothesis is substantially right for a **bounded analyst workflow**: buy financial content and its existing normalization, use existing models, and build the workflow, calculations, review, and presentation layer. A month is a credible stretch for one useful, reviewable valuation workflow. It is not a credible promise of competitor breadth or approval for confidential use at an international bank.

Three distinct difficulties remain after buying data: financial semantics across sources; reliable, editable deliverables with evidence; and institution-specific governance and operation. Metadata is essential, but correct metadata cannot establish that a management EBITDA adjustment is defensible or that a peer is economically comparable.

## Competitive landscape

| Product / category | Publicly advertised capability relevant here | Implication for our scope |
| --- | --- | --- |
| [Finster](https://www.finster.ai/product) | Research workspace, company dashboards, scheduled/triggered tasks, interactive outputs, PowerPoint automation | Research-to-deliverable workflow is a direct competitor. Defer proactive monitoring and open-ended workflow authoring. |
| [Model ML](https://modelml.com/) | Finance agents across its app and Office, workflows, grids, document review, sites | Office-native editing, firm context, and adoption matter alongside generation. |
| [Model ML Data](https://modelml.com/product/dataset-llm) | Filings ingestion, OCR, metadata, entity resolution, normalized statements, source traceability, public/private filing datasets | Buying the data layer is a real strategic alternative to rebuilding it. Coverage advertised is not a contract or quality guarantee. |
| [Rogo](https://rogo.com/) | Financial agents, connected firm knowledge and data, financial workflows, implementation with finance specialists | Domain integration and deployment service are part of the offering, not just the agent interface. |
| [Hebbia for banking](https://www.hebbia.com/investment-banking/) | Research, model/deck preparation, CIM creation and VDR analysis | CIM support is already a competitive use case; provenance and document reconciliation are required to compete. |
| [Blueflame](https://www.blueflame.ai/) | M&A research, diligence, firm knowledge and deal context for banks, PE and private credit | Private-market workflows depend heavily on authorized internal material and relationships. |
| [Daloopa](https://docs.daloopa.com/docs/overview) | Source-linked financial data through API, cloud and MCP, plus Excel tools | Both a purchasable input and an adjacent substitute for basic model preparation. |
| Claude Code/Cowork plus an entitled connector and templates | General models can assemble bounded workflows; provider-specific connectors supply content | This is the minimum-cost baseline to beat. A custom application must save review time or improve controls and repeatability beyond that baseline. |

[Finster's security page](https://www.finster.ai/security) also advertises SSO/SCIM, granular access, audit trails, third-party testing, private deployment, and model choice. These are commercially meaningful parts of the product. They are vendor claims, not evidence that our system would inherit an approval. No comparable, binding vendor quotes were obtained; no seat-price or total-cost ranking is asserted.

The opportunity is therefore not “another chat UI.” A useful initial distinction would be a small number of repeatable financial decisions with inspectable calculations, fast source checks, controlled revisions, and high-quality corporate communication. Market demand and willingness to pay remain unvalidated: the proposed analyst pilot must measure them.

## Can the data be bought?

Yes, much of it. Buy a licensed dataset and delivery rights, not an abstract “MCP subscription.” Existing terminal access may not include programmatic use, AI processing, service identities, caching or redistribution.

| Route | Evidence inspected | Best initial fit | Limits and outstanding checks |
| --- | --- | --- | --- |
| [FactSet AI-Ready Data MCP](https://developer.factset.com/mcp/factset-ai-ready-data-mcp) | Public catalog inspected in a browser: 23 listed tools, including Fundamentals, EstimatesConsensus, GlobalPrices, EntityReference, CompanyScreener, MergersAcquisitions, PrivateCompany, PrivateEquityVC, DebtCapitalStructure, TermsConditions and BondPrices | Strong candidate for a public-company valuation pilot; debt data candidate later | The M&A description specifies publicly traded targets. Private-market tools are separate. Catalog changelog says packaging varies by tier/firm type. Need entitled schemas, pagination, limits, audit-link depth, history and rights. |
| [S&P Global / Kensho](https://docs.kensho.com/llmreadyapi/overview) | Public docs cover financials, market data, company intelligence, transcripts and M&A; MCP and Python/API access | Alternative primary supplier for company analysis and comps | Its [FAQ](https://docs.kensho.com/llmreadyapi/faqs) explicitly expects customer-owned models, orchestration and UI, and emphasizes named-company analysis over broad industry research. Need screening and field-level coverage test. |
| [LSEG MCP](https://www.lseg.com/en/solutions/ai-finance-solutions/lseg-mcp) | Public page supports custom apps; lists fixed-income analytics, fundamentals, estimates, macro and Reuters News | Debt/capital-markets candidate and alternative primary source | Rollout and entitlements are phased. Its page distinguishes available content from planned equity pricing, ownership and transcript expansion. Do not count roadmap content as live access. |
| [Daloopa API/MCP](https://docs.daloopa.com/docs/api-vs-mcp) | Public tool mapping inspected: company/series discovery, fundamentals with sources, document retrieval/search and stock prices; broader API supports updates and bulk export | Detailed issuer financials and operating KPIs | Not established as a replacement for comprehensive transactions, consensus or private-market data. API can expose operations absent from MCP. Financial-series and period semantics still need testing. |
| [PitchBook Direct Data](https://pitchbook.com/products/direct-access-data/api) | Public REST/JSON offering for deals, companies, investors, funds and related entities | PE/VC funding and private transactions | Separate licence, endpoints, historical values, non-disclosed fields, onward use and economics must be checked. No authenticated tool catalog inspected. |
| [SEC EDGAR](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), issuer materials, authorized uploads | Public filings/structured facts can support selected US examples | Demonstration, evidence checks, fallback for selected facts | Not a replacement for global screening, consensus, comprehensive deal terms or confidential management forecasts. Parsing and normalization work remains. |

The factual details in each row derive from its linked provider documentation, checked on the research date. None proves the owner's current entitlements. Public catalogs and documentation were inspected; authenticated `tools/list`, actual responses, contracts, SLAs and bank processing terms were not available. Do not label this technical or commercial validation complete.

**Proposed procurement order:** test one existing entitled broad provider first. FactSet is the first candidate because the public catalog covers the proposed slice; S&P is the alternative. Consider Daloopa if detailed KPI extraction is the main gap. Add a private-market source only when PE/VC is actually scheduled. Evaluate LSEG for debt analytics rather than forcing an equity-oriented connector into that role. Do not buy five overlapping feeds before testing one representative assignment.

Use a controlled API/feed adapter if MCP lacks bulk retrieval, correction tracking, deterministic queries or complete pagination. The provider's content and contract matter more than the wire protocol. Do not assume that an MCP tool whose name includes “search” enumerates a whole universe.

## Grounding the product in banking work

The user's target is coherent: advisory and transaction materials are built from research, financial analysis and a transaction narrative, then reviewed repeatedly. The same analytical base can support an interactive briefing and editable Office exports. Treat the reviewed snapshot as the record; refreshing live data must create a new review version.

| Assignment | Financial work that must precede the output | Output and responsible judgement |
| --- | --- | --- |
| Corporate-finance / M&A pitch | Sector context, company profile, selected trading comps, precedent transactions, DCF, EV-to-equity bridge, strategic options | Options/valuation briefing. Banker selects peers and assumptions and reviews limitations; the software must not imply that a multiple alone establishes fair value. |
| Sell-side execution | Management financials and forecasts, adjusted earnings bridge, segment/KPI reconciliation, business and market story, diligence questions | Teaser, CIM/information memorandum, management or investor presentation. Public vendor data supplies context, not the seller's confidential operating plan. |
| Buy-side / PE | Business quality, diligence, projections, financing, sources and uses, LBO cash flows and returns, downside scenarios | Acquisition or investment-committee memo. Returns and financing assumptions need separate validation. An IC memo is an internal investor decision document, not a sell-side marketing document. |
| Debt capital markets | Debt maturity/capital structure, comparable issues, benchmark curves and spread conventions, leverage, coverage, liquidity and rating considerations | Financing options and draft investor presentation; indicative analysis must be distinguished from executable pricing and underwriting judgement. |
| Equity capital markets / IPO | Equity story, operating plan/KPIs, public peers, proceeds/dilution, ownership and offering scenarios | IPO-readiness and valuation briefing, draft roadshow content. Readiness and investor demand cannot be inferred from a valuation model. |
| Venture capital | Funding history, cap table, preferred/share-class rights, dilution, runway, unit economics and scenario outcomes | Investment memo and financing scenarios. Last-round headline value is not automatically common-equity or enterprise value. |

These are proposed professional workflow specifications, not assertions that a single model can perform all roles. Valuation consistency is grounded in [Damodaran's treatment of EV/EBITDA](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/vebitnote.html) and [the bridge to equity value](https://pages.stern.nyu.edu/adamodar/New_Home_Page/littlebook/valuepershare.htm). The [NYSE IPO guide](https://www.nyse.com/publicdocs/nyse/listing/nyse_ipo_guide.pdf) discusses equity-story development and pre-IPO preparation. Hebbia's banking page provides direct market evidence for CIM/VDR workflows, not a substitute for banker methodology review.

Contract review, legal diligence, prospectus drafting and legal opinions are outside product scope. Financial work still needs compliance review, confidentiality controls and issuer/banker sign-off where relevant. Excluding legal drafting does not exclude operational governance.

## Commercial test before expansion

Recruit 3–5 analysts and a finance reviewer; use 15 representative assignments, including failures. Compare manual preparation, the general assistant plus the **same** entitled data, and the proposed app. Measure analyst time plus reviewer correction time, numerical/citation errors, revision time, adoption and repeat usage. A proposed success target is at least 50% lower median combined preparation/review time without worse critical errors. This is an acceptance target, not a demonstrated saving.

Compare annual alternatives using: licence minimums + machine/AI/output rights + model/runtime usage + hosting/security/support + integration/maintenance + human review. Request itemized quotes. A workflow that is technically feasible may still be cheaper to buy, especially for a small analyst population; there is not yet enough evidence to decide its commercial economics.
