//! Inspectable IPO mechanics and a debt-sweep LBO, deliberately bounded methods.
use super::*;
pub fn defaults(kind: &str) -> Params {
    let p = if kind == "ipo" {
        vec![
            ("evMultiple", 12.),
            ("primaryRaise", 500.),
            ("offerDiscount", 10.),
            ("fees", 5.),
        ]
    } else {
        vec![
            ("entryMultiple", 10.),
            ("exitMultiple", 10.),
            ("leverage", 5.),
            ("interestRate", 8.),
            ("growth", 4.),
            ("cashConversion", 40.),
            ("fees", 2.),
            ("years", 5.),
        ]
    };
    p.into_iter().map(|(k, v)| (k.into(), v)).collect()
}
pub fn validate(kind: &str, p: &Params) -> Result<(), String> {
    let expected = defaults(kind);
    if p.len() != expected.len() || p.keys().any(|k| !expected.contains_key(k)) {
        return Err("Unexpected or missing capital-model assumption".into());
    }
    for (k, v) in p {
        let (lo, hi) = match k.as_str() {
            "evMultiple" | "entryMultiple" | "exitMultiple" => (1., 50.),
            "primaryRaise" => (1., 100000.),
            "offerDiscount" => (0., 50.),
            "fees" => (0., 15.),
            "leverage" => (0., 12.),
            "interestRate" => (0., 30.),
            "growth" => (-30., 30.),
            "cashConversion" => (0., 90.),
            "years" => (1., 10.),
            _ => (0., 0.),
        };
        if !v.is_finite() || *v < lo || *v > hi {
            return Err(format!("{k} must be between {lo} and {hi}"));
        }
        if k == "years" && v.fract() != 0. {
            return Err("Holding period must be whole years".into());
        }
    }
    Ok(())
}
fn metric(key: &str, label: &str, value: Option<f64>, unit: &str) -> Value {
    json!({"key":key,"label":label,"value":value,"unit":unit})
}
fn row(label: &str, value: Option<f64>, unit: &str, formula: &str) -> Value {
    json!({"label":label,"value":value,"unit":unit,"formula":formula})
}
pub fn calculate(data: &Value, kind: &str, p: &Params, issuer: &str) -> Result<Value, String> {
    validate(kind, p)?;
    let c = data["companies"]
        .as_array()
        .and_then(|cs| cs.iter().find(|c| c["symbol"] == issuer))
        .ok_or("Retrieve issuer facts before modelling")?;
    for key in ["debt", "cash", "shares", "operatingIncome", "da"] {
        if c["facts"][key]["value"].as_f64().is_none() {
            return Err(format!("Missing input {key}"));
        }
    }
    let f = |key: &str| finance::fact(data, issuer, key);
    let ebitda = f("operatingIncome") + f("da");
    let netdebt = f("debt") - f("cash");
    let shares = f("shares");
    if ebitda <= 0. || shares <= 0. {
        return Err("Positive EBITDA proxy and shares required".into());
    }
    let mut schedule = vec![];
    let mut warnings=vec!["Public listed-company accounts are a modelling proxy. This is not an announced listing, executable valuation or acquisition offer.".to_string(),"EBITDA is reported operating income plus D&A, not adjusted EBITDA. Multiples, forecasts, capital structure and execution terms are explicit scenario assumptions.".into()];
    let (title, mut metrics, workings, chart, sensitivity) = if kind == "ipo" {
        let ev = ebitda * p["evMultiple"];
        let pre = ev - netdebt;
        if pre <= 0. {
            return Err("Enterprise value does not cover existing net debt; positive offer equity is required".into());
        }
        let offered = pre * (1. - p["offerDiscount"] / 100.);
        let price = offered / shares;
        let newshares = p["primaryRaise"] / price;
        let postshares = shares + newshares;
        let fees = p["primaryRaise"] * p["fees"] / 100.;
        let net = p["primaryRaise"] - fees;
        let dilution = newshares / postshares * 100.;
        let metrics = vec![
            metric(
                "offerPrice",
                "Illustrative offer price",
                Some(price),
                "USD/share",
            ),
            metric("netProceeds", "Net primary proceeds", Some(net), "USDm"),
            metric("dilution", "New investor ownership", Some(dilution), "%"),
            metric(
                "enterpriseValue",
                "Enterprise value before offer discount",
                Some(ev),
                "USDm",
            ),
            metric(
                "preMoneyEquity",
                "Pre-money equity before discount",
                Some(pre),
                "USDm",
            ),
            metric(
                "newShares",
                "New shares issued",
                Some(newshares),
                "m shares",
            ),
        ];
        let workings = vec![
            row(
                "EBITDA proxy",
                Some(ebitda),
                "USDm",
                "Reported operating income + D&A",
            ),
            row(
                "Enterprise value before offer discount",
                Some(ev),
                "USDm",
                "EBITDA proxy × assumed EV/EBITDA multiple",
            ),
            row(
                "Pre-money equity before discount",
                Some(pre),
                "USDm",
                "Enterprise value − reported debt + reported cash; other equity-bridge adjustments excluded",
            ),
            row(
                "Illustrative offer price",
                Some(price),
                "USD/share",
                "Pre-money equity × (1 − offer discount (%)/100) / historical diluted shares (m)",
            ),
            row(
                "New shares issued",
                Some(newshares),
                "m shares",
                "Gross primary proceeds (USDm) / offer price (USD/share)",
            ),
            row(
                "Net primary proceeds",
                Some(net),
                "USDm",
                "Gross primary proceeds × (1 − fee (%)/100)",
            ),
            row(
                "New investor ownership",
                Some(dilution),
                "%",
                "New shares / (historical diluted shares + new shares) ×100",
            ),
            row(
                "Post-money equity at offer price",
                Some(offered + p["primaryRaise"]),
                "USDm",
                "Discounted pre-money offer equity + gross primary proceeds; fee cash outflow shown separately",
            ),
        ];
        schedule.push(json!({"stage":"Pre-money","equity":offered,"shares":shares}));
        schedule.push(json!({"stage":"Post-primary issuance","equity":offered+p["primaryRaise"],"shares":postshares}));
        warnings.push("Assumes a wholly primary issuance, historical diluted shares as a proxy, and simplified net-debt bridge. Excludes secondary sales, options, free float, bookbuilding and forecast-based valuation. Discount is a scenario, not market evidence.".into());
        let sensitivity=[8.,10.,12.,14.,16.].iter().map(|m|json!({"label":format!("{m}x EV/EBITDA"),"value":(ebitda*m-netdebt)*(1.-p["offerDiscount"]/100.)/shares,"unit":"USD/share"})).collect::<Vec<_>>();
        (
            "Illustrative listing and primary issuance",
            metrics,
            workings,
            json!({"type":"bars","label":"Primary proceeds (USDm)","items":[{"label":"Net proceeds","value":net},{"label":"Fees","value":fees}]}),
            sensitivity,
        )
    } else {
        let ev = ebitda * p["entryMultiple"];
        let fees = ev * p["fees"] / 100.;
        let uses = ev + fees;
        let mut debt = ebitda * p["leverage"];
        let sponsor = uses - debt;
        if sponsor <= 0. {
            return Err(
                "Debt exceeds transaction uses; positive sponsor equity is required".into(),
            );
        }
        let mut annual = ebitda;
        let mut cash = 0.;
        let mut gap = 0.;
        let years = p["years"] as i32;
        for year in 1..=years {
            annual *= 1. + p["growth"] / 100.;
            let opening = debt;
            let interest = opening * p["interestRate"] / 100.;
            let before_interest = annual * p["cashConversion"] / 100.;
            let after_interest = before_interest - interest;
            let shortfall = (-after_interest).max(0.);
            gap += shortfall;
            let repayment = after_interest.max(0.).min(debt);
            debt -= repayment;
            cash += (after_interest - repayment).max(0.);
            schedule.push(json!({"year":year,"ebitda":annual,"openingDebt":opening,"interest":interest,"cashBeforeInterest":before_interest,"cashAfterInterest":after_interest,"debtRepayment":repayment,"closingDebt":debt,"excessCash":cash,"unfundedCashShortfall":shortfall}));
        }
        let exit_ev = annual * p["exitMultiple"];
        let equity = (exit_ev - debt + cash).max(0.);
        let moic = if gap > 1e-6 {
            None
        } else {
            Some(equity / sponsor)
        };
        let irr = moic.map(|m| (m.powf(1. / years as f64) - 1.) * 100.);
        if gap > 1e-6 {
            warnings.push("Unfunded operating cash shortfall: return ratios are suppressed. No automatic revolver, sponsor cure or negative debt was invented.".into());
        }
        let metrics = vec![
            metric(
                "sponsorEquity",
                "Sponsor equity contribution",
                Some(sponsor),
                "USDm",
            ),
            metric("irr", "Illustrative sponsor IRR", irr, "%"),
            metric("moic", "Sponsor MOIC", moic, "x"),
            metric("exitEquity", "Exit equity proceeds", Some(equity), "USDm"),
            metric("exitDebt", "Debt at exit", Some(debt), "USDm"),
            metric(
                "cashShortfall",
                "Unfunded cash shortfall",
                Some(gap),
                "USDm",
            ),
        ];
        let workings = vec![
            row(
                "Entry enterprise value",
                Some(ev),
                "USDm",
                "Reported EBITDA proxy × entry EV/EBITDA assumption",
            ),
            row(
                "Transaction uses",
                Some(uses),
                "USDm",
                "Entry enterprise value × (1 + transaction fees (%)/100); debt-free cash-free purchase, old net debt settled outside sponsor equity bridge",
            ),
            row(
                "Initial acquisition debt",
                Some(ebitda * p["leverage"]),
                "USDm",
                "Entry EBITDA proxy × opening leverage assumption",
            ),
            row(
                "Sponsor equity contribution",
                Some(sponsor),
                "USDm",
                "Transaction uses − acquisition debt",
            ),
            row(
                "Debt at exit",
                Some(debt),
                "USDm",
                "Each year: opening debt − min(max(EBITDA × cash conversion (%)/100 − cash interest,0), opening debt)",
            ),
            row(
                "Exit equity proceeds",
                Some(equity),
                "USDm",
                "max(exit EBITDA × exit multiple − ending debt + retained excess cash,0)",
            ),
            row(
                "Sponsor MOIC",
                moic,
                "x",
                "Exit equity proceeds / sponsor equity; undefined while an operating cash deficit is unfunded",
            ),
            row(
                "Illustrative sponsor IRR",
                irr,
                "%",
                "[(exit equity / sponsor equity)^(1 / whole holding years) −1] ×100; no interim sponsor distributions",
            ),
            row(
                "Unfunded cash shortfall",
                Some(gap),
                "USDm",
                "Sum max(cash interest − pre-interest cash generation,0); no funding cure assumed",
            ),
        ];
        warnings.push("Single debt tranche; interest on opening debt; annual debt sweep; retained excess cash added at exit. Cash conversion is AFTER tax/capex/working capital but BEFORE interest; no interest tax shield. Excludes PPA, revolver, multiple tranches, covenants, refinancing and management equity.".into());
        let sensitivity=[6.,8.,10.,12.,14.].iter().map(|m|json!({"label":format!("{m}x exit"),"value":if gap>1e-6{None}else{Some((((annual*m-debt+cash).max(0.)/sponsor).powf(1./years as f64)-1.)*100.)},"unit":"%"})).collect::<Vec<_>>();
        (
            "Illustrative leveraged buyout",
            metrics,
            workings,
            json!({"type":"bars","label":"Acquisition funding (USDm)","items":[{"label":"Sponsor equity","value":sponsor},{"label":"Acquisition debt","value":ebitda*p["leverage"]}]}),
            sensitivity,
        )
    };
    metrics.push(metric(
        "baseLeverage",
        "Existing net debt / EBITDA proxy",
        Some(netdebt / ebitda),
        "x",
    ));
    Ok(
        json!({"engine":finance::ENGINE,"title":title,"company":c["name"],"issuer":issuer,"target":null,"summary":title,"metrics":metrics,"workings":workings,"schedule":schedule,"chart":chart,"sensitivity":sensitivity,"warnings":warnings,"conclusions":["Illustrative scenario, subject to independent banker review and input reconciliation."],"references":{"baseLeverage":netdebt/ebitda,"baseEPS":finance::fact(data,issuer,"netIncome")/shares,"asOf":data["asOf"],"curveDate":data["curve"]["date"]}}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    fn data() -> Value {
        let mut facts = serde_json::Map::new();
        for (k, v, u) in [
            ("debt", 200., "USD"),
            ("cash", 20., "USD"),
            ("shares", 10., "shares"),
            ("operatingIncome", 80., "USD"),
            ("da", 20., "USD"),
            ("netIncome", 30., "USD"),
        ] {
            facts.insert(k.into(), json!({"value":v*1e6,"unit":u}));
        }
        json!({"companies":[{"symbol":"TEST","name":"Synthetic independent arithmetic fixture","facts":facts}],"curve":null})
    }
    fn value(m: &Value, key: &str) -> f64 {
        m["metrics"]
            .as_array()
            .unwrap()
            .iter()
            .find(|x| x["key"] == key)
            .unwrap()["value"]
            .as_f64()
            .unwrap()
    }
    #[test]
    fn ipo_share_bridge_and_fees_reconcile() {
        let mut p = defaults("ipo");
        p.insert("evMultiple".into(), 10.);
        p.insert("primaryRaise".into(), 200.);
        let m = calculate(&data(), "ipo", &p, "TEST").unwrap();
        assert!((value(&m, "offerPrice") - 73.8).abs() < 1e-10);
        assert_eq!(value(&m, "netProceeds"), 190.);
        let issued = 200. / 73.8;
        assert!((value(&m, "dilution") - issued / (10. + issued) * 100.).abs() < 1e-10);
        assert!(((10. + issued) * 73.8 - 938.).abs() < 1e-10);
        p.insert("fees".into(), 10.);
        let high = calculate(&data(), "ipo", &p, "TEST").unwrap();
        assert_eq!(value(&high, "netProceeds"), 180.);
        assert_eq!(value(&high, "offerPrice"), value(&m, "offerPrice"));
    }
    #[test]
    fn lbo_debt_matches_closed_form_annuity_and_sponsor_returns() {
        let mut p = defaults("lbo");
        p.insert("growth".into(), 0.);
        p.insert("cashConversion".into(), 60.);
        let m = calculate(&data(), "lbo", &p, "TEST").unwrap();
        let factor = 1.08_f64.powi(5);
        let debt = 500. * factor - 60. * (factor - 1.) / 0.08;
        assert!((value(&m, "exitDebt") - debt).abs() < 1e-10);
        let moic = (1000. - debt) / 520.;
        assert!((value(&m, "moic") - moic).abs() < 1e-10);
        assert!((value(&m, "irr") - (moic.powf(0.2) - 1.) * 100.).abs() < 1e-10);
        assert_eq!(m["schedule"].as_array().unwrap().len(), 5);
    }
    #[test]
    fn unfunded_lbo_deficit_suppresses_return_claim() {
        let mut p = defaults("lbo");
        p.insert("growth".into(), 0.);
        p.insert("cashConversion".into(), 10.);
        let m = calculate(&data(), "lbo", &p, "TEST").unwrap();
        assert_eq!(value(&m, "cashShortfall"), 150.);
        assert!(
            m["metrics"]
                .as_array()
                .unwrap()
                .iter()
                .find(|x| x["key"] == "irr")
                .unwrap()["value"]
                .is_null()
        );
        assert_eq!(value(&m, "exitDebt"), 500.);
    }
    #[test]
    fn debt_free_lbo_retains_excess_cash_and_invalid_terms_fail() {
        let mut p = defaults("lbo");
        p.insert("growth".into(), 0.);
        p.insert("leverage".into(), 0.);
        let m = calculate(&data(), "lbo", &p, "TEST").unwrap();
        assert_eq!(value(&m, "exitEquity"), 1200.);
        p.insert("years".into(), 2.5);
        assert!(calculate(&data(), "lbo", &p, "TEST").is_err());
        let mut p = defaults("ipo");
        p.insert("evMultiple".into(), 1.);
        assert!(calculate(&data(), "ipo", &p, "TEST").is_err());
    }
}
