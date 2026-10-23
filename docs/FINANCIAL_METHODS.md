# Executable financial conventions

All public accounts are annual US GAAP observations, with entity, unit, period, filing date and original tag retained. EBITDA proxy is operating income plus reported D&A, not adjusted EBITDA. Annual data is not LTM, forecast or consensus. The public archive is deliberately dated.

Bond issuance: regular semiannual coupons and redemption at par. A Treasury par-yield reference plus an explicit assumed credit spread gives an indicative flat yield to maturity. Price is the discounted coupons and redemption. Proceeds deduct explicit fee assumptions. This is not a spot-curve valuation or executable new-issue quote.

Buyback: assumed spend divided by assumed execution price gives repurchased shares. Earnings are reduced for lost after-tax cash income using a dated one-year Treasury reference. Historical diluted shares are reduced for a stylized full-period scenario. EPS accretion does not establish value creation.

EPS ratios require nonzero historical earnings. Negative earnings produce an explicit warning: a positive percentage ratio can mean a larger loss per share. Review before/after EPS amounts; do not interpret that ratio as accretion.

Acquisition: assumed deal shares, target price and premium give the equity cheque. Target reported debt and cash give a simplified enterprise value. Debt/cash funding, interest, synergies and tax remain explicit assumptions. EPS excludes PPA, integration timing and transaction costs; fiscal periods are not calendarized.

Each calculation pins its own source snapshot. Missing prices, spreads and deal terms must never be represented as observed market facts. Financial and editorial review precede any client use. This is an external public-data prototype, not approved advice or a bank-controlled process.

## Preliminary listing / primary issuance module

The executable `ipo` module is a valuation and primary-issuance mechanics scenario, not bookbuilding or underwriting. It uses the issuer's reported operating income plus D&A as an EBITDA proxy, a wholly assumed EV/EBITDA multiple, and reported debt/cash for a simplified equity bridge. Enterprise value = EBITDA proxy × multiple; pre-money equity = EV − debt + cash. Offer equity = pre-money equity × (1 − discount/100). Offer price = offer equity / historical diluted shares (millions). New shares = gross primary proceeds / offer price; new-investor ownership = new shares / total post-issue shares. Net primary proceeds deduct the assumed fee percentage. Fee cash outflow is separate from market capitalization at the offer price. Other EV adjustments, options, secondary sales and investor demand are excluded. Public listed-company accounts may be used only as an explicitly labelled rehearsal proxy; an actual IPO is not inferred.

## Preliminary single-tranche LBO module

The `lbo` module models a debt-free/cash-free enterprise purchase, transaction fees on entry EV, acquisition debt at a stated opening debt/EBITDA multiple and residual sponsor equity. EBITDA grows annually by the explicit growth assumption. Cash conversion represents post-tax/capex/working-capital cash generation BEFORE interest; interest is a fixed rate on each year's opening debt. Positive remaining cash sweeps debt, capped at the debt balance; excess cash is retained until exit. No negative debt or unsupported revolver is created. Exit equity = max(exit EV − debt + retained excess cash,0). With no interim sponsor distributions, MOIC = exit equity / initial sponsor equity and IRR = MOIC^(1/years) −1. Operating cash deficits accumulate as an unfunded gap, and IRR/MOIC are suppressed until a funding solution is modelled. Exclusions include multiple debt tranches, refinancing, interest tax shields, PPA, covenant mechanics and management equity. The complete annual schedule, inputs, formulas and source snapshot are inspectable/exportable.

## Apple public annual-report mapping and German references

Apple coverage adds a specific issuer-hosted 2025 Form10-K HTML mapping. It retains reported row labels and original scales (including shares reported in thousands), and distinguishes term-debt carrying amount from principal. It does not pretend those row labels are SEC XBRL concept identifiers. The live issuer-copy connector is separate from the SEC API, which may refuse requests from this environment. General arbitrary-report extraction is not implied.

Bundesbank2/5/10year current German Federal securities yields are a separately dated EUR reference set. These are neither USD Treasury inputs nor a spot curve and are not substituted into USD pricing. Each tenor retains its observation date, series identifier and source URL.
