//! Engagement and material-draft state. Financial calculations remain in finance.rs.
use super::*;

pub fn init(db: &Connection) -> Result<(), ApiError> {
    db.execute_batch("CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,title TEXT,client TEXT,objective TEXT,due_date TEXT,created_at TEXT);
    CREATE TABLE IF NOT EXISTS project_analyses(project_id TEXT,brief_id TEXT UNIQUE,PRIMARY KEY(project_id,brief_id));
    CREATE TABLE IF NOT EXISTS project_documents(project_id TEXT,revision INTEGER,payload TEXT,created_at TEXT,PRIMARY KEY(project_id,revision));
    CREATE TABLE IF NOT EXISTS project_snapshots(id TEXT PRIMARY KEY,project_id TEXT,payload TEXT,created_at TEXT);").map_err(internal)?;
    let exists: bool = db
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id='pepsico')",
            [],
            |r| r.get(0),
        )
        .map_err(internal)?;
    if !exists {
        db.execute("INSERT INTO projects VALUES('pepsico',?,'PepsiCo',?,'2026-10-26',?)", params!["Capital allocation review", "Assess financing capacity, a share repurchase and a hypothetical acquisition. Prepare a sourced discussion for the client.", now()]).map_err(internal)?;
        for id in ["bond", "buyback", "acquisition"] {
            db.execute("INSERT INTO project_analyses VALUES('pepsico',?)", [id])
                .map_err(internal)?;
        }
        let analyses = analyses(db, "pepsico")?;
        let doc = default_document("Capital allocation review", &analyses);
        db.execute(
            "INSERT INTO project_documents VALUES('pepsico',1,?,?)",
            params![doc.to_string(), now()],
        )
        .map_err(internal)?;
    }
    Ok(())
}
fn analyses(db: &Connection, project: &str) -> Result<Vec<Value>, ApiError> {
    let mut q = db.prepare("SELECT brief_id FROM project_analyses WHERE project_id=? ORDER BY CASE (SELECT kind FROM briefs WHERE id=brief_id) WHEN 'bond' THEN 0 WHEN 'buyback' THEN 1 ELSE 2 END").map_err(internal)?;
    let ids = q
        .query_map([project], |r| r.get::<_, String>(0))
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)?;
    ids.iter().map(|id| brief(db, id, None)).collect()
}
fn paragraph(text: &str) -> Value {
    json!({"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":text}]}]})
}
pub fn default_document(title: &str, a: &[Value]) -> Value {
    let id = |kind: &str| a.iter().find(|b| b["kind"] == kind).unwrap()["id"].clone();
    json!({"title":title,"sections":[
        {"id":"executive","title":"Executive perspective","body":paragraph("Three capital-allocation alternatives frame the client discussion. Compare financing flexibility, shareholder returns and acquisition capacity before choosing a preferred path."),"layout":"comparison","linkedAnalyses":a.iter().map(|b| b["id"].clone()).collect::<Vec<_>>()},
        {"id":"context","title":"Company & financial context","body":paragraph("Reported financials provide a common starting point. Fiscal periods differ and have not been calendarized. Review each source before using the comparison in client advice."),"layout":"companies","linkedAnalyses":[]},
        {"id":"financing","title":"Financing alternatives","body":paragraph("Assess access to term funding, coupon cash costs and sensitivity to the issuance window. Validate the issuer spread before discussing executable terms."),"layout":"analysis","linkedAnalyses":[id("bond")]},
        {"id":"returns","title":"Returning capital to shareholders","body":paragraph("Compare the share-count effect with cash opportunity cost and liquidity needs. EPS accretion alone does not establish value creation."),"layout":"analysis","linkedAnalyses":[id("buyback")]},
        {"id":"acquisition","title":"Acquisition capacity","body":paragraph("Assess purchase economics, financing capacity and execution constraints. Test a no-synergy case before relying on the assumed synergy benefit."),"layout":"analysis","linkedAnalyses":[id("acquisition")]},
        {"id":"evidence","title":"Sources, assumptions & next steps","body":paragraph("Validate credit spreads, execution prices and transaction terms. Financial scenarios support discussion; they do not establish executable pricing, value creation or transaction feasibility."),"layout":"sources","linkedAnalyses":[]}
    ],"generatedFrom":a.iter().map(|b|(b["id"].as_str().unwrap().to_string(),b["version"].clone())).collect::<serde_json::Map<String,Value>>()})
}
pub fn load(db: &Connection, id: &str) -> Result<Value, ApiError> {
    let (title, client, objective, due, created): (String, String, String, String, String) = db
        .query_row(
            "SELECT title,client,objective,due_date,created_at FROM projects WHERE id=?",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .map_err(|_| ApiError(StatusCode::NOT_FOUND, "Engagement not found".into()))?;
    let (revision,doc):(i64,String)=db.query_row("SELECT revision,payload FROM project_documents WHERE project_id=? ORDER BY revision DESC LIMIT 1",[id],|r|Ok((r.get(0)?,r.get(1)?))).map_err(internal)?;
    let mut q=db.prepare("SELECT revision,created_at FROM project_documents WHERE project_id=? ORDER BY revision DESC").map_err(internal)?;
    let history = q
        .query_map([id], |r| {
            Ok(json!({"revision":r.get::<_,i64>(0)?,"createdAt":r.get::<_,String>(1)?}))
        })
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)?;
    let mut q=db.prepare("SELECT id,created_at FROM project_snapshots WHERE project_id=? ORDER BY created_at DESC").map_err(internal)?;
    let snapshots = q
        .query_map([id], |r| {
            Ok(json!({"id":r.get::<_,String>(0)?,"createdAt":r.get::<_,String>(1)?}))
        })
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)?;
    Ok(
        json!({"id":id,"title":title,"client":client,"objective":objective,"dueDate":due,"createdAt":created,"analyses":analyses(db,id)?,"document":parse(doc),"revision":revision,"history":history,"snapshots":snapshots}),
    )
}
pub async fn list(State(s): State<App>) -> ApiResult {
    let db = s.db.lock().unwrap();
    let mut q = db
        .prepare("SELECT id FROM projects ORDER BY created_at DESC,id")
        .map_err(internal)?;
    let ids = q
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)?;
    let projects = ids
        .iter()
        .map(|id| load(&db, id))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Json(json!({"projects":projects})))
}
pub async fn get_project(State(s): State<App>, Path(id): Path<String>) -> ApiResult {
    Ok(Json(load(&s.db.lock().unwrap(), &id)?))
}
pub async fn create(State(s): State<App>, Json(b): Json<Value>) -> ApiResult {
    let title = b["title"].as_str().unwrap_or("").trim();
    let objective = b["objective"].as_str().unwrap_or("").trim();
    let due = b["dueDate"].as_str().unwrap_or("2026-10-26");
    if title.is_empty()
        || title.len() > 160
        || objective.len() > 5000
        || chrono::NaiveDate::parse_from_str(due, "%Y-%m-%d").is_err()
    {
        return Err(bad(
            "Add a title, a valid date and an objective of up to 5000 characters",
        ));
    }
    if b["client"].as_str().unwrap_or("PepsiCo") != "PepsiCo" {
        return Err(bad(
            "The public demo currently supports PepsiCo as the client",
        ));
    }
    let id = new_id();
    let db = s.db.lock().unwrap();
    let tx = db.unchecked_transaction().map_err(internal)?;
    tx.execute(
        "INSERT INTO projects VALUES(?,?,'PepsiCo',?,?,?)",
        params![id, title, objective, due, now()],
    )
    .map_err(internal)?;
    for kind in ["bond", "buyback", "acquisition"] {
        let aid = new_id();
        let p = finance::defaults(kind);
        let model = finance::calculate(&s.data, kind, &p).map_err(bad)?;
        tx.execute(
            "INSERT INTO briefs VALUES(?,?,?,1)",
            params![aid, kind, model["title"].as_str().unwrap()],
        )
        .map_err(internal)?;
        tx.execute(
            "INSERT INTO versions VALUES(?,1,?,?,?,?)",
            params![
                aid,
                serde_json::to_string(&p).unwrap(),
                model.to_string(),
                "{\"focus\":\"balanced\"}",
                now()
            ],
        )
        .map_err(internal)?;
        tx.execute("INSERT INTO project_analyses VALUES(?,?)", params![id, aid])
            .map_err(internal)?;
    }
    let a = analyses(&tx, &id)?;
    let doc = default_document(title, &a);
    tx.execute(
        "INSERT INTO project_documents VALUES(?,1,?,?)",
        params![id, doc.to_string(), now()],
    )
    .map_err(internal)?;
    tx.commit().map_err(internal)?;
    Ok(Json(load(&db, &id)?))
}
fn validate_rich(v: &Value, depth: usize, count: &mut usize) -> Result<(), ApiError> {
    *count += 1;
    if depth > 24 || *count > 10_000 {
        return Err(bad("Document content is too large"));
    }
    let t = v["type"]
        .as_str()
        .ok_or_else(|| bad("Invalid document node"))?;
    if ![
        "doc",
        "paragraph",
        "text",
        "heading",
        "bulletList",
        "orderedList",
        "listItem",
        "blockquote",
        "hardBreak",
        "horizontalRule",
    ]
    .contains(&t)
    {
        return Err(bad("Unsupported document element"));
    }
    if let Some(text) = v.get("text") {
        if !text.is_string() || text.as_str().unwrap().len() > 100_000 {
            return Err(bad("Invalid document text"));
        }
    }
    if let Some(attrs) = v.get("attrs") {
        let obj = attrs
            .as_object()
            .ok_or_else(|| bad("Invalid document attributes"))?;
        for (k, value) in obj {
            if !((t == "heading" && k == "level" && (1..=3).contains(&value.as_i64().unwrap_or(0)))
                || (t == "orderedList"
                    && k == "start"
                    && (1..=10_000).contains(&value.as_i64().unwrap_or(0))))
            {
                return Err(bad("Unsupported document attribute"));
            }
        }
    }
    if let Some(marks) = v.get("marks") {
        for m in marks.as_array().ok_or_else(|| bad("Invalid text marks"))? {
            if !["bold", "italic", "strike", "code", "underline"]
                .contains(&m["type"].as_str().unwrap_or(""))
                || m.get("attrs").is_some()
            {
                return Err(bad("Unsupported text formatting"));
            }
        }
    }
    if let Some(children) = v.get("content") {
        for child in children
            .as_array()
            .ok_or_else(|| bad("Invalid document content"))?
        {
            validate_rich(child, depth + 1, count)?;
        }
    }
    Ok(())
}
fn validate_document(doc: &Value, a: &[Value]) -> Result<(), ApiError> {
    if doc.to_string().len() > 500_000
        || doc["title"].as_str().unwrap_or("").is_empty()
        || doc["title"].as_str().unwrap().len() > 160
    {
        return Err(bad("Invalid material title or document size"));
    }
    let sections = doc["sections"]
        .as_array()
        .ok_or_else(|| bad("Sections required"))?;
    if sections.len() != 6 {
        return Err(bad("This prototype uses six editable material sections"));
    }
    let mut ids = std::collections::HashSet::new();
    let mut count = 0;
    for section in sections {
        let id = section["id"]
            .as_str()
            .ok_or_else(|| bad("Section ID required"))?;
        if id.is_empty() || id.len() > 80 || !ids.insert(id) {
            return Err(bad("Unique section IDs required"));
        }
        let title = section["title"].as_str().unwrap_or("");
        if title.is_empty() || title.len() > 160 {
            return Err(bad("Section title required"));
        }
        if ![
            "comparison",
            "companies",
            "analysis",
            "sources",
            "narrative",
        ]
        .contains(&section["layout"].as_str().unwrap_or(""))
        {
            return Err(bad("Invalid section layout"));
        }
        for link in section["linkedAnalyses"]
            .as_array()
            .ok_or_else(|| bad("Analysis links required"))?
        {
            if !a.iter().any(|b| b["id"] == *link) {
                return Err(bad("Linked analysis belongs to another engagement"));
            }
        }
        validate_rich(&section["body"], 0, &mut count)?;
    }
    Ok(())
}
pub async fn save_document(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Value>,
) -> ApiResult {
    let db = s.db.lock().unwrap();
    let current = load(&db, &id)?;
    let expected = b["expectedRevision"]
        .as_i64()
        .ok_or_else(|| bad("Expected revision required"))?;
    if current["revision"] != expected {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "Materials changed. Reload before saving.".into(),
        ));
    }
    let doc = &b["document"];
    validate_document(doc, current["analyses"].as_array().unwrap())?;
    db.execute(
        "INSERT INTO project_documents VALUES(?,?,?,?)",
        params![id, expected + 1, doc.to_string(), now()],
    )
    .map_err(internal)?;
    Ok(Json(load(&db, &id)?))
}
pub async fn generate(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Value>,
) -> ApiResult {
    let started = Instant::now();
    let db = s.db.lock().unwrap();
    let p = load(&db, &id)?;
    if b["expectedRevision"] != p["revision"] {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "Materials changed. Reload before rebuilding.".into(),
        ));
    }
    let doc = default_document(
        p["title"].as_str().unwrap(),
        p["analyses"].as_array().unwrap(),
    );
    db.execute(
        "INSERT INTO project_documents VALUES(?,?,?,?)",
        params![
            id,
            p["revision"].as_i64().unwrap() + 1,
            doc.to_string(),
            now()
        ],
    )
    .map_err(internal)?;
    Ok(Json(
        json!({"project":load(&db,&id)?,"elapsedMs":started.elapsed().as_millis(),"steps":["Loaded public-source financials","Bound three calculated scenarios","Prepared six editable material sections","Saved a new material revision"],"mode":"deterministic"}),
    ))
}
pub async fn snapshot(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Value>,
) -> ApiResult {
    let db = s.db.lock().unwrap();
    let p = load(&db, &id)?;
    if p["revision"] != b["expectedRevision"] {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "Save the current draft before creating a review copy".into(),
        ));
    }
    let sid = new_id();
    let date = now();
    let snap = json!({"id":sid,"projectId":id,"title":p["title"],"client":p["client"],"document":p["document"],"revision":p["revision"],"analyses":p["analyses"],"sourceAsOf":s.data["asOf"],"createdAt":date});
    db.execute(
        "INSERT INTO project_snapshots VALUES(?,?,?,?)",
        params![sid, id, snap.to_string(), date],
    )
    .map_err(internal)?;
    Ok(Json(snap))
}
pub async fn get_snapshot(
    State(s): State<App>,
    Path((id, sid)): Path<(String, String)>,
) -> ApiResult {
    let value: String =
        s.db.lock()
            .unwrap()
            .query_row(
                "SELECT payload FROM project_snapshots WHERE project_id=? AND id=?",
                params![id, sid],
                |r| r.get(0),
            )
            .map_err(|_| bad("Review copy not found"))?;
    Ok(Json(parse(value)))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rich_text_rejects_script_and_url_attributes() {
        let mut n = 0;
        assert!(validate_rich(&json!({"type":"script"}), 0, &mut n).is_err());
        assert!(
            validate_rich(
                &json!({"type":"paragraph","attrs":{"onclick":"alert(1)"}}),
                0,
                &mut n
            )
            .is_err()
        );
    }
    #[test]
    fn rich_text_allows_bounded_formatted_copy() {
        let mut n = 0;
        assert!(validate_rich(&json!({"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Client discussion","marks":[{"type":"bold"}]}]}]}),0,&mut n).is_ok());
    }
}
