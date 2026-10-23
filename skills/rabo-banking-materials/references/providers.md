# Provider connections — checked 23 October 2026

Connect providers separately through Cowork's connectors UI. Uploading this skill does not install connectors, grant licences or authenticate accounts. Claude Code MCP settings are also separate from Cowork. Use host-managed browser sign-in where offered; never put credentials in a prompt or this skill.

| Source | Setup | Pricing evidence |
|---|---|---|
| Gain / formerly Gain.pro | Obtain the actual MCP URL and authentication instructions from the vendor/account manager. Public product page confirms MCP and bulk data. | No verified public numeric MCP price found. Free platform trial advertised; MCP inclusion unverified. |
| DEDALE Intelligence | Ask DEDALE for account setup. Its announcement describes read-only MCP, source links and account access controls; no endpoint is published there. | No verified public numeric MCP price or free MCP trial found; request quote/demo. |
| Capital IQ via Kensho | Prefer Claude's S&P Global connector and provisioned Kensho Okta login. Documented custom-client endpoint: `https://kfinance.kensho.com/integrations/mcp`. | Quote required; trial enquiries offered. A Capital IQ desktop seat does not establish API/MCP entitlement. |

The repository's `scripts/provider_mcp.py` can configure verified URLs, print host setup, discover actual tool schemas and retrieve explicitly selected read-only tools with a provisioned access token. It does not implement OAuth itself. Keep raw results in ignored private output files, not the public repository.

Primary sources:
- https://www.gain.ai/product
- https://www.dedale.com/articles/dedale-intelligence-is-now-accessible-via-mcp
- https://docs.kensho.com/llmreadyapi/mcp/third-party/claude
- https://docs.kensho.com/llmreadyapi/mcp/custom
- https://docs.kensho.com/llmreadyapi/mcp/custom/refresh-or-access-token
- https://llmreadyapi.kensho.com/

Gain.io (CRM), Gainium (crypto) and Remnant/Dedale-bi are different products; do not substitute their endpoints.

Request a quote for one external MVP user, specifying trial duration, MCP/API entitlement, allowed AI host/model, included datasets, request limits, minimum contract, caching/retention, derived calculations/charts, client-facing exports and whether an existing employer seat may be used outside its environment. Model subscription costs are separate from data-provider fees; neither implies bank approval.
