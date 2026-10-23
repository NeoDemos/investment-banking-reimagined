//! Append-only public data receipts. Licensed feeds remain outside this demo.
use super::*;
use serde::Deserialize;
use sha2::{Digest, Sha256};
pub fn sector_reference() -> Value {
    serde_json::from_str(include_str!("../data/sector-reference.json")).unwrap()
}
pub fn bank_profile() -> Value {
    json!({"id":"rabobank-public-proposition/1","name":"Rabobank public proposition","reviewedAt":"2026-10-23","classification":"Public bank description, not client-specific mandate proof","claims":[
      {"title":"Food and agriculture context","text":"Rabobank describes sector expertise across food, agriculture and energy. For a food-company discussion, connect funding choices to the operating and supply-chain context.","sourceUrl":"https://www.rabobankna.com/corporate-banking/","application":"Proposed relevance to this client; requires the coverage banker's judgement."},
      {"title":"Debt structuring and distribution","text":"Its public capital-markets offer includes public bonds, private placements, syndicated loans and rating advisory. Assess format, tenor and distribution against the client's funding purpose.","sourceUrl":"https://www.rabobank.com/products/finance-my-business","application":"Service capability, not a commitment to underwrite, an executable price or a mandate record."},
      {"title":"Turn knowledge into a useful client conversation","text":"The proposed value is a clear choice, tested downside and a practical execution work plan. Client-specific credentials, comparable transactions and the named deal team still need confirmation.","sourceUrl":"https://www.rabobankna.com/corporate-banking/","application":"Our proposed storyline, not an independently established competitive ranking."}
    ]})
}
fn retain(
    db: &Connection,
    source: &str,
    kind: &str,
    payload: &Value,
    mode: &str,
) -> Result<String, ApiError> {
    let hash = format!("{:x}", Sha256::digest(payload.to_string().as_bytes()));
    let id = format!("pool-{hash}");
    db.execute(
        "INSERT OR IGNORE INTO public_pool VALUES(?,?,?,?,?,?,?)",
        params![id, source, kind, payload.to_string(), hash, now(), mode],
    )
    .map_err(internal)?;
    Ok(id)
}
pub fn init(db: &Connection, data: &Value) -> Result<(), ApiError> {
    db.execute_batch("CREATE TABLE IF NOT EXISTS public_pool(id TEXT PRIMARY KEY,source_key TEXT,kind TEXT,payload TEXT,sha256 TEXT,ingested_at TEXT,mode TEXT); CREATE TABLE IF NOT EXISTS ingestion_jobs(id TEXT PRIMARY KEY,payload TEXT);").map_err(internal)?;
    for (symbol, _, _) in connectors::CATALOG {
        let c = evidence::archive_company(data, symbol)?;
        retain(db, &format!("sec:{symbol}"), "company_facts", &c, "archive")?;
    }
    retain(
        db,
        "treasury:USD",
        "rate_curve",
        &evidence::archive_curve(data),
        "archive",
    )?;
    retain(
        db,
        "bank:rabobank",
        "bank_profile",
        &bank_profile(),
        "public_reference",
    )?;
    retain(
        db,
        "sector:US",
        "sector_reference",
        &sector_reference(),
        "public_reference",
    )?;
    retain(
        db,
        "credit:AAPL",
        "issuer_credit_reference",
        &research::reference(),
        "public_reference",
    )?;
    Ok(())
}
pub fn optional_latest(s: &App, key: &str) -> Result<Option<Value>, ApiError> {
    use rusqlite::OptionalExtension;
    let row: Option<(String, String)> =
        s.db.lock()
            .unwrap()
            .query_row(
                "SELECT id,payload FROM public_pool WHERE source_key=? ORDER BY rowid DESC LIMIT 1",
                [key],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()
            .map_err(internal)?;
    Ok(row.map(|(id, p)| {
        let mut v = parse(p);
        v["poolReceiptId"] = json!(id);
        v
    }))
}
pub fn latest(s: &App, key: &str) -> Result<Value, ApiError> {
    let (id, payload): (String, String) =
        s.db.lock()
            .unwrap()
            .query_row(
                "SELECT id,payload FROM public_pool WHERE source_key=? ORDER BY rowid DESC LIMIT 1",
                [key],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .map_err(internal)?;
    let mut value = parse(payload);
    value["poolReceiptId"] = json!(id);
    Ok(value)
}
pub fn company(s: &App, symbol: &str) -> Result<Value, ApiError> {
    if !connectors::CATALOG.iter().any(|c| c.0 == symbol) {
        return Err(bad("Public pool currently covers PEP, CPB, GIS and AAPL"));
    }
    let mut c = latest(s, &format!("sec:{symbol}"))?;
    let original = c.clone();
    for (k, f) in c["facts"].as_object_mut().unwrap() {
        let id = evidence::id(symbol, k, &original["facts"][k]);
        f["evidenceId"] = json!(id);
        f["resourceUri"] = json!(format!("banking://evidence/{id}"));
    }
    c["entityId"] = json!(format!("sec:{}", c["cik"].as_str().unwrap()));
    Ok(c)
}
pub fn curve(s: &App) -> Result<Value, ApiError> {
    latest(s, "treasury:USD")
}
pub async fn list(State(s): State<App>) -> ApiResult {
    let db = s.db.lock().unwrap();
    let mut q=db.prepare("SELECT id,source_key,kind,payload,sha256,ingested_at,mode FROM public_pool ORDER BY rowid DESC").map_err(internal)?;
    let receipts=q.query_map([],|r|Ok(json!({"id":r.get::<_,String>(0)?,"source":r.get::<_,String>(1)?,"kind":r.get::<_,String>(2)?,"data":parse(r.get::<_,String>(3)?),"sha256":r.get::<_,String>(4)?,"ingestedAt":r.get::<_,String>(5)?,"mode":r.get::<_,String>(6)?}))).map_err(internal)?.collect::<Result<Vec<_>,_>>().map_err(internal)?;
    let mut q = db
        .prepare("SELECT payload FROM ingestion_jobs ORDER BY rowid DESC LIMIT 30")
        .map_err(internal)?;
    let jobs = q
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)?;
    Ok(Json(
        json!({"receipts":receipts,"jobs":jobs.into_iter().map(parse).collect::<Vec<_>>(),"contracts":{"structured":"Public SEC XBRL, mapped Apple annual-report facts, Treasury and Bundesbank yields and NYU sector references normalize into versioned receipts; workrooms pin exact observations.","annualReports":"The mapped Apple annual-report HTML adapter is live. Other supported public report URLs can be registered for later extraction; generic PDF/table extraction is not implemented.","models":"Local Codex High and Claude Opus Medium login connectors are available when enabled and entitled. API keys, voice and licensed feeds remain deferred."}}),
    ))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Ingest {
    source: String,
}
pub async fn refresh(State(s): State<App>, Json(b): Json<Ingest>) -> ApiResult {
    if ![
        "treasury:USD",
        "bund:EUR",
        "issuer:apple",
        "sector:US",
        "rates:USD:history",
        "credit:AAPL",
    ]
    .contains(&b.source.as_str())
        && !b.source.strip_prefix("equity:").is_some_and(|v| {
            !v.is_empty()
                && v.len() <= 10
                && v.chars()
                    .all(|c| c.is_ascii_uppercase() || c == '.' || c == '-')
        })
        && !connectors::CATALOG
            .iter()
            .any(|c| b.source == format!("sec:{}", c.0))
    {
        return Err(bad(
            "Only the fixed public SEC, issuer-report, Treasury, Bundesbank and NYU connectors can be refreshed",
        ));
    }
    let id = new_id();
    let mut job = json!({"id":id,"source":b.source,"state":"fetching","startedAt":now(),"adapter":"public-structured/1"});
    s.db.lock()
        .unwrap()
        .execute(
            "INSERT INTO ingestion_jobs VALUES(?,?)",
            params![id, job.to_string()],
        )
        .map_err(internal)?;
    let result = if b.source.starts_with("equity:")
        || b.source == "rates:USD:history"
        || b.source == "credit:AAPL"
    {
        research::fetch(&s, &b.source).await
    } else if b.source == "treasury:USD" {
        connectors::curve(&s, false).await
    } else if b.source == "bund:EUR" {
        connectors::bund(&s).await
    } else if b.source == "issuer:apple" {
        connectors::apple_report(&s).await
    } else if b.source == "sector:US" {
        sector_live(&s).await
    } else {
        connectors::company(&s, b.source.strip_prefix("sec:").unwrap(), false).await
    };
    match result {
        Ok(value) => {
            let db = s.db.lock().unwrap();
            let receipt = retain(
                &db,
                if b.source == "issuer:apple" {
                    "sec:AAPL"
                } else {
                    &b.source
                },
                if b.source == "treasury:USD" || b.source == "bund:EUR" {
                    "rate_curve"
                } else if b.source.starts_with("equity:") {
                    "equity_observation"
                } else if b.source == "rates:USD:history" {
                    "rate_history"
                } else if b.source == "credit:AAPL" {
                    "issuer_credit_reference"
                } else if b.source == "sector:US" {
                    "sector_reference"
                } else {
                    "company_facts"
                },
                &value,
                "public_refresh",
            )?;
            if value["facts"].is_object() {
                evidence::init(&db, &json!({"companies":[value]}))?;
            }
            job["state"] = json!("ingested");
            job["receiptId"] = json!(receipt);
            job["finishedAt"] = json!(now());
        }
        Err(error) => {
            job["state"] = json!("failed");
            job["error"] = json!(error.1);
            job["finishedAt"] = json!(now());
            job["effect"] = json!(
                "Previous pool receipts and existing workrooms are unchanged; no live success was inferred."
            );
        }
    }
    s.db.lock()
        .unwrap()
        .execute(
            "UPDATE ingestion_jobs SET payload=? WHERE id=?",
            params![job.to_string(), id],
        )
        .map_err(internal)?;
    Ok(Json(job))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Report {
    url: String,
    label: String,
}
pub async fn register(State(s): State<App>, Json(b): Json<Report>) -> ApiResult {
    let u = reqwest::Url::parse(&b.url).map_err(|_| bad("Use an HTTPS public report URL"))?;
    let host = u.host_str().unwrap_or("");
    if u.scheme() != "https"
        || ![
            "www.sec.gov",
            "www.rabobank.com",
            "rabobank.com",
            "www.pepsico.com",
            "www.generalmills.com",
            "www.thecampbellscompany.com",
        ]
        .contains(&host)
        || !u.username().is_empty()
        || u.password().is_some()
        || u.port().is_some()
    {
        return Err(bad(
            "Register a public report on a supported issuer/SEC/Rabobank HTTPS host",
        ));
    }
    if !(5..=180).contains(&b.label.trim().chars().count()) {
        return Err(bad("Use a descriptive public-report label"));
    }
    let job = json!({"id":new_id(),"source":b.url,"label":b.label.trim(),"state":"registered_for_extraction","startedAt":now(),"adapter":"annual-report-document/next-phase","note":"URL registered only. Document download, PDF/table extraction and promotion to reviewed financial evidence are not implemented; no numeric output uses this document."});
    s.db.lock()
        .unwrap()
        .execute(
            "INSERT INTO ingestion_jobs VALUES(?,?)",
            params![job["id"].as_str(), job.to_string()],
        )
        .map_err(internal)?;
    Ok(Json(job))
}

async fn sector_live(s: &App) -> Result<Value, ApiError> {
    let mut value = sector_reference();
    let url = value["sourceUrl"].as_str().unwrap().to_string();
    let r = s
        .client
        .get(&url)
        .timeout(Duration::from_secs(25))
        .send()
        .await
        .map_err(|_| bad("Sector source unavailable"))?;
    if !r.status().is_success() {
        return Err(bad(format!("Sector source HTTP {}", r.status())));
    }
    let raw = r.text().await.map_err(internal)?;
    if raw.len() > 3000000 {
        return Err(bad("Sector page exceeds size bound"));
    }
    let rows = regex::Regex::new(r"(?is)<tr\b[^>]*>(.*?)</tr>").unwrap();
    let cells = regex::Regex::new(r"(?is)<t[dh]\b[^>]*>(.*?)</t[dh]>").unwrap();
    let tags = regex::Regex::new(r"<[^>]+>").unwrap();
    let mut out = vec![];
    for row in rows.captures_iter(&raw) {
        let cols = cells
            .captures_iter(&row[1])
            .map(|c| {
                tags.replace_all(&c[1], " ")
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ")
            })
            .collect::<Vec<_>>();
        if cols.len() >= 8 && ["Food Processing", "Beverage (Soft)"].contains(&cols[0].as_str()) {
            let parse = |i: usize| {
                cols[i]
                    .parse::<f64>()
                    .map_err(|_| bad("Invalid sector multiple"))
            };
            out.push(json!({"industry":cols[0],"firms":parse(1)?,"positiveEbitdaEvEbitda":parse(3)?,"allFirmsEvEbitda":parse(7)?}));
        }
    }
    if out.len() != 2 {
        return Err(bad(
            "Sector source schema changed; previous lookup retained",
        ));
    }
    value["rows"] = json!(out);
    value["retrievedAt"] = json!(now());
    Ok(value)
}
