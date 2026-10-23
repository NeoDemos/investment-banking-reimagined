//! Exact dependencies for the figures used in the client decision comparison.
use super::*;
fn unit(k: &str) -> &'static str {
    match k {
        "amount" | "synergies" => "USDm",
        "targetShares" => "m shares",
        "sharePrice" | "targetPrice" => "USD/share",
        "spread" | "fees" => "bps",
        "tenor" => "years",
        _ => "%",
    }
}
fn scenario(a: &Value, k: &str) -> Value {
    json!({"id":format!("assumption:{}:{k}",a["id"].as_str().unwrap()),"label":k,"classification":"illustrative assumption","value":a["params"][k],"unit":if ["ipo","lbo"].contains(&a["kind"].as_str().unwrap_or("")){match k{"evMultiple"|"entryMultiple"|"exitMultiple"|"leverage"=>"x","years"=>"years","primaryRaise"=>"USDm",_=>"%"}}else{unit(k)},"owner":"Banker-confirmed scenario","rationale":a["assumptionRationale"],"range":"Not independently assessed; use sensitivities","sourceUrl":null})
}
fn fact(a: &Value, symbol: &str, k: &str) -> Value {
    let c = a["sourceSnapshot"]["companies"]
        .as_array()
        .unwrap()
        .iter()
        .find(|c| c["symbol"] == symbol)
        .unwrap();
    let f = &c["facts"][k];
    let reported: Vec<&Value> = if let Some(parts) = f["inputs"].as_array() {
        parts.iter().collect()
    } else {
        vec![f]
    };
    let concepts:Vec<Value>=reported.iter().filter(|part|part["taxonomy"]!="issuer-report-label").map(|part|json!({"tag":part["tag"],"url":format!("https://data.sec.gov/api/xbrl/companyconcept/CIK{}/us-gaap/{}.json",c["cik"].as_str().unwrap(),part["tag"].as_str().unwrap()),"context":"Match the retained accession, units and period; this link is a fact series, not a verified document anchor"})).collect();
    json!({"id":f["evidenceId"],"label":format!("{symbol} {k}"),"cik":c["cik"],"classification":if f["inputs"].is_array(){"derived from reported components"}else{"reported observation"},"definition":f["basis"],"value":f["value"].as_f64().unwrap()/1e6,"unit":if k=="shares"{"m shares"}else{"USDm"},"reportedValue":f["value"],"reportedUnit":f["unit"],"periodStart":f["periodStart"],"periodEnd":f["periodEnd"],"filed":f["filed"],"sourceUrl":f["sourceUrl"],"sourceDestination":if f["taxonomy"]=="issuer-report-label"{"issuer annual report"}else{"filing directory"},"tag":f["tag"],"accession":f["accession"],"components":f["inputs"],"conceptLinks":concepts})
}
fn curve(a: &Value, years: f64) -> Value {
    let c = &a["sourceSnapshot"]["curve"];
    let p = c["points"].as_array().unwrap();
    let selected = p
        .windows(2)
        .find(|w| {
            years >= w[0]["years"].as_f64().unwrap() && years <= w[1]["years"].as_f64().unwrap()
        })
        .map(|w| json!(w))
        .unwrap_or_else(|| json!(p.last().unwrap()));
    json!({"id":format!("curve:USD:{}:{years}",c["date"].as_str().unwrap()),"label":format!("{years}-year Treasury par reference"),"classification":"dated public rate reference","value":finance::treasury(&a["sourceSnapshot"],years),"unit":"%","date":c["date"],"sourceUrl":c["sourceUrl"],"interpolationPoints":selected,"method":"Linear interpolation of par yields; not a spot curve or issuer quote"})
}
fn add(
    out: &mut Value,
    a: &Value,
    key: &str,
    label: &str,
    value: f64,
    u: &str,
    formula: &str,
    parameters: &[&str],
    issuer_facts: &[&str],
    target_facts: &[&str],
    rate: Option<f64>,
) {
    let mut inputs: Vec<Value> = parameters.iter().map(|k| scenario(a, k)).collect();
    let issuer = a["issuer"].as_str().unwrap();
    let target = a["target"].as_str().unwrap_or(issuer);
    inputs.extend(issuer_facts.iter().map(|k| fact(a, issuer, k)));
    inputs.extend(target_facts.iter().map(|k| fact(a, target, k)));
    if let Some(y) = rate {
        inputs.push(curve(a, y));
    }
    out[key] = json!({"label":label,"value":value,"unit":u,"formula":formula,"engine":finance::ENGINE,"analysisId":a["id"],"inputs":inputs,"limitation":"Illustrative deterministic scenario. EBITDA is an operating-income-plus-D&A proxy; no live quote, rating, covenant or execution assessment."});
}
pub fn attach(room: &mut Value, id: &str) -> Result<(), ApiError> {
    let a = room["analyses"][id].clone();
    let m = &a["model"];
    let p = &a["params"];
    let get = |k: &str| {
        m["metrics"]
            .as_array()
            .unwrap()
            .iter()
            .find(|x| x["key"] == k)
            .unwrap()["value"]
            .as_f64()
            .unwrap()
    };
    let mut out = json!({});
    add(
        &mut out,
        &a,
        "baseLeverage",
        "Existing net debt / EBITDA proxy",
        get("baseLeverage"),
        "x",
        "(Reported debt − reported cash) / (reported operating income + reported D&A)",
        &[],
        &["debt", "cash", "operatingIncome", "da"],
        &[],
        None,
    );
    if ["ipo", "lbo"].contains(&a["kind"].as_str().unwrap()) {
        let mut inputs: Vec<Value> = p
            .as_object()
            .unwrap()
            .keys()
            .map(|k| scenario(&a, k))
            .collect();
        for key in ["debt", "cash", "operatingIncome", "da", "shares"] {
            inputs.push(fact(&a, a["issuer"].as_str().unwrap(), key));
        }
        for metric in m["metrics"].as_array().unwrap() {
            let key = metric["key"].as_str().unwrap();
            let label = metric["label"].as_str().unwrap();
            let formula=m["workings"].as_array().unwrap().iter().find(|w|w["label"]==label).map(|w|w["formula"].clone()).unwrap_or(json!("Derived from the stored annual schedule and explicit scenario assumptions; inspect the complete model"));
            out[key] = json!({"label":label,"value":metric["value"],"unit":metric["unit"],"formula":formula,"engine":finance::ENGINE,"analysisId":id,"inputs":inputs,"limitation":m["warnings"]});
        }
        room["analyses"][id]["lineage"] = out;
        return Ok(());
    }
    match a["kind"].as_str().unwrap() {
        "bond" => {
            let tenor = p["tenor"].as_f64().unwrap();
            add(
                &mut out,
                &a,
                "yield",
                "Indicative issue yield",
                get("yield"),
                "%",
                "Interpolated Treasury par reference + assumed spread / 100",
                &["tenor", "spread"],
                &[],
                &[],
                Some(tenor),
            );
            add(
                &mut out,
                &a,
                "netProceeds",
                "Net proceeds",
                get("netProceeds"),
                "USDm",
                finance::BOND_NET_FORMULA,
                &["amount", "coupon", "tenor", "spread", "fees"],
                &[],
                &[],
                Some(tenor),
            );
            add(
                &mut out,
                &a,
                "interest",
                "Annual coupon cash cost",
                get("interest"),
                "USDm",
                "Notional × coupon / 100; this is not the all-in financing cost",
                &["amount", "coupon"],
                &[],
                &[],
                None,
            );
            let leverage = m["workings"]
                .as_array()
                .unwrap()
                .iter()
                .find(|w| w["label"] == "Net debt / EBITDA proxy")
                .unwrap()["value"]
                .as_f64()
                .unwrap();
            add(
                &mut out,
                &a,
                "postUseLeverage",
                "Net leverage after proceeds deployed",
                leverage,
                "x",
                "(Reported debt − reported cash + new notional) / (reported operating income + D&A). Assumes proceeds deployed, not held as cash.",
                &["amount"],
                &["debt", "cash", "operatingIncome", "da"],
                &[],
                None,
            );
            add(
                &mut out,
                &a,
                "fees",
                "Upfront issue fees",
                p["amount"].as_f64().unwrap() * p["fees"].as_f64().unwrap() / 10000.,
                "USDm",
                "Notional × fee bps / 10,000",
                &["amount", "fees"],
                &[],
                &[],
                None,
            );
            add(
                &mut out,
                &a,
                "tenor",
                "Refinancing horizon",
                tenor,
                "years",
                "Contractual scenario tenor; no forecast of refinancing availability or future rates",
                &["tenor"],
                &[],
                &[],
                None,
            );
            if let Some(need) = room["mandate"]["fundingNeed"].as_f64() {
                let gap = (need - get("netProceeds")).max(0.);
                let mut inputs = out["netProceeds"]["inputs"].as_array().unwrap().clone();
                inputs.push(json!({"id":"client:net-funding-requirement","classification":"client criterion","label":"Required net funding","value":need,"unit":"USDm","owner":room["mandate"]["audience"]}));
                out["fundingGap"] = json!({"label":"Unfunded requirement","value":if gap<1e-6{0.}else{gap},"unit":"USDm","analysisId":id,"formula":"max(required net funding − net proceeds, 0); USD 1 tolerance","inputs":inputs,"engine":finance::ENGINE});
            }
        }
        "buyback" => {
            add(
                &mut out,
                &a,
                "cashReturned",
                "Cash returned",
                p["amount"].as_f64().unwrap(),
                "USDm",
                "Explicit repurchase spend assumption",
                &["amount"],
                &[],
                &[],
                None,
            );
            add(
                &mut out,
                &a,
                "retired",
                "Shares repurchased",
                get("retired"),
                "m shares",
                "Repurchase spend / assumed execution price",
                &["amount", "sharePrice"],
                &[],
                &[],
                None,
            );
            add(
                &mut out,
                &a,
                "eps",
                "Illustrative EPS",
                get("eps"),
                "USD/share",
                finance::BUYBACK_EPS_FORMULA,
                &["amount", "sharePrice", "tax"],
                &["netIncome", "shares"],
                &[],
                Some(1.),
            );
            let remaining = m["workings"]
                .as_array()
                .unwrap()
                .iter()
                .find(|w| w["label"] == "Remaining cash")
                .unwrap()["value"]
                .as_f64()
                .unwrap();
            add(
                &mut out,
                &a,
                "remainingCash",
                "Remaining cash",
                remaining,
                "USDm",
                "Reported cash − repurchase spend; before other cash flows",
                &["amount"],
                &["cash"],
                &[],
                None,
            );
        }
        _ => {
            add(
                &mut out,
                &a,
                "equity",
                "Equity purchase price",
                get("equity"),
                "USDm",
                "Assumed deal shares × assumed share price × (1 + premium / 100)",
                &["targetShares", "targetPrice", "premium"],
                &[],
                &[],
                None,
            );
            add(
                &mut out,
                &a,
                "multiple",
                "EV / EBITDA proxy",
                get("multiple"),
                "x",
                "(Equity purchase price + target debt − target cash) / (target operating income + D&A)",
                &["targetShares", "targetPrice", "premium"],
                &[],
                &["debt", "cash", "operatingIncome", "da"],
                None,
            );
            add(
                &mut out,
                &a,
                "leverage",
                "Pro forma net leverage",
                get("leverage"),
                "x",
                "(Acquirer debt + target debt + new debt − combined remaining cash) / (acquirer EBITDA proxy + target EBITDA proxy + full assumed synergies)",
                &[
                    "targetShares",
                    "targetPrice",
                    "premium",
                    "debtPercent",
                    "synergies",
                ],
                &["debt", "cash", "operatingIncome", "da"],
                &["debt", "cash", "operatingIncome", "da"],
                None,
            );
            let eps = m["workings"]
                .as_array()
                .unwrap()
                .iter()
                .find(|w| w["label"] == "Pro forma EPS before PPA")
                .unwrap()["value"]
                .as_f64()
                .unwrap();
            add(
                &mut out,
                &a,
                "eps",
                "EPS before purchase accounting",
                eps,
                "USD/share",
                finance::ACQUISITION_EPS_FORMULA,
                &[
                    "targetShares",
                    "targetPrice",
                    "premium",
                    "debtPercent",
                    "synergies",
                    "spread",
                    "tax",
                ],
                &["netIncome", "shares"],
                &["netIncome"],
                Some(5.),
            );
            out["eps"]["inputs"]
                .as_array_mut()
                .unwrap()
                .push(curve(&a, 1.));
        }
    }
    room["analyses"][id]["lineage"] = out;
    Ok(())
}
