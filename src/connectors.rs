//! Public-only, host-pinned connectors. Failed refreshes are explicit dated fallbacks.
use super::*;
use sha2::{Digest, Sha256};
pub const CATALOG: [(&str, &str, &str); 4] = [
    ("PEP", "0000077476", "PepsiCo"),
    ("AAPL", "0000320193", "Apple"),
    ("CPB", "0000016732", "The Campbell’s Company"),
    ("GIS", "0000040704", "General Mills"),
];
pub fn init(db: &Connection) -> Result<(), ApiError> {
    db.execute_batch("CREATE TABLE IF NOT EXISTS connector_cache(id TEXT PRIMARY KEY,payload TEXT,sha256 TEXT,retrieved_at TEXT);").map_err(internal)
}
fn store(s: &App, id: &str, payload: Value) -> Result<Value, ApiError> {
    let hash = format!("{:x}", Sha256::digest(payload.to_string().as_bytes()));
    let mut p = payload;
    p["provenance"] = json!({"id":id,"sha256":hash,"retrievedAt":now(),"mode":"retrieved"});
    s.db.lock()
        .unwrap()
        .execute(
            "INSERT OR REPLACE INTO connector_cache VALUES(?,?,?,?)",
            params![id, p.to_string(), hash, now()],
        )
        .map_err(internal)?;
    Ok(p)
}
fn fallback(s: &App, id: &str, reason: &str, embedded: Value) -> Value {
    let cached: Option<String> =
        s.db.lock()
            .unwrap()
            .query_row(
                "SELECT payload FROM connector_cache WHERE id=?",
                [id],
                |r| r.get(0),
            )
            .ok();
    let mut p = cached.map(parse).unwrap_or(embedded);
    let hash = format!("{:x}", Sha256::digest(p.to_string().as_bytes()));
    let original = p
        .get("provenance")
        .cloned()
        .unwrap_or(json!({"retrievedAt":s.data["retrievedAt"],"asOf":s.data["asOf"]}));
    p["provenance"] = json!({"id":id,"sha256":hash,"mode":"cached","refreshError":reason,"original":original,"attemptedAt":now()});
    p
}
async fn fetch(s: &App, url: &str) -> Result<Vec<u8>, String> {
    let ua=std::env::var("SEC_USER_AGENT").unwrap_or("InvestmentBankingReimagined public research github.com/NeoDemos/investment-banking-reimagined".into());
    let r = s
        .client
        .get(url)
        .header("User-Agent", ua)
        .header("Accept-Encoding", "identity")
        .timeout(Duration::from_secs(25))
        .send()
        .await
        .map_err(|_| "Public source could not be reached".to_string())?;
    if !r.status().is_success() {
        return Err(format!("Public source HTTP {}", r.status()));
    }
    if r.content_length().unwrap_or(0) > 20_000_000 {
        return Err("Source exceeds connector size limit".into());
    }
    let b = r
        .bytes()
        .await
        .map_err(|_| "Source body unavailable".to_string())?;
    if b.len() > 20_000_000 {
        return Err("Source exceeds connector size limit".into());
    }
    Ok(b.to_vec())
}
pub fn normalize_company(
    raw: &Value,
    symbol: &str,
    cik: &str,
    name: &str,
    asof: &str,
) -> Result<Value, String> {
    let fs = raw["facts"]["us-gaap"]
        .as_object()
        .ok_or("No US GAAP XBRL facts")?;
    let records: Vec<&Value> = fs
        .values()
        .filter_map(|v| v["units"].as_object())
        .flat_map(|u| u.values())
        .filter_map(Value::as_array)
        .flatten()
        .filter(|r| {
            r["form"] == "10-K" && r["fp"] == "FY" && r["filed"].as_str().unwrap_or("9999") <= asof
        })
        .collect();
    let latest = records
        .iter()
        .max_by_key(|r| (r["filed"].as_str(), r["end"].as_str()))
        .ok_or("No annual filings available")?;
    let end = records
        .iter()
        .filter(|r| r["accn"] == latest["accn"])
        .filter_map(|r| r["end"].as_str())
        .max()
        .ok_or("Annual period missing")?;
    let get = |tags: &[&str], unit: &str, annual: bool| -> Option<Value> {
        for tag in tags {
            let Some(rs) = fs.get(*tag).and_then(|v| v["units"][unit].as_array()) else {
                continue;
            };
            let r = rs
                .iter()
                .filter(|r| {
                    r["end"] == end
                        && r["form"] == "10-K"
                        && r["filed"].as_str().unwrap_or("9999") <= asof
                        && (!annual
                            || r["start"]
                                .as_str()
                                .and_then(|start| {
                                    let a = chrono::NaiveDate::parse_from_str(start, "%Y-%m-%d")
                                        .ok()?;
                                    let b =
                                        chrono::NaiveDate::parse_from_str(end, "%Y-%m-%d").ok()?;
                                    Some((300..390).contains(&(b - a).num_days()))
                                })
                                .unwrap_or(false))
                })
                .max_by_key(|r| r["filed"].as_str());
            if let Some(r) = r {
                let val = r["val"].as_f64()?;
                if !val.is_finite() {
                    return None;
                }
                let acc = r["accn"].as_str()?;
                return Some(
                    json!({"value":val,"unit":unit,"periodStart":r["start"],"periodEnd":end,"filed":r["filed"],"accession":acc,"tag":tag,"sourceUrl":format!("https://www.sec.gov/Archives/edgar/data/{}/{}/",cik.trim_start_matches('0'),acc.replace('-',"")),"apiUrl":format!("https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"),"basis":"Reported US GAAP"}),
                );
            }
        }
        None
    };
    let mut facts = serde_json::Map::new();
    for (key, tags, unit, annual) in [
        (
            "revenue",
            vec![
                "RevenueFromContractWithCustomerExcludingAssessedTax",
                "Revenues",
                "SalesRevenueNet",
            ],
            "USD",
            true,
        ),
        (
            "netIncome",
            vec![
                "NetIncomeLossAvailableToCommonStockholdersBasic",
                "NetIncomeLoss",
            ],
            "USD",
            true,
        ),
        ("operatingIncome", vec!["OperatingIncomeLoss"], "USD", true),
        (
            "da",
            vec![
                "DepreciationDepletionAndAmortization",
                "DepreciationDepletionAndAmortizationPropertyPlantAndEquipment",
            ],
            "USD",
            true,
        ),
        (
            "cash",
            vec!["CashAndCashEquivalentsAtCarryingValue"],
            "USD",
            false,
        ),
        (
            "shares",
            vec!["WeightedAverageNumberOfDilutedSharesOutstanding"],
            "shares",
            true,
        ),
        (
            "reportedEPS",
            vec!["EarningsPerShareDiluted"],
            "USD/shares",
            true,
        ),
    ] {
        facts.insert(
            key.into(),
            get(&tags, unit, annual)
                .ok_or_else(|| format!("Unsupported or missing annual mapping: {symbol}.{key}"))?,
        );
    }
    let debt = get(&["DebtLongtermAndShorttermCombinedAmount"], "USD", false)
        .or_else(|| {
            let a = get(&["DebtCurrent"], "USD", false)?;
            let b = get(&["LongTermDebtNoncurrent"], "USD", false)?;
            if a["accession"] != b["accession"] {
                return None;
            }
            let mut d = a.clone();
            d["value"] = json!(a["value"].as_f64()? + b["value"].as_f64()?);
            d["tag"] = json!("DebtCurrent + LongTermDebtNoncurrent");
            d["inputs"] = json!([a, b]);
            d["basis"] = json!("Sum of reported current and noncurrent debt");
            Some(d)
        })
        .ok_or("Debt definition requires review")?;
    facts.insert("debt".into(), debt);
    Ok(
        json!({"symbol":symbol,"name":name,"cik":cik,"fiscalYear":latest["fy"],"periodEnd":end,"facts":facts}),
    )
}
pub async fn company(s: &App, symbol: &str, allow_cached: bool) -> Result<Value, ApiError> {
    let (_,cik,name)=CATALOG.iter().find(|c|c.0==symbol).ok_or_else(||bad("MVP coverage: PEP, CPB and GIS annual US GAAP financials. Other companies need reviewed XBRL mappings."))?;
    let id = format!("sec:{symbol}");
    let url = format!("https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json");
    let out = match fetch(s, &url).await {
        Ok(b) => serde_json::from_slice(&b)
            .map_err(|_| "SEC returned invalid JSON".into())
            .and_then(|v| {
                normalize_company(
                    &v,
                    symbol,
                    cik,
                    name,
                    &chrono::Utc::now().format("%Y-%m-%d").to_string(),
                )
            }),
        Err(e) => Err(e),
    };
    match out {
        Ok(v) => store(s, &id, v),
        Err(e) if allow_cached => Ok(fallback(
            s,
            &id,
            &e,
            finance::company(&s.data, symbol).clone(),
        )),
        Err(e) => Err(bad(e)),
    }
}
pub fn normalize_curve(xml: &str, asof: &str, url: &str) -> Result<Value, String> {
    let doc = roxmltree::Document::parse(xml).map_err(|_| "Treasury returned invalid XML")?;
    let row = doc
        .descendants()
        .filter(|n| n.tag_name().name() == "properties")
        .filter(|n| {
            n.children()
                .find(|c| c.tag_name().name() == "NEW_DATE")
                .and_then(|c| c.text())
                .map(|d| d.len() >= 10 && &d[..10] <= asof)
                .unwrap_or(false)
        })
        .max_by_key(|n| {
            n.children()
                .find(|c| c.tag_name().name() == "NEW_DATE")
                .and_then(|c| c.text())
        })
        .ok_or("No Treasury observations")?;
    let text = |tag: &str| {
        row.children()
            .find(|n| n.tag_name().name() == tag)
            .and_then(|n| n.text())
    };
    let date = text("NEW_DATE").ok_or("Missing observation date")?;
    let mut pts = vec![];
    for (years, tag) in [
        (1, "BC_1YEAR"),
        (2, "BC_2YEAR"),
        (3, "BC_3YEAR"),
        (5, "BC_5YEAR"),
        (7, "BC_7YEAR"),
        (10, "BC_10YEAR"),
        (20, "BC_20YEAR"),
        (30, "BC_30YEAR"),
    ] {
        let y = text(tag)
            .and_then(|t| t.parse::<f64>().ok())
            .filter(|n| n.is_finite() && *n >= 0. && *n < 40.)
            .ok_or("Invalid Treasury yield observation")?;
        pts.push(json!({"years":years,"yield":y}));
    }
    Ok(
        json!({"date":&date[..10],"currency":"USD","type":"Treasury par yield curve","source":"U.S. Treasury","sourceUrl":url,"points":pts,"retrievedAt":now()}),
    )
}
pub async fn curve(s: &App, allow_cached: bool) -> Result<Value, ApiError> {
    let date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let url = format!(
        "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value={}",
        &date[..4]
    );
    let out = match fetch(s, &url).await {
        Ok(b) => String::from_utf8(b)
            .map_err(|_| "Invalid Treasury text".into())
            .and_then(|x| normalize_curve(&x, &date, &url)),
        Err(e) => Err(e),
    };
    match out {
        Ok(v) => store(s, "treasury:USD", v),
        Err(e) if allow_cached => Ok(fallback(s, "treasury:USD", &e, s.data["curve"].clone())),
        Err(e) => Err(bad(e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn treasury_selects_latest_eligible_observation_and_rejects_missing_tenors() {
        let make = |date: &str| {
            format!(
                "<m:properties><d:NEW_DATE>{date}T00:00:00</d:NEW_DATE>{}</m:properties>",
                [
                    ("BC_1YEAR", 4.),
                    ("BC_2YEAR", 4.1),
                    ("BC_3YEAR", 4.2),
                    ("BC_5YEAR", 4.3),
                    ("BC_7YEAR", 4.4),
                    ("BC_10YEAR", 4.5),
                    ("BC_20YEAR", 4.6),
                    ("BC_30YEAR", 4.7)
                ]
                .iter()
                .map(|(k, v)| format!("<d:{k}>{v}</d:{k}>"))
                .collect::<String>()
            )
        };
        let xml = format!(
            "<feed xmlns:m='m' xmlns:d='d'>{}{}</feed>",
            make("2026-10-21"),
            make("2026-10-23")
        );
        let c = normalize_curve(&xml, "2026-10-22", "https://home.treasury.gov").unwrap();
        assert_eq!(c["date"], "2026-10-21");
        assert_eq!(c["points"].as_array().unwrap().len(), 8);
        assert!(normalize_curve(&xml.replace("BC_5YEAR", "MISSING"), "2026-10-22", "url").is_err());
        assert!(normalize_curve("<bad>", "2026-10-22", "url").is_err());
    }
    #[test]
    fn sec_normalization_has_units_periods_tags_and_no_invented_missing_values() {
        let fields = [
            (
                "RevenueFromContractWithCustomerExcludingAssessedTax",
                "USD",
                1000.,
            ),
            ("NetIncomeLoss", "USD", 90.),
            ("OperatingIncomeLoss", "USD", 150.),
            ("DepreciationDepletionAndAmortization", "USD", 30.),
            ("CashAndCashEquivalentsAtCarryingValue", "USD", 200.),
            (
                "WeightedAverageNumberOfDilutedSharesOutstanding",
                "shares",
                50.,
            ),
            ("EarningsPerShareDiluted", "USD/shares", 1.8),
            ("DebtCurrent", "USD", 70.),
            ("LongTermDebtNoncurrent", "USD", 120.),
        ];
        let mut fs = serde_json::Map::new();
        for (tag, u, v) in fields {
            fs.insert(tag.into(),json!({"units":{u:[{"form":"10-K","fp":"FY","fy":2025,"filed":"2026-02-02","start":"2025-01-01","end":"2025-12-31","val":v,"accn":"0001-26-000001"}]}}));
        }
        let raw = json!({"facts":{"us-gaap":fs}});
        let c = normalize_company(&raw, "TEST", "0000000001", "Test", "2026-10-22").unwrap();
        assert_eq!(c["facts"]["debt"]["value"], 190.);
        assert_eq!(c["facts"]["shares"]["unit"], "shares");
        assert_eq!(c["facts"]["netIncome"]["accession"], "0001-26-000001");
        let mut broken = raw.clone();
        broken["facts"]["us-gaap"]
            .as_object_mut()
            .unwrap()
            .remove("OperatingIncomeLoss");
        assert!(normalize_company(&broken, "TEST", "1", "Test", "2026-10-22").is_err());
        assert!(normalize_company(&raw, "TEST", "1", "Test", "2025-01-01").is_err());
    }
}

pub const APPLE_REPORT: &str = "https://d18rn0p25nwr6d.cloudfront.net/CIK-0000320193/c636d8a7-8025-47d2-9b13-bcf5465343b3.html";
pub fn normalize_apple_report(raw: &str) -> Result<Value, String> {
    let tr = regex::Regex::new(r"(?is)<tr\b[^>]*>(.*?)</tr>").unwrap();
    let tags = regex::Regex::new(r"<[^>]+>").unwrap();
    let rows = tr
        .captures_iter(raw)
        .map(|c| {
            tags.replace_all(&c[1], " ")
                .replace("&nbsp;", " ")
                .replace("&#160;", " ")
                .replace("&#8217;", "’")
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
        })
        .collect::<Vec<_>>();
    let find = |label: &str| -> Result<f64, String> {
        let row = rows
            .iter()
            .find(|r| {
                r.starts_with(label)
                    && r[label.len()..]
                        .trim_start()
                        .chars()
                        .next()
                        .is_some_and(|c| c.is_ascii_digit() || c == '$' || c == '(')
            })
            .ok_or_else(|| format!("Missing issuer report row: {label}"))?;
        let tail = &row[label.len()..];
        let re = regex::Regex::new(r"-?\d[\d,]*(?:\.\d+)?").unwrap();
        let number = re
            .find(tail)
            .ok_or_else(|| format!("Missing value for {label}"))?
            .as_str()
            .replace(',', "");
        number.parse().map_err(|_| format!("Invalid {label}"))
    };
    let source = APPLE_REPORT;
    let mut facts = serde_json::Map::new();
    for (key, label, unit, scale, annual) in [
        ("revenue", "Total net sales", "USD", 1e6, true),
        ("operatingIncome", "Operating income", "USD", 1e6, true),
        ("netIncome", "Net income", "USD", 1e6, true),
        ("da", "Depreciation and amortization", "USD", 1e6, true),
        ("cash", "Cash and cash equivalents $", "USD", 1e6, false),
        (
            "shares",
            "Weighted-average diluted shares",
            "shares",
            1000.,
            true,
        ),
        (
            "reportedEPS",
            "Diluted earnings per share",
            "USD/shares",
            1.,
            true,
        ),
    ] {
        facts.insert(key.into(),json!({"value":find(label)?*scale,"unit":unit,"tag":label,"taxonomy":"issuer-report-label","basis":"Reported annual statement row in issuer-hosted 2025 Form10-K; mapping is specific to this report","periodStart":if annual{Some("2024-09-29")}else{None},"periodEnd":"2025-09-27","filed":"2025-10-31","accession":"issuer-copy-2025-10K","sourceUrl":source}));
    }
    let term = find("Total term debt ")?;
    let commercial = find("Commercial paper ")?;
    let debt = term + commercial;
    facts.insert("debt".into(),json!({"value":debt*1e6,"unit":"USD","tag":"Total term debt + commercial paper","taxonomy":"issuer-report-label","basis":"Reported carrying amount of current/noncurrent term debt plus commercial paper; excludes leases","periodStart":null,"periodEnd":"2025-09-27","filed":"2025-10-31","accession":"issuer-copy-2025-10K","sourceUrl":source,"inputs":[{"tag":"Total term debt","value":term*1e6,"unit":"USD","taxonomy":"issuer-report-label"},{"tag":"Commercial paper","value":commercial*1e6,"unit":"USD","taxonomy":"issuer-report-label"}]}));
    Ok(
        json!({"symbol":"AAPL","cik":"0000320193","name":"Apple","entityId":"sec:0000320193","fiscalYear":2025,"periodEnd":"2025-09-27","facts":facts,"sourceFormat":"issuer HTML annual report, not SEC companyfacts API"}),
    )
}
pub async fn apple_report(s: &App) -> Result<Value, ApiError> {
    let bytes = fetch(s, APPLE_REPORT).await.map_err(bad)?;
    let raw = std::str::from_utf8(&bytes).map_err(|_| bad("Invalid issuer report text"))?;
    store(s, "sec:AAPL", normalize_apple_report(raw).map_err(bad)?)
}
pub async fn bund(s: &App) -> Result<Value, ApiError> {
    let mut points = vec![];
    for (years, key) in [
        (2, "A610.000000WT0202.A"),
        (5, "A620.000000WT0505.A"),
        (10, "A630.000000WT1010.A"),
    ] {
        let start = (chrono::Utc::now() - chrono::Duration::days(40))
            .format("%Y-%m-%d")
            .to_string();
        let url = format!(
            "https://api.statistiken.bundesbank.de/rest/data/BBSSY/D.REN.EUR.{key}?format=csv&startPeriod={start}"
        );
        let bytes = fetch(s, &url).await.map_err(bad)?;
        let raw = String::from_utf8(bytes).map_err(|_| bad("Invalid Bundesbank CSV"))?;
        let mut last = None;
        for line in raw.lines() {
            let cells = line.split(';').collect::<Vec<_>>();
            if cells.len() >= 2 {
                let date = cells[0].trim_matches('"');
                if chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").is_ok() {
                    if let Ok(value) = cells[1].trim_matches('"').replace(',', ".").parse::<f64>() {
                        if value.is_finite() {
                            last = Some(
                                json!({"years":years,"yield":value,"date":date,"series":format!("BBSSY.D.REN.EUR.{key}"),"sourceUrl":url}),
                            );
                        }
                    }
                }
            }
        }
        points.push(
            last.ok_or_else(|| bad("No valid Bundesbank observation in the requested window"))?,
        );
    }
    store(
        s,
        "bund:EUR",
        json!({"name":"German Federal securities reference yields","currency":"EUR","points":points,"sourceUrl":"https://www.bundesbank.de/en/statistics/overview-of-the-statistical-series/-/3-yields-of-current-federal-securities-914558","basis":"Separate current German2/5/10year securities, not a spot curve or issuer quote. Not substituted into USD models."}),
    )
}
#[cfg(test)]
mod issuer_report_tests {
    use super::*;
    #[test]
    fn apple_mapping_distinguishes_debt_carrying_amount_from_principal() {
        let rows = [
            ("Total net sales", "416161"),
            ("Operating income", "133050"),
            ("Net income", "112010"),
            ("Depreciation and amortization", "11698"),
            ("Cash and cash equivalents $", "35934"),
            ("Weighted-average diluted shares", "15004697"),
            ("Diluted earnings per share", "7.46"),
            ("Total term debt principal", "91281"),
            ("Total term debt", "90678"),
            ("Commercial paper", "7979"),
        ];
        let html = rows
            .iter()
            .map(|(k, v)| format!("<tr><td>{k}</td><td>{v}</td></tr>"))
            .collect::<String>();
        let c = normalize_apple_report(&html).unwrap();
        assert_eq!(c["facts"]["debt"]["value"], 98657000000.);
        assert_eq!(c["facts"]["shares"]["value"], 15004697000.);
        assert_eq!(c["facts"]["revenue"]["value"], 416161000000.);
        assert!(normalize_apple_report("<html>missing report</html>").is_err());
    }
}
