//! Request-specific evidence requirements and bounded public market adapters.
use super::*;
pub const IDS: &[&str] = &[
    "company",
    "rates",
    "rate_history",
    "credit_metrics",
    "ratings",
    "debt_terms",
    "issuer_spreads",
    "equity",
    "peers",
    "sector",
    "bank",
];
pub fn required(kind: &str) -> Vec<&'static str> {
    match kind {
        "bond" => vec![
            "company",
            "rates",
            "rate_history",
            "credit_metrics",
            "ratings",
            "debt_terms",
            "issuer_spreads",
            "bank",
        ],
        "buyback" => vec!["company", "equity", "rates", "peers", "sector"],
        "acquisition" => vec!["company", "equity", "rates", "peers", "sector", "bank"],
        "ipo" => vec!["company", "equity", "peers", "sector", "bank"],
        "lbo" => vec!["company", "credit_metrics", "peers", "sector", "bank"],
        _ => vec!["company"],
    }
}
pub fn requirements(kind: &str, proposed: &Value) -> Vec<String> {
    let mut out = required(kind)
        .into_iter()
        .map(str::to_string)
        .collect::<Vec<_>>();
    for id in proposed
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
    {
        if IDS.contains(&id) && !out.iter().any(|v| v == id) {
            out.push(id.into());
        }
    }
    out
}
pub fn relevant_sources(kind: &str, needs: &[String], allowed: &[String]) -> Vec<String> {
    allowed
        .iter()
        .filter(|id| match id.as_str() {
            "sec" | "issuer_reports" => true,
            "treasury" => needs
                .iter()
                .any(|n| ["rates", "rate_history"].contains(&n.as_str())),
            "credit" => needs
                .iter()
                .any(|n| ["ratings", "debt_terms", "issuer_spreads"].contains(&n.as_str())),
            "equity" => needs.iter().any(|n| n == "equity"),
            "sector" => needs.iter().any(|n| n == "sector"),
            "bank" => needs.iter().any(|n| n == "bank"),
            "bund" => false, // USD model methods; EUR data only through explicit legacy/context routes.
            _ => false,
        })
        .cloned()
        .collect::<Vec<_>>()
        .into_iter()
        .filter(|id| kind != "bond" || id != "sector")
        .collect()
}
pub fn reference() -> Value {
    serde_json::from_str(include_str!("../data/issuer-credit-reference.json")).unwrap()
}
pub fn normalize_history(csv: &str, asof: &str, url: &str) -> Result<Value, String> {
    if !csv.lines().next().unwrap_or("").contains("DGS3,DGS5,DGS10") {
        return Err("Unexpected Treasury history columns".into());
    }
    let end =
        chrono::NaiveDate::parse_from_str(asof, "%Y-%m-%d").map_err(|_| "Invalid as-of date")?;
    let begin = (end - chrono::Duration::days(190)).to_string();
    let mut rows = vec![];
    for line in csv.lines().skip(1) {
        let c = line.trim().split(',').collect::<Vec<_>>();
        if c.len() != 4
            || c[0].len() != 10
            || chrono::NaiveDate::parse_from_str(c[0], "%Y-%m-%d").is_err()
            || c[0] < begin.as_str()
            || c[0] > asof
        {
            continue;
        }
        let values = c[1..]
            .iter()
            .map(|s| {
                s.parse::<f64>()
                    .ok()
                    .filter(|v| v.is_finite() && *v >= 0. && *v < 40.)
            })
            .collect::<Option<Vec<_>>>();
        if let Some(v) = values {
            rows.push(json!({"date":c[0],"y3":v[0],"y5":v[1],"y10":v[2]}));
        }
    }
    rows.sort_by(|a, b| a["date"].as_str().cmp(&b["date"].as_str()));
    rows.dedup_by(|a, b| a["date"] == b["date"]);
    if rows.len() < 20 {
        return Err("Insufficient valid government yield history".into());
    }
    Ok(
        json!({"name":"Treasury yield history","source":"Federal Reserve H.15 via FRED","sourceUrl":url,"series":["DGS3","DGS5","DGS10"],"unit":"%","currency":"USD","date":rows.last().unwrap()["date"],"points":rows,"retrievedAt":now(),"basis":"Daily Treasury constant-maturity yields; government benchmark context, not issuer spreads or executable funding quotes"}),
    )
}
pub fn normalize_equity(raw: &Value, symbol: &str, asof: &str, url: &str) -> Result<Value, String> {
    let d = &raw["data"];
    if d["symbol"] != symbol || raw["symbol"] != symbol {
        return Err("Quote ticker did not match the requested company".into());
    }
    let price = d["current_price"]
        .as_f64()
        .filter(|v| v.is_finite() && *v > 0.)
        .ok_or("Missing valid delayed equity price")?;
    let stamp = raw["timestamp"]
        .as_str()
        .ok_or("Missing quote snapshot timestamp")?;
    if stamp.len() < 10 || &stamp[..10] > asof {
        return Err("Quote snapshot is after the analysis date".into());
    }
    let observation = chrono::NaiveDate::parse_from_str(&stamp[..10], "%Y-%m-%d")
        .map_err(|_| "Invalid quote snapshot date")?;
    let end =
        chrono::NaiveDate::parse_from_str(asof, "%Y-%m-%d").map_err(|_| "Invalid as-of date")?;
    let age = (end - observation).num_days();
    let time = d["last_trade_time"]
        .as_str()
        .ok_or("Missing trade timestamp")?;
    if time.len() < 10 || &time[..10] > asof {
        return Err("Quote observation is after the analysis date".into());
    }
    chrono::NaiveDate::parse_from_str(&time[..10], "%Y-%m-%d").map_err(|_| "Invalid quote date")?;
    Ok(
        json!({"name":format!("{symbol} delayed equity quote"),"symbol":symbol,"price":price,"currency":"USD","tradeTimestamp":time,"providerTimestamp":raw["timestamp"],"date":&stamp[..10],"ageDays":age,"previousClose":d["prev_day_close"],"changePercent":d["price_change_percent"],"sourceUrl":url,"retrievedAt":now(),"classification":"Public delayed quote; not executable or real-time; corporate-action/adjustment semantics unverified","rights":"Public display endpoint used locally for this external prototype. Enterprise and redistribution rights are unverified; do not publish provider records in the repository."}),
    )
}
pub async fn fetch(s: &App, source: &str) -> Result<Value, ApiError> {
    let asof = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let (url, kind, symbol) = if source == "rates:USD:history" {
        (
            "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3,DGS5,DGS10".to_string(),
            "history",
            "",
        )
    } else if let Some(symbol) = source.strip_prefix("equity:") {
        if symbol.is_empty()
            || symbol.len() > 10
            || !symbol
                .chars()
                .all(|c| c.is_ascii_uppercase() || c == '.' || c == '-')
        {
            return Err(bad("Invalid equity ticker"));
        }
        (
            format!("https://cdn.cboe.com/api/global/delayed_quotes/quotes/{symbol}.json"),
            "equity",
            symbol,
        )
    } else if source == "credit:AAPL" {
        (
            reference()["sourceUrl"].as_str().unwrap().into(),
            "credit",
            "AAPL",
        )
    } else {
        return Err(bad("Unsupported research connector"));
    };
    let body = connectors::fetch(s, &url).await.map_err(bad)?;
    match kind {
        "history" => normalize_history(std::str::from_utf8(&body).map_err(internal)?, &asof, &url)
            .map_err(bad),
        "equity" => normalize_equity(
            &serde_json::from_slice::<Value>(&body).map_err(internal)?,
            symbol,
            &asof,
            &url,
        )
        .map_err(bad),
        // Successful transport alone cannot promote arbitrary text into current issuer terms.
        _ => {
            let text = String::from_utf8(body).map_err(internal)?;
            if !text.contains("4.200%") || !text.contains("2025") {
                return Err(bad("Issuer terms did not match the reviewed disclosure"));
            }
            let mut v = reference();
            v["retrievedAt"] = json!(now());
            Ok(v)
        }
    }
}
pub fn quote_is_recent(q: &Value) -> bool {
    q["date"]
        .as_str()
        .and_then(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .is_some_and(|date| {
            let days = (chrono::Utc::now().date_naive() - date).num_days();
            (0..=7).contains(&days)
        })
}
fn requirement(id: &str, status: &str, detail: String, source: Option<&str>) -> Value {
    let (label, why) = match id {
        "company" => (
            "Company financials",
            "Anchor the financial model in reported evidence",
        ),
        "rates" => (
            "Benchmark yield curve",
            "Price the selected currency and tenor",
        ),
        "rate_history" => (
            "Interest-rate developments",
            "Compare today's benchmark with earlier funding windows",
        ),
        "credit_metrics" => (
            "Issuer credit metrics",
            "Assess balance-sheet capacity and debt-service evidence",
        ),
        "ratings" => (
            "Credit ratings",
            "Establish agency, issue/issuer scope and assessment date",
        ),
        "debt_terms" => (
            "Existing debt / issue terms",
            "Understand maturity, coupon and refinancing context",
        ),
        "issuer_spreads" => (
            "Current issuer bond spreads",
            "Anchor issuance pricing to relevant outstanding securities",
        ),
        "equity" => (
            "Equity market observations",
            "Anchor price, capital-return and valuation scenarios",
        ),
        "peers" => (
            "Industry peers and valuation drivers",
            "Explain comparability and operating/valuation differences",
        ),
        "sector" => (
            "Industry valuation references",
            "Place the proposal in a wider industry context",
        ),
        _ => (
            "Bank positioning",
            "Tie the narrative to a supportable adviser proposition",
        ),
    };
    json!({"id":id,"label":label,"why":why,"status":status,"detail":detail,"sourceKey":source})
}
/// Pin contextual observations without mutating reported facts or past analyses.
pub fn assemble(
    s: &App,
    room: &mut Value,
    needs: &[String],
    enabled: &[String],
) -> Result<(), ApiError> {
    let issuer = room["mandate"]["issuer"].as_str().unwrap().to_string();
    let kind = room["mandate"]["kind"].as_str().unwrap().to_string();
    let old = room.get("research").cloned();
    let mut sources = old
        .as_ref()
        .map(|v| v["sources"].clone())
        .filter(Value::is_object)
        .unwrap_or(json!({}));
    for key in ["rates:USD:history".to_string(), format!("credit:{issuer}")]
        .into_iter()
        .chain(
            room["sources"]
                .as_object()
                .unwrap()
                .keys()
                .filter_map(|k| k.strip_prefix("sec:"))
                .map(|symbol| format!("equity:{symbol}")),
        )
    {
        let permitted = if key.starts_with("rates:") {
            enabled.iter().any(|x| x == "treasury") && needs.iter().any(|x| x == "rate_history")
        } else if key.starts_with("credit:") {
            enabled.iter().any(|x| x == "credit")
        } else {
            enabled.iter().any(|x| x == "equity")
        };
        // Existing workrooms pin previous observations; do not silently refresh them on a later turn.
        if permitted && sources.get(&key).is_none() {
            if let Ok(v) = pool::optional_latest(s, &key) {
                if let Some(v) = v {
                    sources[&key] = v;
                }
            }
        }
    }
    let c = &room["sources"][format!("sec:{issuer}")];
    if ["debt", "cash", "operatingIncome", "da"]
        .iter()
        .any(|key| c["facts"][key]["value"].as_f64().is_none())
    {
        return Err(bad(
            "Retrieve the required reported financial observations before assembling credit context",
        ));
    }
    let f = |k: &str| c["facts"][k]["value"].as_f64().map(|v| v / 1e6);
    let ebitda = f("operatingIncome").unwrap_or(0.) + f("da").unwrap_or(0.);
    let debt = f("debt").unwrap_or(0.);
    let cash = f("cash").unwrap_or(0.);
    let metrics = json!([{"label":"Reported debt","value":debt,"unit":"USDm"},{"label":"Reported cash","value":cash,"unit":"USDm"},{"label":"Net debt / EBITDA proxy","value":if ebitda>0.{Some((debt-cash)/ebitda)}else{None},"unit":"x"}]);
    let mut coverage = vec![];
    let mut gaps = vec![];
    for id in needs {
        let creditkey = format!("credit:{issuer}");
        let eqkey = format!("equity:{issuer}");
        let (status,detail,key)=match id.as_str(){
        "company"=>{let mode=c["provenance"]["mode"].as_str().unwrap_or("retained");("available",format!("{issuer} annual reporting through {} · {mode}; source period {}",if issuer=="AAPL"{"issuer report / SEC"}else{"SEC"},c["periodEnd"]),Some(format!("sec:{issuer}")))},
        "rates"=>if room["sources"]["treasury:USD"].is_object(){("available",format!("USD Treasury par curve · {}",room["sources"]["treasury:USD"]["date"]),Some("treasury:USD".into()))}else{("missing","Select/retrieve the USD benchmark curve before pricing.".into(),None)},
        "rate_history"=>if sources["rates:USD:history"].is_object(){("available",format!("DGS3/DGS5/DGS10 · through {}. Benchmark-only timing analysis.",sources["rates:USD:history"]["date"]),Some("rates:USD:history".into()))}else{("missing","Government rate history has not been retrieved; no earlier funding-window claim.".into(),None)},
        "credit_metrics"=>("partial","Reported debt, cash and net leverage are calculated. Verified interest expense / rating-agency adjustments are missing; interest coverage is not invented.".into(),Some(format!("sec:{issuer}"))),
        "ratings"|"debt_terms"=>if sources[&creditkey].is_object(){("dated",format!("Issuer disclosure dated {}. Current affirmation/outstanding amounts require verification.",sources[&creditkey]["date"]),Some(creditkey))}else{("missing","No reviewed issuer rating/debt-term mapping for this company yet.".into(),None)},
        "issuer_spreads"=>("missing","Current secondary prices, yields, benchmark-matched spreads and new-issue concession are unavailable. Historical issue spreads are NOT current market spreads; pricing spread remains an explicit scenario.".into(),None),
        "equity"=>if sources[&eqkey].is_object(){(if quote_is_recent(&sources[&eqkey]){"available"}else{"dated"},format!("Delayed USD observation {} · not an executable price.",sources[&eqkey]["tradeTimestamp"]),Some(eqkey))}else{("missing","Public delayed-quote retrieval unavailable or deselected; price inputs remain explicit assumptions.".into(),None)},
        "peers"=>if issuer=="AAPL"{("missing","Technology-peer financial mappings/estimates are not yet available; food companies are not substituted as valuation peers.".into(),None)}else{("partial","Public PEP/CPB/GIS reporting context; fiscal periods and business mix differ. Forecast consensus and transaction comparables remain missing.".into(),None)},
        "sector"=>if room["sources"]["sector:US"].is_object(){("dated","Broad US sector aggregates; no current security/transaction multiple claim.".into(),Some("sector:US".into()))}else{("missing","Sector reference not selected/retrieved.".into(),None)},
        _=>if room["sources"]["bank:rabobank"].is_object(){("partial","Public capabilities plus banker-selected positioning. Client mandate credentials and team evidence remain unverified.".into(),Some("bank:rabobank".into()))}else{("missing","Bank proposition is not selected; no unsupported capability claim.".into(),None)},
      };
        let row = requirement(id, status, detail, key.as_deref());
        if status != "available" {
            gaps.push(row.clone());
        }
        coverage.push(row);
    }
    let mut timing = vec![];
    if let Some(rows) = sources["rates:USD:history"]["points"].as_array() {
        if let Some(last) = rows.last() {
            if let Ok(end) =
                chrono::NaiveDate::parse_from_str(last["date"].as_str().unwrap(), "%Y-%m-%d")
            {
                let prior = (end - chrono::Duration::days(90)).to_string();
                if let Some(before) = rows
                    .iter()
                    .rev()
                    .find(|r| r["date"].as_str().unwrap() <= prior.as_str())
                {
                    for (tenor, key) in [(3, "y3"), (5, "y5"), (10, "y10")] {
                        let a = last[key].as_f64().unwrap();
                        let b = before[key].as_f64().unwrap();
                        timing.push(json!({"tenor":tenor,"dateNow":last["date"],"dateThen":before["date"],"yieldNow":a,"yieldThen":b,"changeBps":(a-b)*100.,"basis":"Government benchmark change only; no assumption that issuer spread, fees or credit stayed unchanged"}));
                    }
                }
            }
        }
    }
    room["research"] = json!({"kind":kind,"requirements":coverage,"gaps":gaps,"sources":sources,"creditMetrics":metrics,"timing":timing,"clientDirection":room["clientDirection"],"generatedAt":now(),"rule":"Financial observations and gaps are explicit. Historical issue terms, delayed prices, current benchmark rates and illustrative spreads are distinct. Do not assert executable funding or invent missing evidence."});
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn history_filters_bad_missing_future_and_duplicate_observations() {
        let mut csv = "observation_date,DGS3,DGS5,DGS10\n".to_string();
        for day in 1..=30 {
            csv += &format!("2026-09-{day:02},4,4.1,4.2\n");
        }
        csv += "2026-09-31,4,4.1,4.2\n2026-09-30,4,4.1,4.2\n2026-10-24,4,4.1,4.2\n2026-10-22,.,4.1,4.2\n1962-01-02,4,4.1,4.2\n";
        let r = normalize_history(&csv, "2026-10-23", "test").unwrap();
        assert_eq!(r["points"].as_array().unwrap().len(), 30);
        assert_eq!(r["date"], "2026-09-30");
        assert!(normalize_history("wrong,columns", "2026-10-23", "test").is_err());
    }
    #[test]
    fn contextual_sources_differ_by_work_type() {
        let a = [
            "sec",
            "issuer_reports",
            "treasury",
            "bund",
            "sector",
            "bank",
            "credit",
            "equity",
        ]
        .map(str::to_string);
        let n = requirements("bond", &json!(["evil"]));
        assert!(!n.iter().any(|x| x == "evil"));
        let b = relevant_sources("bond", &n, &a);
        assert!(b.iter().any(|x| x == "credit"));
        assert!(
            !b.iter()
                .any(|x| x == "equity" || x == "sector" || x == "bund")
        );
        let m = relevant_sources("acquisition", &requirements("acquisition", &json!([])), &a);
        assert!(m.iter().any(|x| x == "equity") && !m.iter().any(|x| x == "credit"));
    }
    #[test]
    fn quotes_require_matching_ticker_positive_price_and_dated_observation() {
        let r = json!({"symbol":"AAPL","timestamp":"2026-10-23 12:00:00","data":{"symbol":"AAPL","current_price":100.,"last_trade_time":"2026-10-22T15:59:59"}});
        assert!(normalize_equity(&r, "AAPL", "2026-10-23", "test").is_ok());
        assert!(normalize_equity(&r, "GIS", "2026-10-23", "test").is_err());
        assert!(normalize_equity(&r, "AAPL", "2026-10-21", "test").is_err());
        let mut q = r;
        q["data"]["current_price"] = json!(0.);
        assert!(normalize_equity(&q, "AAPL", "2026-10-23", "test").is_err());
    }
    #[test]
    fn dated_issuance_reference_reconciles_yields_and_not_current_spreads() {
        let r = reference();
        for row in r["issues"].as_array().unwrap() {
            assert!(
                (row["benchmarkYield"].as_f64().unwrap()
                    + row["issueSpreadBps"].as_f64().unwrap() / 100.
                    - row["issueYield"].as_f64().unwrap())
                .abs()
                    < 1e-10
            );
        }
        assert!(
            r["limitations"]
                .as_str()
                .unwrap()
                .contains("Do not substitute")
        );
    }
}
