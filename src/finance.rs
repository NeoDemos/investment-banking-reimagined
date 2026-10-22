use serde_json::{Value, json};
use std::collections::BTreeMap;
pub type Params = BTreeMap<String, f64>;
pub const ENGINE: &str = "corporate-finance/0.1.0";
pub fn defaults(kind: &str) -> Params {
    let pairs: Vec<(&str, f64)> = match kind {
        "bond" => vec![
            ("amount", 500.),
            ("tenor", 5.),
            ("spread", 125.),
            ("coupon", 6.25),
            ("fees", 50.),
        ],
        "buyback" => vec![("amount", 500.), ("sharePrice", 150.), ("tax", 25.)],
        _ => vec![
            ("targetPrice", 25.),
            ("targetShares", 300.),
            ("premium", 25.),
            ("synergies", 150.),
            ("debtPercent", 60.),
            ("spread", 125.),
            ("tax", 25.),
        ],
    };
    pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect()
}
pub fn validate(kind: &str, p: &Params) -> Result<(), String> {
    let d = defaults(kind);
    if !["bond", "buyback", "acquisition"].contains(&kind) {
        return Err("Unknown scenario".into());
    }
    if p.len() != d.len() || p.keys().any(|k| !d.contains_key(k)) {
        return Err("Unexpected or missing assumption".into());
    }
    for (k, v) in p {
        let (lo, hi) = match k.as_str() {
            "amount" => (1., 100_000.),
            "tenor" => (1., 30.),
            "spread" => (0., 2000.),
            "coupon" => (0., 30.),
            "fees" => (0., 500.),
            "sharePrice" | "targetPrice" => (0.01, 10_000.),
            "targetShares" => (0.01, 100_000.),
            "tax" => (0., 60.),
            "premium" => (0., 200.),
            "synergies" => (0., 10_000.),
            "debtPercent" => (0., 100.),
            _ => (0., 0.),
        };
        if !v.is_finite() || *v < lo || *v > hi {
            return Err(format!("{k} must be between {lo} and {hi}"));
        }
        if k == "tenor" && v.fract() != 0. {
            return Err("Use whole years for the regular semiannual bond convention".into());
        }
    }
    Ok(())
}
pub fn company<'a>(data: &'a Value, symbol: &str) -> &'a Value {
    data["companies"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["symbol"] == symbol)
        .unwrap()
}
pub fn fact(data: &Value, symbol: &str, key: &str) -> f64 {
    let f = &company(data, symbol)["facts"][key];
    let raw = f["value"].as_f64().expect("Required sourced fact missing");
    if f["unit"] == "USD/shares" {
        raw
    } else {
        raw / 1e6
    }
}
pub fn treasury(data: &Value, years: f64) -> f64 {
    let pts = data["curve"]["points"].as_array().unwrap();
    for w in pts.windows(2) {
        let x = w[0]["years"].as_f64().unwrap();
        let z = w[1]["years"].as_f64().unwrap();
        if years >= x && years <= z {
            let a = w[0]["yield"].as_f64().unwrap();
            let b = w[1]["yield"].as_f64().unwrap();
            return a + (b - a) * (years - x) / (z - x);
        }
    }
    pts.last().unwrap()["yield"].as_f64().unwrap()
}
pub fn bond_price(coupon: f64, yield_pct: f64, years: f64) -> f64 {
    let n = (years * 2.).round() as i32;
    let r = yield_pct / 200.;
    (1..=n)
        .map(|t| (coupon / 2. + if t == n { 100. } else { 0. }) / (1. + r).powi(t))
        .sum()
}
fn stat(key: &str, label: &str, value: f64, unit: &str) -> Value {
    json!({"key":key,"label":label,"value":value,"unit":unit})
}
fn row(label: &str, value: f64, unit: &str, formula: &str) -> Value {
    json!({"label":label,"value":value,"unit":unit,"formula":formula})
}
pub fn calculate(data: &Value, kind: &str, p: &Params) -> Result<Value, String> {
    validate(kind, p)?;
    let get = |k: &str| p[k];
    let debt = fact(data, "PEP", "debt");
    let cash = fact(data, "PEP", "cash");
    let ni = fact(data, "PEP", "netIncome");
    let shares = fact(data, "PEP", "shares");
    let ebitda = fact(data, "PEP", "operatingIncome") + fact(data, "PEP", "da");
    let base_eps = ni / shares;
    let base_leverage = (debt - cash) / ebitda;
    let cash_yield = treasury(data, 1.);
    let mut warnings = vec![];
    let (mut metrics, workings, chart, sensitivity, title, summary, mut conclusions) = match kind {
        "bond" => {
            let amount = get("amount");
            let tenor = get("tenor");
            let benchmark = treasury(data, tenor);
            let y = benchmark + get("spread") / 100.;
            let price = bond_price(get("coupon"), y, tenor);
            let gross = amount * price / 100.;
            let fees = amount * get("fees") / 10000.;
            let interest = amount * get("coupon") / 100.;
            let price_up = bond_price(get("coupon"), y + 0.01, tenor);
            let price_down = bond_price(get("coupon"), y - 0.01, tenor);
            let dv01 = (price_down - price_up) / 2. * amount / 100.;
            let sens:Vec<Value>=[-50.,0.,50.,100.].iter().map(|d|{let spread=(get("spread")+d).max(0.);let yield_=benchmark+spread/100.;json!({"label":format!("{spread:.0} bps"),"value":bond_price(get("coupon"),yield_,tenor),"secondary":yield_,"unit":"per 100","secondaryUnit":"% yield"})}).collect();
            (vec![stat("yield","Indicative issue yield",y,"%"),stat("netProceeds","Net proceeds",gross-fees,"USDm"),stat("interest","Annual coupon cost",interest,"USDm")],vec![row("Treasury reference",benchmark,"%","Linear interpolation of published Treasury par yields at selected tenor"),row("Credit spread assumption",get("spread"),"bps","Analyst assumption, not an observed issuer spread"),row("Issue yield",y,"%","Treasury reference + credit spread / 100"),row("Price per 100",price,"per 100","Σ semiannual coupon / (1 + yield/2)^t + 100 / (1 + yield/2)^N"),row("Gross proceeds",gross,"USDm","Notional × price / 100"),row("Fees",fees,"USDm","Notional × fee bps / 10,000"),row("Net proceeds",gross-fees,"USDm","Gross proceeds − fees"),row("Annual coupon cash cost",interest,"USDm","Notional × coupon / 100"),row("DV01 at notional",dv01,"USDm / bp","Central difference: (PV at −1bp − PV at +1bp) / 2"),row("Net debt / EBITDA proxy",(debt-cash+amount)/ebitda,"x","(Existing debt − cash + new notional) / EBITDA proxy; assumes proceeds deployed")],json!({"type":"curve","points":data["curve"]["points"],"highlight":tenor,"label":"U.S. Treasury par curve","xLabel":"Maturity (years)","yLabel":"Yield (%)"}),sens,"USD bond financing".to_string(),format!("A {tenor:.0}-year issue implies a {y:.2}% yield with an assumed {:.0} bps credit spread.",get("spread")),vec![format!("A USD {amount:.0}m notional generates USD {:.1}m of proceeds after fees under this scenario.",gross-fees),format!("A 50 bps increase in yield changes the price to {:.2} per 100 at the same coupon.",bond_price(get("coupon"),y+0.5,tenor)),"Confirm issuer spread, issuance window and debt capacity before moving from an indicative scenario to execution.".into()])
        }
        "buyback" => {
            let amount = get("amount");
            let price = get("sharePrice");
            let repurchased = amount / price;
            if repurchased >= shares {
                return Err("Repurchase would retire all modeled shares".into());
            }
            let lost_income = amount * cash_yield / 100. * (1. - get("tax") / 100.);
            let pf_ni = ni - lost_income;
            let newshares = shares - repurchased;
            let eps = pf_ni / newshares;
            let uplift = (eps / base_eps - 1.) * 100.;
            if amount > cash {
                warnings.push(
                    "Repurchase exceeds reported cash. A financing plan is required.".to_string(),
                )
            }
            let sens:Vec<Value>=[0.8,0.9,1.,1.1,1.2].iter().filter(|r| amount / (price * **r) < shares).map(|r|{let pr=price*r;json!({"label":format!("${pr:.0}"),"value":((ni-lost_income)/(shares-amount/pr)/base_eps-1.)*100.,"secondary":amount/pr,"unit":"% EPS change","secondaryUnit":"m shares"})}).collect();
            (vec![stat("retired","Shares repurchased",repurchased,"m shares"),stat("eps","Illustrative pro forma EPS",eps,"USD/share"),stat("accretion","EPS change",uplift,"%")],vec![row("Historical earnings to common",ni,"USDm","Reported common earnings in latest annual filing"),row("Historical diluted shares",shares,"m shares","Reported weighted-average diluted shares; full-period exercise"),row("Historical modeled EPS",base_eps,"USD/share","Common earnings / weighted-average diluted shares"),row("Repurchased shares",repurchased,"m shares","Repurchase amount / assumed execution price"),row("Lost after-tax cash income",lost_income,"USDm","Spend × 1-year Treasury yield / 100 × (1 − tax / 100)"),row("Pro forma earnings",pf_ni,"USDm","Historical common earnings − lost after-tax cash income"),row("Pro forma diluted shares",newshares,"m shares","Historical diluted shares − repurchased shares"),row("Pro forma EPS",eps,"USD/share","Pro forma common earnings / pro forma diluted shares"),row("EPS change",uplift,"%","(Pro forma EPS / historical modeled EPS − 1) × 100"),row("Remaining cash",cash-amount,"USDm","Reported cash − repurchase spend")],json!({"type":"bars","label":"Diluted shares (millions)","items":[{"label":"Before","value":shares},{"label":"After repurchase","value":newshares}]}),sens,"Share repurchase".to_string(),format!("A USD {amount:.0}m cash-funded repurchase changes modeled EPS by {uplift:+.2}% at an assumed ${price:.2} execution price."),vec![format!("The scenario retires {repurchased:.2}m shares and leaves USD {:.0}m of reported cash before other cash flows.",cash-amount),format!("The earnings comparison includes USD {lost_income:.1}m of lost after-tax cash income using the 1-year Treasury reference."),"EPS accretion does not establish value creation. Compare the execution price with fundamental value and liquidity needs.".into()])
        }
        _ => {
            let target_debt = fact(data, "CPB", "debt");
            let target_cash = fact(data, "CPB", "cash");
            let target_ni = fact(data, "CPB", "netIncome");
            let target_ebitda = fact(data, "CPB", "operatingIncome") + fact(data, "CPB", "da");
            let equity = get("targetShares") * get("targetPrice") * (1. + get("premium") / 100.);
            let ev = equity + target_debt - target_cash;
            let raised = equity * get("debtPercent") / 100.;
            let cash_used = equity - raised;
            let debt_yield = treasury(data, 5.) + get("spread") / 100.;
            let interest = raised * debt_yield / 100.;
            let lost = cash_used * cash_yield / 100.;
            let pf_ni =
                ni + target_ni + (get("synergies") - interest - lost) * (1. - get("tax") / 100.);
            let eps = pf_ni / shares;
            let acc = (eps / base_eps - 1.) * 100.;
            let pf_cash = cash + target_cash - cash_used;
            let pf_netdebt = debt + target_debt + raised - pf_cash;
            let leverage = pf_netdebt / (ebitda + target_ebitda + get("synergies"));
            warnings.push("Fiscal periods differ: PepsiCo FY2025 and Campbell’s FY2026. This exercise is not calendarized or LTM.".to_string());
            warnings.push("Deal shares and stock prices are scenario assumptions. EPS excludes purchase accounting, transaction costs and integration timing.".to_string());
            if cash_used > cash {
                warnings.push("Cash funding exceeds the acquirer’s reported cash balance.".into())
            }
            if leverage > 3.5 {
                warnings.push("Pro forma leverage exceeds the illustrative 3.5x discussion threshold, not a rating-agency limit.".into())
            }
            let sens:Vec<Value>=[0.,10.,20.,30.,40.].iter().map(|prem|{let eq=get("targetShares")*get("targetPrice")*(1.+prem/100.);let newdebt=eq*get("debtPercent")/100.;let cashpart=eq-newdebt;let inc=ni+target_ni+(get("synergies")-newdebt*debt_yield/100.-cashpart*cash_yield/100.)*(1.-get("tax")/100.);json!({"label":format!("{prem:.0}% premium"),"value":(inc/ni-1.)*100.,"secondary":eq,"unit":"% EPS change","secondaryUnit":"USDm equity"})}).collect();
            (vec![stat("equity","Equity purchase price",equity,"USDm"),stat("multiple","EV / EBITDA proxy",ev/target_ebitda,"x"),stat("leverage","Pro forma net leverage",leverage,"x")],vec![row("Equity purchase price",equity,"USDm","Assumed deal shares × assumed target price × (1 + premium / 100)"),row("Target enterprise value",ev,"USDm","Equity purchase price + target debt − target cash; excludes other EV adjustments"),row("EV / EBITDA proxy",ev/target_ebitda,"x","Target enterprise value / (reported operating income + D&A)"),row("New acquisition debt",raised,"USDm","Equity purchase price × debt funding percentage / 100"),row("Acquirer cash contribution",cash_used,"USDm","Equity purchase price − new acquisition debt"),row("Financing yield assumption",debt_yield,"%","5-year Treasury reference + assumed credit spread / 100"),row("Incremental debt interest",interest,"USDm","New debt × financing yield / 100"),row("Pro forma common earnings",pf_ni,"USDm","Acquirer + target common earnings + (synergy − debt interest − lost cash interest) × (1 − tax)"),row("Pro forma EPS before PPA",eps,"USD/share","Pro forma common earnings / acquirer diluted shares; no new equity issuance"),row("EPS change before PPA",acc,"%","(Pro forma EPS / historical modeled EPS − 1) × 100"),row("Combined remaining cash",pf_cash,"USDm","Acquirer cash + target cash − cash contribution"),row("Pro forma net debt",pf_netdebt,"USDm","Acquirer debt + target debt + new financing − combined remaining cash"),row("Pro forma net leverage",leverage,"x","Pro forma net debt / (acquirer + target EBITDA proxies + full synergies)")],json!({"type":"bars","label":"Sources for equity purchase price (USDm)","items":[{"label":"New debt","value":raised},{"label":"Acquirer cash","value":cash_used}]}),sens,"Peer acquisition".to_string(),format!("The hypothetical Campbell’s acquisition implies {leverage:.2}x net leverage and {acc:+.2}% EPS change before purchase accounting."),vec![format!("The equity purchase price is USD {equity:.0}m, with USD {raised:.0}m of new acquisition financing."),format!("The scenario includes USD {:.0}m of annual pre-tax synergies. Test a no-synergy case before relying on them.",get("synergies")),"This is a financial scenario, not an announced transaction or assessment of strategic, regulatory or execution feasibility.".into()])
        }
    };
    warnings.push("Stock prices, credit spreads, financing and transaction terms are analyst assumptions unless a dated quote has been explicitly applied.".into());
    warnings.push("EBITDA proxy means reported operating income plus reported D&A. It is not adjusted EBITDA or a covenant/rating metric.".into());
    if let Some(first) = conclusions.first_mut() {
        if !first.ends_with('.') {
            first.push('.')
        }
    }
    metrics.push(stat(
        "baseLeverage",
        "Existing net debt / EBITDA proxy",
        base_leverage,
        "x",
    ));
    Ok(
        json!({"engine":ENGINE,"title":title,"company":"PepsiCo","summary":summary,"metrics":metrics,"workings":workings,"chart":chart,"sensitivity":sensitivity,"conclusions":conclusions,"warnings":warnings,"references":{"curveDate":data["curve"]["date"],"asOf":data["asOf"],"cashYield":cash_yield,"benchmark":treasury(data,if kind=="bond"{get("tenor")}else{5.}),"baseEPS":base_eps,"baseLeverage":base_leverage}}),
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    fn data() -> Value {
        serde_json::from_str(include_str!("../data/public-snapshot.json")).unwrap()
    }
    #[test]
    fn par_bond_is_par() {
        for y in [0., 1., 5., 12.] {
            assert!((bond_price(y, y, 5.) - 100.).abs() < 1e-9)
        }
    }
    #[test]
    fn price_falls_as_yield_rises() {
        assert!(bond_price(5., 6., 5.) < bond_price(5., 4., 5.))
    }
    #[test]
    fn zero_coupon_matches_discount() {
        assert!((bond_price(0., 5., 5.) - 100. / 1.025_f64.powi(10)).abs() < 1e-9)
    }
    #[test]
    fn unknown_and_invalid_inputs_fail() {
        let mut p = defaults("bond");
        p.insert("spread".into(), f64::NAN);
        assert!(calculate(&data(), "bond", &p).is_err());
        p = defaults("bond");
        p.insert("tenor".into(), 5.5);
        assert!(validate("bond", &p).is_err())
    }
    #[test]
    fn higher_premium_lowers_acquisition_eps() {
        let d = data();
        let p = defaults("acquisition");
        let a = calculate(&d, "acquisition", &p).unwrap();
        let mut p = p;
        p.insert("premium".into(), 40.);
        let b = calculate(&d, "acquisition", &p).unwrap();
        assert!(
            a["workings"][9]["value"].as_f64().unwrap()
                > b["workings"][9]["value"].as_f64().unwrap()
        );
    }
    #[test]
    fn buyback_keeps_cash_opportunity_cost() {
        let d = data();
        let p = defaults("buyback");
        let m = calculate(&d, "buyback", &p).unwrap();
        let lost = 500. * treasury(&d, 1.) / 100. * 0.75;
        assert!((m["workings"][4]["value"].as_f64().unwrap() - lost).abs() < 1e-9)
    }
    #[test]
    fn every_scenario_has_finite_workings() {
        for k in ["bond", "buyback", "acquisition"] {
            let m = calculate(&data(), k, &defaults(k)).unwrap();
            for r in m["workings"].as_array().unwrap() {
                assert!(r["value"].as_f64().unwrap().is_finite())
            }
        }
    }
}
