//! Client decisions own the plan, scenarios and materials; model execution is a later port.
use super::*;
use serde::Deserialize;

pub fn init(db: &Connection) -> Result<(), ApiError> {
    db.execute_batch("CREATE TABLE IF NOT EXISTS client_review_copies(id TEXT PRIMARY KEY,room_id TEXT,revision INTEGER,payload TEXT,created_at TEXT); CREATE TABLE IF NOT EXISTS client_evaluations(id TEXT PRIMARY KEY,room_id TEXT,payload TEXT,created_at TEXT); CREATE TABLE IF NOT EXISTS client_revisions(room_id TEXT,revision INTEGER,payload TEXT,PRIMARY KEY(room_id,revision));").map_err(internal)?;
    let rows = {
        let mut q = db
            .prepare(
                "SELECT id,payload FROM agent_rooms WHERE json_type(payload,'$.mandate')='object'",
            )
            .map_err(internal)?;
        q.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .map_err(internal)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(internal)?
    };
    let tx = db.unchecked_transaction().map_err(internal)?;
    for (id, payload) in rows {
        let mut r = parse(payload);
        let full: Vec<Value> = r["history"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|h| h.get("draft").is_some())
            .cloned()
            .collect();
        for snapshot in full {
            tx.execute(
                "INSERT OR IGNORE INTO client_revisions VALUES(?,?,?)",
                params![id, snapshot["revision"].as_i64(), snapshot.to_string()],
            )
            .map_err(internal)?;
        }
        workflow::compact_history(&mut r);
        if !r["draft"].is_null()
            && r["mandate"]["documentContract"] != "client-decision/2"
            && r["documentUpgrade"].is_null()
        {
            let revision = r["revision"].as_i64().unwrap();
            let mut original = r.clone();
            original.as_object_mut().unwrap().remove("history");
            tx.execute(
                "INSERT OR IGNORE INTO client_revisions VALUES(?,?,?)",
                params![id, revision, original.to_string()],
            )
            .map_err(internal)?;
            let mut upgraded = r.clone();
            match sync_client_document(&mut upgraded) {
                Ok(()) => {
                    upgraded["mandate"]["decisionState"] = json!("review_required");
                    upgraded["mandate"]["preferredOption"] = Value::Null;
                    upgraded["documentUpgrade"] = json!({"state":"migrated","fromRevision":revision,"contract":"client-decision/2","reviewRequired":true});
                    let affected = advice_pages(&upgraded);
                    reopen_reviews(
                        &mut upgraded,
                        &affected,
                        revision + 1,
                        "Document contract upgrade requires review of the complete client argument",
                    );
                    upgraded["changeLog"].as_array_mut().unwrap().push(json!({"at":now(),"revision":revision+1,"type":"document_contract_upgrade","affectedPages":affected,"narrativeReviewRequired":true}));
                    r = upgraded;
                }
                Err(error) => {
                    r["documentUpgrade"] = json!({"state":"requires_repreparation","reason":error.1,"fromRevision":revision,"reviewRequired":true});
                }
            }
            r = workflow::revised(r, revision, "document_contract_upgrade");
            let snapshot = r["history"].as_array().unwrap().last().unwrap().clone();
            tx.execute(
                "INSERT INTO client_revisions VALUES(?,?,?)",
                params![id, revision + 1, snapshot.to_string()],
            )
            .map_err(internal)?;
            workflow::compact_history(&mut r);
        }
        tx.execute(
            "UPDATE agent_rooms SET revision=?,payload=? WHERE id=?",
            params![r["revision"].as_i64(), r.to_string(), id],
        )
        .map_err(internal)?;
    }
    tx.commit().map_err(internal)?;
    Ok(())
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Brief {
    kind: String,
    issuer: String,
    target: Option<String>,
    question: String,
    audience: String,
    meeting_date: String,
    criteria: String,
    constraints: String,
    funding_need: Option<f64>,
}
fn text(value: &str, min: usize, max: usize, field: &str) -> Result<(), ApiError> {
    if !(min..=max).contains(&value.trim().chars().count()) {
        return Err(bad(format!("{field} requires {min}–{max} characters")));
    }
    Ok(())
}
fn current(s: &App, id: &str, expected: i64) -> Result<Value, ApiError> {
    let r = agent::load(s, id)?;
    if r["revision"] != expected {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "Workroom changed. Reload before saving.".into(),
        ));
    }
    if r["mandate"].is_null() {
        return Err(bad("Select a client decision workroom"));
    }
    Ok(r)
}
pub(crate) fn advice_pages(r: &Value) -> Vec<Value> {
    r["draft"]["slides"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|p| {
            p["blocks"].as_array().into_iter().flatten().any(|b| {
                ["client_decision", "client_view", "client_conditions"]
                    .contains(&b["type"].as_str().unwrap_or(""))
            })
        })
        .map(|p| p["id"].clone())
        .collect()
}
pub(crate) fn reopen_reviews(r: &mut Value, pages: &[Value], revision: i64, reason: &str) {
    for issue in r["reviewIssues"].as_array_mut().into_iter().flatten() {
        if pages.contains(&issue["pageId"])
            && ["verified", "applied", "deferred"].contains(&issue["status"].as_str().unwrap_or(""))
        {
            issue["supersededVerification"] = json!({"status":issue["status"],"verifiedBy":issue["verifiedBy"],"verifiedRevision":issue["verifiedRevision"],"appliedRevision":issue["appliedRevision"]});
            issue["status"] = json!("open");
            issue["reopenedAtRevision"] = json!(revision);
            issue["reopenReason"] = json!(reason);
            issue.as_object_mut().unwrap().remove("appliedRevision");
            issue.as_object_mut().unwrap().remove("verifiedBy");
            issue.as_object_mut().unwrap().remove("verifiedRevision");
        }
    }
}
fn sync_client_document(r: &mut Value) -> Result<(), ApiError> {
    if r["draft"].is_null() {
        return Ok(());
    }
    for field in [
        "question",
        "criteria",
        "constraints",
        "recommendation",
        "reversalCondition",
    ] {
        if r["mandate"][field].as_str().unwrap_or("").chars().count() > 300 {
            return Err(bad(format!(
                "Shorten the {field} summary to 300 characters; client conditions are never silently truncated"
            )));
        }
    }
    let mut d: materials::Draft = serde_json::from_value(r["draft"].clone()).map_err(internal)?;
    for (id, title, kind) in [
        (
            "decision-view",
            "The criteria and our conditional rationale",
            "client_view",
        ),
        (
            "decision-conditions",
            "Conditions that could change our view",
            "client_conditions",
        ),
    ] {
        if !d
            .slides
            .iter()
            .flat_map(|p| &p.blocks)
            .any(|b| b.r#type == kind)
        {
            if d.slides.iter().any(|p| p.id == id) {
                return Err(bad(
                    "A custom page conflicts with the required decision section",
                ));
            }
            let page: materials::Slide = serde_json::from_value(
                json!({"id":id,"title":title,"layout":"full","blocks":[{"type":kind}]}),
            )
            .map_err(internal)?;
            let at = if kind == "client_view" { 1 } else { 2 };
            d.slides.insert(at.min(d.slides.len()), page);
        }
    }
    if let Some(p) = d.slides.iter_mut().find(|p| p.id == "alternatives") {
        p.blocks =
            vec![serde_json::from_value(json!({"type":"decision_comparison"})).map_err(internal)?];
        p.layout = "full".into();
    }
    r["mandate"]["documentContract"] = json!("client-decision/2");
    r["scene"] = materials::compile(&d, r)?;
    r["draft"] = json!(d);
    Ok(())
}
fn items() -> Value {
    json!([
        {"id":"brief","title":"Agree the client decision and constraints","owner":"Coverage banker","dependsOn":[],"status":"complete","acceptance":"Decision owner, meeting, criteria and scope are recorded"},
        {"id":"evidence","title":"Pin company financials and rate references","owner":"Source workflow","dependsOn":["brief"],"status":"planned","acceptance":"Original units, periods, filing dates and source identities are retained"},
        {"id":"alternatives","title":"Compare structures and a downside case","owner":"Financial workflow","dependsOn":["evidence"],"status":"planned","acceptance":"Two named alternatives and status quo; explicit scenario assumptions"},
        {"id":"materials","title":"Prepare the client discussion and inspection record","owner":"Materials workflow","dependsOn":["alternatives"],"status":"planned","acceptance":"Figures bind to saved calculations; sources and assumptions remain visible"},
        {"id":"commercial","title":"Confirm current market terms and execution feasibility","owner":"Coverage / product banker","dependsOn":["alternatives"],"status":"blocked","acceptance":"Permitted current quotes, funding purpose, credit and execution checks; archive assumptions do not clear this gate"},
        {"id":"review","title":"Challenge the advice and close review issues","owner":"Senior banker","dependsOn":["materials"],"status":"planned","acceptance":"Decision, methods, downside and source dates reviewed; exact review copy recorded"}
    ])
}
pub async fn create(State(s): State<App>, Json(b): Json<Brief>) -> ApiResult {
    if !["bond", "buyback", "acquisition"].contains(&b.kind.as_str())
        || !connectors::CATALOG.iter().any(|c| c.0 == b.issuer)
    {
        return Err(bad("Choose a covered company and financial workflow"));
    }
    let target = b.target.as_deref().unwrap_or("CPB");
    if b.kind == "acquisition"
        && (target == b.issuer || !connectors::CATALOG.iter().any(|c| c.0 == target))
    {
        return Err(bad("Choose a distinct covered target"));
    }
    text(&b.question, 20, 300, "Client decision summary")?;
    text(&b.audience, 2, 120, "Decision owner")?;
    text(&b.criteria, 10, 300, "Decision criteria summary")?;
    text(&b.constraints, 10, 300, "Constraint summary")?;
    if b.funding_need
        .is_some_and(|n| !n.is_finite() || n <= 0. || n > 100000.)
    {
        return Err(bad(
            "Net funding requirement must be positive and at most USD 100,000m",
        ));
    }
    chrono::NaiveDate::parse_from_str(&b.meeting_date, "%Y-%m-%d")
        .map_err(|_| bad("Choose a valid meeting date"))?;
    let name = connectors::CATALOG
        .iter()
        .find(|c| c.0 == b.issuer)
        .unwrap()
        .2;
    let mut r = workflow::empty(&format!(
        "{name} — {}",
        match b.kind.as_str() {
            "bond" => "Funding decision",
            "buyback" => "Capital allocation",
            _ => "Acquisition discussion",
        }
    ));
    r["mandate"] = json!({"kind":b.kind,"issuer":b.issuer,"target":if b.kind=="acquisition"{Some(target)}else{None},"question":b.question.trim(),"audience":b.audience.trim(),"meetingDate":b.meeting_date,"criteria":b.criteria.trim(),"constraints":b.constraints.trim(),"fundingNeed":if b.kind=="bond"{b.funding_need}else{None},"status":"plan","preferredOption":null,"recommendation":"","reversalCondition":"","decisionState":"unrecorded","decisionOwner":"Coverage banker","documentContract":"client-decision/2"});
    r["workItems"] = items();
    r["reviewIssues"] = json!([]);
    r["changeLog"] = json!([]);
    r["scenarioPlan"] = json!({"base":finance::defaults(&b.kind),"alternative":alternative(&b.kind,&finance::defaults(&b.kind)),"assumptionStatus":"Proposed illustrative terms; banker confirmation required"});
    r["messages"] = json!([{"role":"banker","text":b.question.trim(),"at":now()},{"role":"system","text":"Decision brief saved. Review the work plan and illustrative assumptions before running the local workflow. These steps execute financial tools; they are not autonomous model reasoning.","at":now()}]);
    workflow::insert(&s, &r)?;
    Ok(Json(workflow::commit(&s, r, 0, "client_brief")?))
}
fn alternative(kind: &str, p: &Params) -> Params {
    let mut q = p.clone();
    match kind {
        "bond" => {
            q.insert("tenor".into(), if p["tenor"] > 3. { 3. } else { 5. });
        }
        "buyback" => {
            q.insert("amount".into(), p["amount"] / 2.);
        }
        _ => {
            q.insert(
                "debtPercent".into(),
                if p["debtPercent"] > 40. { 40. } else { 60. },
            );
        }
    }
    q
}
pub fn option_name(kind: &str, which: &str) -> &'static str {
    if which == "base" {
        "Primary structure"
    } else {
        match kind {
            "bond" => "Alternative tenor",
            "buyback" => "Smaller repurchase",
            _ => "Alternative funding mix",
        }
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Prepare {
    expected_revision: i64,
    base: Params,
    alternative: Params,
    rationale: String,
    acknowledge_illustrative: bool,
    #[serde(default)]
    size_to_funding: bool,
}
async fn tool(
    s: &App,
    run: &str,
    session: &mcp::Session,
    name: &str,
    args: Value,
) -> Result<Value, ApiError> {
    agent::event(
        s,
        run,
        "tool_call",
        json!({"tool":name,"arguments":args,"protocol":"MCP tools/call"}),
    )?;
    let result = session.call(name, args).await?;
    agent::event(
        s,
        run,
        "tool_result",
        json!({"tool":name,"result":result,"protocol":"MCP structuredContent"}),
    )?;
    Ok(result)
}
fn begin(s: &App, id: &str) -> Result<String, ApiError> {
    let run = new_id();
    s.db.lock()
        .unwrap()
        .execute(
            "INSERT INTO agent_runs VALUES(?,?,'running','{}',?)",
            params![run, id, now()],
        )
        .map_err(internal)?;
    Ok(run)
}
fn finish(s: &App, run: &str, outcome: &Result<Value, ApiError>) -> Result<(), ApiError> {
    let (status, data) = match outcome {
        Ok(r) => (
            "completed",
            json!({"roomId":r["id"],"mode":"local_structured_workflow","message":"Financial workflow completed; banker review and current-market confirmation remain open."}),
        ),
        Err(e) => ("failed", json!({"error":e.1})),
    };
    s.db.lock()
        .unwrap()
        .execute(
            "UPDATE agent_runs SET status=?,payload=? WHERE id=?",
            params![status, data.to_string(), run],
        )
        .map_err(internal)?;
    Ok(())
}
fn replace_reference(v: &mut Value, old: &str, new: &str) {
    match v {
        Value::Object(o) => {
            if o.get("analysisId").and_then(Value::as_str) == Some(old) {
                o.insert("analysisId".into(), json!(new));
            }
            for child in o.values_mut() {
                replace_reference(child, old, new)
            }
        }
        Value::Array(a) => {
            for child in a {
                replace_reference(child, old, new)
            }
        }
        _ => {}
    }
}
pub async fn prepare(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Prepare>,
) -> ApiResult {
    let mut r = current(&s, &id, b.expected_revision)?;
    if !r["analyses"].as_object().unwrap().is_empty() {
        return Err(bad(
            "This plan has run; revise an existing alternative instead",
        ));
    }
    if !b.acknowledge_illustrative {
        return Err(bad(
            "Confirm the illustrative nature of the scenario assumptions",
        ));
    }
    text(&b.rationale, 20, 1800, "Assumption rationale")?;
    let kind = r["mandate"]["kind"].as_str().unwrap().to_string();
    let instruction_led = r["mandate"]["instructionLed"] == true;
    let funding_need = r["mandate"]["fundingNeed"].as_f64();
    let issuer = r["mandate"]["issuer"].as_str().unwrap().to_string();
    let target = r["mandate"]["target"].as_str().map(str::to_string);
    finance::validate(&kind, &b.base).map_err(bad)?;
    finance::validate(&kind, &b.alternative).map_err(bad)?;
    let _gate = s
        .agent_gate
        .clone()
        .try_acquire_owned()
        .map_err(|_| bad("Another local workflow is running"))?;
    let run = begin(&s, &id)?;
    r["lastRunId"] = json!(run);
    r["options"] = json!([
        {"id":"base","role":"action","name":option_name(&kind,"base"),"analysisId":"base_case"},
        {"id":"alternative","role":"action","name":option_name(&kind,"alternative"),"analysisId":"alternative_case"}
    ]);
    r["stresses"] = if kind == "acquisition" {
        json!([
            {"id":"downside","role":"stress","actionId":"base","name":"Primary acquisition · no-synergy stress","analysisId":"downside_case"},
            {"id":"downside_alternative","role":"stress","actionId":"alternative","name":"Alternative funding · no-synergy stress","analysisId":"downside_alternative"}
        ])
    } else {
        json!([])
    };
    let outcome = async {
        let session = mcp::Session::new(s.clone(), r, false).await?;
        agent::event(&s,&run,"mcp_discovery",json!({"tools":session.tools().await?,"mode":"local_structured_workflow","models":"deferred"}))?;
        tool(&s,&run,&session,"company_catalog",json!({})).await?;
        tool(&s,&run,&session,"fetch_company_facts",json!({"symbol":issuer})).await?;
        let mut symbols = vec![issuer.clone()];
        if let Some(t) = &target {
            tool(&s,&run,&session,"fetch_company_facts",json!({"symbol":t})).await?;
            symbols.push(t.clone());
        }
        if instruction_led {for (symbol,_,_) in connectors::CATALOG {if !symbols.iter().any(|s|s==symbol){tool(&s,&run,&session,"fetch_company_facts",json!({"symbol":symbol})).await?;symbols.push(symbol.into());}}}
        tool(&s,&run,&session,"fetch_treasury_curve",json!({})).await?;
        for (which,original_params) in [("base",&b.base),("alternative",&b.alternative)] {
            let mut sized_params=original_params.clone();
            if b.size_to_funding {
                if kind != "bond" {return Err(bad("Only bond plans can be sized to net funding"));}
                let need=funding_need.ok_or_else(||bad("Record the client's net funding requirement"))?;
                let snapshot=session.server.snapshot().await;let curve=&snapshot["sources"]["treasury:USD"];
                let data=json!({"curve":curve});let y=finance::treasury(&data,sized_params["tenor"])+sized_params["spread"]/100.;
                let net=finance::bond_price(sized_params["coupon"],y,sized_params["tenor"])/100.-sized_params["fees"]/10000.;
                if net<=0.{return Err(bad("Assumed terms cannot generate positive net cash"));}
                sized_params.insert("amount".into(),need/net);finance::validate(&kind,&sized_params).map_err(bad)?;
            }
            let params=&sized_params;
            tool(&s,&run,&session,"calculate_finance",json!({"analysisId":format!("{which}_case"),"kind":kind,"issuer":issuer,"target":target,"params":params,"rationale":b.rationale})).await?;
            if kind == "acquisition" {
                let mut stress = params.clone(); stress.insert("synergies".into(),0.);
                let stress_id = if which == "base" {"downside_case"} else {"downside_alternative"};
                tool(&s,&run,&session,"calculate_finance",json!({"analysisId":stress_id,"kind":kind,"issuer":issuer,"target":target,"params":stress,"rationale":format!("Zero-synergy stress of the {which} acquisition action. All other terms match that action. A stress state is not a management choice.")})).await?;
            }
        }
        let task=session.server.snapshot().await["mandate"]["question"].as_str().unwrap().to_string();
        tool(&s,&run,&session,"build_context",json!({"task":task,"symbols":symbols,"maxChars":24000})).await?;
        let mut document = workflow::storyboard(&kind,&issuer,target.as_deref().unwrap_or("CPB"));
        let pages = document["slides"].as_array_mut().unwrap();
        // The actual decision replaces the generic advisory placeholder.
        if kind == "acquisition" {pages.retain(|p|p["id"]!="judgement");}
        pages[0]["title"] = json!("The client decision and our conditional action");
        pages[0]["layout"] = json!("full"); pages[0]["blocks"] = json!([{"type":"client_decision"}]);
        pages.insert(1,json!({"id":"decision-view","title":"The criteria and our conditional rationale","layout":"full","blocks":[{"type":"client_view"}]}));
        pages.insert(2,json!({"id":"decision-conditions","title":"Conditions that could change our view","layout":"full","blocks":[{"type":"client_conditions"}]}));
        let at = pages.len()-1;
        pages.insert(at,json!({"id":"alternatives","title":"Compare the choices against the client requirement","layout":"full","blocks":[{"type":"decision_comparison"}]}));
        pages.insert(at+1,json!({"id":"alternative-terms","title":"Make the alternative assumptions explicit","layout":"full","blocks":[{"type":"assumptions","analysisId":"alternative_case"}]}));
        if kind == "acquisition" {
            for (offset,id,aid,title) in [(2,"primary-stress","downside_case","Challenge the primary action without synergies"),(3,"alternative-stress","downside_alternative","Challenge the funding alternative without synergies")] {
                pages.insert(at+offset,json!({"id":id,"title":title,"layout":"split","blocks":[{"type":"metrics","analysisId":aid},{"type":"assumptions","analysisId":aid}]}));
            }
        }
        tool(&s,&run,&session,"compose_materials",document).await?;
        let mut r=session.server.snapshot().await;
        if instruction_led {
            r["sources"]["bank:rabobank"]=pool::bank_profile();
            r["sources"]["sector:US"]=pool::sector_reference();
            let peers:Vec<Value>=symbols.iter().map(|symbol| {
                let c=&r["sources"][format!("sec:{symbol}")];let f=&c["facts"];let value=|k:&str|f[k]["value"].as_f64().unwrap()/1e6;
                let ebitda=value("operatingIncome")+value("da");
                json!({"symbol":symbol,"name":c["name"],"periodEnd":c["periodEnd"],"revenue":value("revenue"),"netDebt":value("debt")-value("cash"),"ebitdaProxy":ebitda,"netLeverage":if ebitda>0.{Some((value("debt")-value("cash"))/ebitda)}else{None},"poolReceiptId":c["poolReceiptId"],"basis":"Reported debt less cash / operating-income plus D&A proxy. Annual periods differ; no live trading multiples."})
            }).collect();
            r["peerPosition"]=json!(peers);
            let pages=r["draft"]["slides"].as_array_mut().unwrap();let at=pages.len()-1;
            pages.insert(at,json!({"id":"peer-position","title":"Place the client in its reported peer context","layout":"full","blocks":[{"type":"peer_position"}]}));
            pages.insert(at+1,json!({"id":"bank-proposition","title":"Make the bank's relevance specific to this client","layout":"full","blocks":[{"type":"bank_proposition"}]}));
            sync_client_document(&mut r)?;
        }
        r["mandate"]["status"]=json!("review");r["executionMode"]=json!("local_structured_workflow");r["modelPort"]=json!({"state":"deferred"});
        for (aid,label) in [("base_case",option_name(&kind,"base")),("alternative_case",option_name(&kind,"alternative")),("downside_case","Primary action · no-synergy stress"),("downside_alternative","Alternative action · no-synergy stress")] {
            if !r["analyses"][aid].is_null(){r["analyses"][aid]["displayName"]=json!(label);lineage::attach(&mut r,aid)?;}
        }
        for item in r["workItems"].as_array_mut().unwrap() {
            if ["evidence","alternatives","materials"].contains(&item["id"].as_str().unwrap_or("")){item["status"]=json!("complete");}
            if item["id"]=="review" && !["blocked","deferred"].contains(&item["status"].as_str().unwrap_or("")){item["status"]=json!("ready");}
        }
        r["messages"].as_array_mut().unwrap().push(json!({"role":"system","text":"Prepared client-bound discussion pages and comparable alternatives from the public archive. Current-market confirmation, qualified judgement and review remain open. No model inference or live source call was used.","at":now()}));
        workflow::commit(&s,r,b.expected_revision,"client_work_prepared")
    }.await;
    finish(&s, &run, &outcome)?;
    Ok(Json(outcome?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Revision {
    expected_revision: i64,
    option_id: String,
    params: Params,
    rationale: String,
    #[serde(default)]
    size_to_funding: bool,
}
pub async fn revise(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Revision>,
) -> ApiResult {
    let mut r = current(&s, &id, b.expected_revision)?;
    if !["base", "alternative"].contains(&b.option_id.as_str()) {
        return Err(bad("Choose one existing alternative"));
    }
    text(&b.rationale, 20, 1800, "Assumption rationale")?;
    let option = r["options"]
        .as_array()
        .and_then(|a| a.iter().find(|o| o["id"] == b.option_id))
        .ok_or_else(|| bad("Prepare the work plan first"))?;
    let old = option["analysisId"].as_str().unwrap().to_string();
    let a = r["analyses"][&old].clone();
    let mut scenario_params = b.params.clone();
    if b.size_to_funding {
        let need = r["mandate"]["fundingNeed"]
            .as_f64()
            .ok_or_else(|| bad("Record a net funding requirement before sizing"))?;
        if a["kind"] != "bond" {
            return Err(bad("Issue sizing applies only to bond funding"));
        }
        finance::validate("bond", &scenario_params).map_err(bad)?;
        let p = &scenario_params;
        let y = finance::treasury(&a["sourceSnapshot"], p["tenor"]) + p["spread"] / 100.;
        let net_per_notional =
            finance::bond_price(p["coupon"], y, p["tenor"]) / 100. - p["fees"] / 10000.;
        if net_per_notional <= 0. {
            return Err(bad("These terms cannot generate positive net proceeds"));
        }
        scenario_params.insert("amount".into(), need / net_per_notional);
    }
    finance::validate(a["kind"].as_str().unwrap(), &scenario_params).map_err(bad)?;
    let _gate = s
        .agent_gate
        .clone()
        .try_acquire_owned()
        .map_err(|_| bad("Another local workflow is running"))?;
    let run = begin(&s, &id)?;
    r["lastRunId"] = json!(run);
    let outcome = async {
        let session=mcp::Session::new(s.clone(),r,false).await?;
        let new=format!("{}_r{}",b.option_id,b.expected_revision+1);
        tool(&s,&run,&session,"calculate_finance",json!({"analysisId":new,"kind":a["kind"],"issuer":a["issuer"],"target":a["target"],"params":scenario_params,"rationale":b.rationale})).await?;
        let mut r=session.server.snapshot().await;
        let mut affected:Vec<Value>=r["draft"]["slides"].as_array().unwrap().iter().filter(|p|p["blocks"].as_array().unwrap().iter().any(|b|b["analysisId"]==old||b["type"]=="decision_comparison")).map(|p|p["id"].clone()).collect();
        replace_reference(&mut r["draft"],&old,&new);
        for option in r["options"].as_array_mut().unwrap(){if option["id"]==b.option_id{option["analysisId"]=json!(new);}}
        r["analyses"][&new]["displayName"]=a["displayName"].clone();lineage::attach(&mut r,&new)?;
        if a["kind"]=="acquisition" {
            let stress=r["stresses"].as_array().unwrap().iter().find(|x|x["actionId"]==b.option_id).ok_or_else(||bad("Prepare a current workroom with a stress for each acquisition action"))?.clone();
            let old_stress=stress["analysisId"].as_str().unwrap().to_string();let new_stress=format!("stress_{}_r{}",b.option_id,b.expected_revision+1);
            let mut params=scenario_params.clone();params.insert("synergies".into(),0.);
            let value=tool(&s,&run,&session,"calculate_finance",json!({"analysisId":new_stress,"kind":a["kind"],"issuer":a["issuer"],"target":a["target"],"params":params,"rationale":"Recomputed zero-synergy stress, with every other term matching its updated acquisition action."})).await?;
            r["analyses"][&new_stress]=value;r["analyses"][&new_stress]["displayName"]=stress["name"].clone();lineage::attach(&mut r,&new_stress)?;
            for p in r["draft"]["slides"].as_array().unwrap(){if p["blocks"].as_array().unwrap().iter().any(|b|b["analysisId"]==old_stress){affected.push(p["id"].clone());}}
            replace_reference(&mut r["draft"],&old_stress,&new_stress);
            for stress in r["stresses"].as_array_mut().unwrap(){if stress["actionId"]==b.option_id{stress["analysisId"]=json!(new_stress);}}
        }
        r["mandate"]["decisionState"]=json!("review_required");r["mandate"]["preferredOption"]=Value::Null;
        sync_client_document(&mut r)?;
        affected.extend(advice_pages(&r));affected.sort_by(|a,b|a.as_str().cmp(&b.as_str()));affected.dedup();
        reopen_reviews(&mut r,&affected,b.expected_revision+1,"Active economics changed; the prior correction or advice requires a fresh check");
        for task in r["workItems"].as_array_mut().unwrap(){if task["id"]=="review" && !["blocked","deferred"].contains(&task["status"].as_str().unwrap_or("")){task["status"]=json!("ready");}}
        let symbols:Vec<String>=r["sources"].as_object().unwrap().keys().filter_map(|k|k.strip_prefix("sec:").map(str::to_string)).collect();
        r["contextPacket"]=evidence::packet(&r,r["mandate"]["question"].as_str().unwrap(),&symbols,24000)?;
        r["changeLog"].as_array_mut().unwrap().push(json!({"at":now(),"revision":b.expected_revision+1,"type":"scenario_recalculation","optionId":b.option_id,"oldAnalysisId":old,"newAnalysisId":new,"affectedPages":affected,"rationale":b.rationale,"narrativeReviewRequired":true}));
        workflow::commit(&s,r,b.expected_revision,"scenario_recalculation")
    }.await;
    finish(&s, &run, &outcome)?;
    Ok(Json(outcome?))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Decision {
    expected_revision: i64,
    preferred_option: String,
    recommendation: String,
    reversal_condition: String,
}
pub async fn decision(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Decision>,
) -> ApiResult {
    let mut r = current(&s, &id, b.expected_revision)?;
    if r["draft"].is_null() {
        return Err(bad("Prepare the alternatives before recording a view"));
    }
    if !["base", "alternative", "status_quo", "insufficient"].contains(&b.preferred_option.as_str())
    {
        return Err(bad(
            "Choose an existing alternative or insufficient evidence",
        ));
    }
    text(&b.recommendation, 20, 300, "Conditional rationale summary")?;
    text(&b.reversal_condition, 20, 300, "Reversal condition summary")?;
    r["mandate"]["preferredOption"] = json!(b.preferred_option);
    r["mandate"]["recommendation"] = json!(b.recommendation.trim());
    r["mandate"]["reversalCondition"] = json!(b.reversal_condition.trim());
    r["mandate"]["decisionState"] = json!(if b.preferred_option == "insufficient" {
        "insufficient_evidence"
    } else {
        "conditional_view"
    });
    r["mandate"]["viewAtRevision"] = json!(b.expected_revision + 1);
    sync_client_document(&mut r)?;
    let pages = advice_pages(&r);
    reopen_reviews(
        &mut r,
        &pages,
        b.expected_revision + 1,
        "The banker action or advisory rationale changed",
    );
    r["changeLog"].as_array_mut().unwrap().push(json!({"revision":b.expected_revision+1,"type":"banker_view_updated","affectedPages":pages,"narrativeReviewRequired":true,"at":now()}));
    Ok(Json(workflow::commit(
        &s,
        r,
        b.expected_revision,
        "banker_conditional_view",
    )?))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct BriefUpdate {
    expected_revision: i64,
    question: String,
    audience: String,
    meeting_date: String,
    criteria: String,
    constraints: String,
    owner: String,
    funding_need: Option<f64>,
    #[serde(default)]
    funding_requirement_confirmed: bool,
}
pub async fn update_brief(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<BriefUpdate>,
) -> ApiResult {
    let mut r = current(&s, &id, b.expected_revision)?;
    text(&b.question, 20, 300, "Client decision summary")?;
    text(&b.audience, 2, 120, "Decision owner")?;
    text(&b.criteria, 10, 300, "Criteria summary")?;
    text(&b.constraints, 10, 300, "Constraint summary")?;
    text(&b.owner, 2, 100, "Responsible banker")?;
    chrono::NaiveDate::parse_from_str(&b.meeting_date, "%Y-%m-%d")
        .map_err(|_| bad("Valid meeting date required"))?;
    if let Some(need) = b.funding_need {
        if r["mandate"]["kind"] != "bond" || !need.is_finite() || need <= 0. || need > 100000. {
            return Err(bad(
                "A positive net-funding requirement applies to a bond decision, up to USD100,000m",
            ));
        }
    }
    let funding_changed = b
        .funding_need
        .is_some_and(|n| r["mandate"]["fundingNeed"].as_f64() != Some(n));
    if funding_changed && !b.funding_requirement_confirmed {
        return Err(bad(
            "Reconcile and confirm the structured net-funding requirement against the client question",
        ));
    }
    for (key, value) in [
        ("question", b.question),
        ("audience", b.audience),
        ("meetingDate", b.meeting_date),
        ("criteria", b.criteria),
        ("constraints", b.constraints),
        ("decisionOwner", b.owner),
    ] {
        r["mandate"][key] = json!(value.trim());
    }
    if let Some(need) = b.funding_need {
        r["mandate"]["fundingNeed"] = json!(need);
    }
    r["mandate"]["decisionState"] = json!("review_required");
    r["mandate"]["preferredOption"] = Value::Null;
    let mut affected = advice_pages(&r);
    let _permit = if funding_changed && !r["draft"].is_null() {
        Some(
            s.agent_gate
                .clone()
                .try_acquire_owned()
                .map_err(|_| bad("Another local workflow is running"))?,
        )
    } else {
        None
    };
    let mut pending_run = None;
    if funding_changed && !r["draft"].is_null() {
        let run = begin(&s, &id)?;
        r["lastRunId"] = json!(run);
        pending_run = Some(run.clone());
        let outcome=async {
            let options=r["options"].as_array().unwrap().clone();
            let session=mcp::Session::new(s.clone(),r,false).await?;
            for option in &options {
                let old=option["analysisId"].as_str().unwrap();let snapshot=session.server.snapshot().await;let a=&snapshot["analyses"][old];
                let new=format!("{}_need_r{}",option["id"].as_str().unwrap(),b.expected_revision+1);
                tool(&s,&run,&session,"calculate_finance",json!({"analysisId":new,"kind":a["kind"],"issuer":a["issuer"],"target":a["target"],"params":a["params"],"rationale":a["assumptionRationale"]})).await?;
            }
            let mut r=session.server.snapshot().await;
            for option in options {
                let old=option["analysisId"].as_str().unwrap().to_string();let new=format!("{}_need_r{}",option["id"].as_str().unwrap(),b.expected_revision+1);
                for page in r["draft"]["slides"].as_array().unwrap(){if page["blocks"].as_array().unwrap().iter().any(|b|b["analysisId"]==old||b["type"]=="decision_comparison"){affected.push(page["id"].clone());}}
                replace_reference(&mut r["draft"],&old,&new);for active in r["options"].as_array_mut().unwrap(){if active["id"]==option["id"]{active["analysisId"]=json!(new);}}
                r["analyses"][&new]["displayName"]=option["name"].clone();lineage::attach(&mut r,&new)?;
            }
            Ok::<Value,ApiError>(r)
        }.await;
        if outcome.is_err() {
            finish(&s, &run, &outcome)?;
        }
        r = outcome?;
    }
    let outcome = (|| -> Result<Value, ApiError> {
        for task in r["workItems"].as_array_mut().unwrap() {
            if task["id"] == "review"
                && !["blocked", "deferred"].contains(&task["status"].as_str().unwrap_or(""))
            {
                task["status"] = json!("ready");
            }
        }
        sync_client_document(&mut r)?;
        affected.extend(advice_pages(&r));
        affected.sort_by(|a, b| a.as_str().cmp(&b.as_str()));
        affected.dedup();
        reopen_reviews(
            &mut r,
            &affected,
            b.expected_revision + 1,
            if funding_changed {
                "The client net-funding requirement changed; prior advice and dispositions need renewed review"
            } else {
                "The client brief or decision criteria changed"
            },
        );
        if !r["draft"].is_null() {
            let symbols: Vec<String> = r["sources"]
                .as_object()
                .unwrap()
                .keys()
                .filter_map(|k| k.strip_prefix("sec:").map(str::to_string))
                .collect();
            r["contextPacket"] = evidence::packet(
                &r,
                r["mandate"]["question"].as_str().unwrap(),
                &symbols,
                24000,
            )?;
        }
        r["changeLog"].as_array_mut().unwrap().push(json!({"revision":b.expected_revision+1,"type":if funding_changed{"funding_requirement_amended"}else{"brief_amended"},"affectedPages":affected,"narrativeReviewRequired":true,"rationale":"Client brief amended. Changing required net cash does not automatically resize the transaction.","at":now()}));
        workflow::commit(&s, r, b.expected_revision, "brief_amended")
    })();
    if let Some(run) = pending_run {
        finish(&s, &run, &outcome)?;
    }
    Ok(Json(outcome?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct TaskEdit {
    expected_revision: i64,
    task_id: String,
    owner: String,
    acceptance: String,
    status: String,
    note: String,
}
pub async fn task(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<TaskEdit>,
) -> ApiResult {
    let mut r = current(&s, &id, b.expected_revision)?;
    text(&b.owner, 2, 100, "Task owner")?;
    text(&b.acceptance, 10, 1500, "Acceptance criterion")?;
    text(&b.note, 10, 1500, "Task update rationale")?;
    if !["planned", "ready", "blocked", "complete", "deferred"].contains(&b.status.as_str()) {
        return Err(bad("Choose a supported task state"));
    }
    let tasks = r["workItems"].as_array().unwrap();
    let w = tasks
        .iter()
        .find(|w| w["id"] == b.task_id)
        .ok_or_else(|| bad("Task not found"))?;
    if b.task_id == "commercial" && b.status != "blocked" {
        return Err(bad(
            "Current-market and execution checks remain blocked in this public-archive phase",
        ));
    }
    if ["evidence", "alternatives", "materials"].contains(&b.task_id.as_str())
        && b.status == "complete"
        && r["draft"].is_null()
    {
        return Err(bad(
            "The financial workflow must actually execute before preparation is complete",
        ));
    }
    if b.status == "complete" {
        for dep in w["dependsOn"].as_array().unwrap() {
            let status = tasks.iter().find(|t| t["id"] == *dep).unwrap()["status"]
                .as_str()
                .unwrap();
            if status != "complete" {
                return Err(bad("Complete prerequisite tasks first"));
            }
        }
    }
    if b.task_id == "review" && b.status == "complete" {
        return Err(bad(
            "Complete review by creating an exact reviewed discussion copy",
        ));
    }
    for w in r["workItems"].as_array_mut().unwrap() {
        if w["id"] == b.task_id {
            w["owner"] = json!(b.owner.trim());
            w["acceptance"] = json!(b.acceptance.trim());
            w["status"] = json!(b.status);
            w["updateNote"] = json!(b.note.trim());
            w["updatedAt"] = json!(now());
        }
    }
    Ok(Json(workflow::commit(
        &s,
        r,
        b.expected_revision,
        "work_item_updated",
    )?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ReviewEdit {
    expected_revision: i64,
    op: String,
    issue_id: Option<String>,
    page_id: Option<String>,
    body: Option<String>,
    owner: Option<String>,
    category: Option<String>,
    resolution: Option<String>,
    change_revision: Option<i64>,
}
pub async fn review(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<ReviewEdit>,
) -> ApiResult {
    let mut r = current(&s, &id, b.expected_revision)?;
    if r["draft"].is_null() {
        return Err(bad("Prepare materials before page review"));
    }
    match b.op.as_str() {
        "add" => {
            let body = b.body.as_deref().unwrap_or("");
            let owner = b.owner.as_deref().unwrap_or("");
            let page = b.page_id.as_deref().unwrap_or("decision");
            let category = b.category.as_deref().unwrap_or("question");
            text(body, 5, 2000, "Review issue")?;
            text(owner, 2, 100, "Issue owner")?;
            if !["question", "financial", "source", "story", "design"].contains(&category) {
                return Err(bad("Choose a review category"));
            }
            if !r["draft"]["slides"]
                .as_array()
                .unwrap()
                .iter()
                .any(|p| p["id"] == page)
            {
                return Err(bad("Choose a page in this document"));
            }
            r["reviewIssues"].as_array_mut().unwrap().push(json!({"id":new_id(),"pageId":page,"category":category,"body":body.trim(),"owner":owner.trim(),"capturedRevision":b.expected_revision,"status":"open","createdAt":now()}));
        }
        "link_change" | "verify" | "defer" => {
            let issue = b
                .issue_id
                .as_deref()
                .ok_or_else(|| bad("Select a saved issue"))?;
            let selected = r["reviewIssues"]
                .as_array()
                .unwrap()
                .iter()
                .find(|x| x["id"] == issue)
                .ok_or_else(|| bad("Issue not found"))?
                .clone();
            let resolution = b.resolution.as_deref().unwrap_or("");
            text(resolution, 20, 2000, "Verification or deferral explanation")?;
            if selected["status"] == "verified" {
                return Err(bad(
                    "This issue is already verified; record a new issue if needed",
                ));
            }
            if b.op == "link_change" {
                let rev = b
                    .change_revision
                    .ok_or_else(|| bad("Choose the revision containing the correction"))?;
                let change = r["changeLog"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .find(|c| {
                        c["revision"] == rev
                            && c["affectedPages"]
                                .as_array()
                                .is_some_and(|p| p.contains(&selected["pageId"]))
                    })
                    .ok_or_else(|| {
                        bad("No recorded change to this page exists at that revision")
                    })?;
                if rev <= selected["capturedRevision"].as_i64().unwrap()
                    || rev < selected["reopenedAtRevision"].as_i64().unwrap_or(0)
                {
                    return Err(bad(
                        "The correction must follow the issue and cannot predate its latest reopening",
                    ));
                }
                if selected["category"] == "financial" && change["newAnalysisId"].is_null() {
                    return Err(bad(
                        "A financial correction must link to a recalculated scenario, not a cosmetic edit",
                    ));
                }
            }
            if b.op == "verify" {
                let reviewer = b.owner.as_deref().unwrap_or("");
                text(reviewer, 2, 100, "Verifier name")?;
            }
            for i in r["reviewIssues"].as_array_mut().unwrap() {
                if i["id"] == issue {
                    i["status"] = json!(match b.op.as_str() {
                        "link_change" => "applied",
                        "verify" => "verified",
                        _ => "deferred",
                    });
                    i["resolution"] = json!(resolution.trim());
                    i["updatedAt"] = json!(now());
                    if b.op == "link_change" {
                        i["appliedRevision"] = json!(b.change_revision);
                    }
                    if b.op == "verify" {
                        i["verifiedBy"] = json!(b.owner);
                        i["verifiedRevision"] = json!(b.expected_revision);
                        i["verificationBasis"] = json!(
                            "Manual assertion; reviewer identity/qualification not verified by this single-user prototype"
                        );
                    }
                }
            }
        }
        _ => return Err(bad("Unsupported review operation")),
    }
    Ok(Json(workflow::commit(
        &s,
        r,
        b.expected_revision,
        "review_issue_updated",
    )?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Freeze {
    expected_revision: i64,
    label: String,
    reviewer: String,
    calculations_checked: bool,
    sources_and_dates_checked: bool,
    narrative_reviewed: bool,
}
pub async fn freeze(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Freeze>,
) -> ApiResult {
    let mut r = current(&s, &id, b.expected_revision)?;
    sync_client_document(&mut r)?;
    let document: materials::Draft = serde_json::from_value(r["draft"].clone())
        .map_err(|_| bad("Prepare client materials before freezing"))?;
    materials::validate_draft(&document, &r).map_err(bad)?;
    for item in r["workItems"].as_array().unwrap() {
        let key = item["id"].as_str().unwrap_or("");
        let state = item["status"].as_str().unwrap_or("");
        if ["brief", "evidence", "alternatives", "materials"].contains(&key) && state != "complete"
        {
            return Err(bad(format!(
                "Complete the required local task ‘{}’ before freezing a reviewed discussion copy. The external commercial gate remains separate.",
                item["title"].as_str().unwrap()
            )));
        }
        if key == "review" && !["ready", "complete"].contains(&state) {
            return Err(bad(
                "Resolve the blocked or deferred local review task before freezing",
            ));
        }
    }
    text(&b.label, 4, 120, "Copy name")?;
    text(&b.reviewer, 2, 100, "Reviewer")?;
    if r["draft"].is_null()
        || !["conditional_view", "insufficient_evidence"]
            .contains(&r["mandate"]["decisionState"].as_str().unwrap_or(""))
    {
        return Err(bad(
            "Record or re-review the conditional banker view before freezing",
        ));
    }
    if !b.calculations_checked || !b.sources_and_dates_checked || !b.narrative_reviewed {
        return Err(bad("Record all three review declarations"));
    }
    if r["reviewIssues"]
        .as_array()
        .unwrap()
        .iter()
        .any(|i| i["status"] == "open" || i["status"] == "applied")
    {
        return Err(bad(
            "Verify applied changes and resolve or explicitly defer open issues first",
        ));
    }
    let copy_id = new_id();
    let meta = json!({"id":copy_id,"label":b.label.trim(),"reviewer":b.reviewer.trim(),"revision":b.expected_revision+1,"createdAt":now(),"renderContract":"client-decision/2","rendererVersion":"client-renderer/2","scope":"Public-data discussion rehearsal only; current-market and execution gate remains blocked","provenance":"Self-attested review. Identity, qualification and independence are not verified by this prototype."});
    r["reviewState"] = meta.clone();
    r["reviewCopyOutOfDate"] = json!(false);
    for c in r["changeLog"].as_array_mut().unwrap() {
        c["narrativeReviewRequired"] = json!(false);
    }
    for t in r["workItems"].as_array_mut().unwrap() {
        if t["id"] == "review" {
            t["status"] = json!("complete");
            t["reviewCopyId"] = json!(copy_id);
        }
    }
    let mut r = workflow::revised(r, b.expected_revision, "discussion_copy_frozen");
    let snapshot = r["history"].as_array().unwrap().last().unwrap().clone();
    workflow::compact_history(&mut r);
    let payload = json!({"reviewCopy":meta,"workroom":r});
    let mut db = s.db.lock().unwrap();
    let tx = db.transaction().map_err(internal)?;
    let n = tx
        .execute(
            "UPDATE agent_rooms SET revision=?,title=?,payload=? WHERE id=? AND revision=?",
            params![
                b.expected_revision + 1,
                r["title"].as_str(),
                r.to_string(),
                id,
                b.expected_revision
            ],
        )
        .map_err(internal)?;
    if n != 1 {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "Workroom changed. Reload before freezing.".into(),
        ));
    }
    tx.execute(
        "INSERT INTO client_review_copies VALUES(?,?,?,?,?)",
        params![
            copy_id,
            id,
            b.expected_revision + 1,
            payload.to_string(),
            now()
        ],
    )
    .map_err(internal)?;
    tx.execute(
        "INSERT INTO client_revisions VALUES(?,?,?)",
        params![id, b.expected_revision + 1, snapshot.to_string()],
    )
    .map_err(internal)?;
    tx.commit().map_err(internal)?;
    Ok(Json(r))
}
#[derive(Deserialize, Default)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct PageQuery {
    pub before: Option<i64>,
    pub max_id: Option<i64>,
    pub limit: Option<usize>,
}
impl PageQuery {
    pub fn limit(&self) -> Result<usize, ApiError> {
        let n = self.limit.unwrap_or(25);
        if !(1..=100).contains(&n)
            || self.before.is_some_and(|v| v <= 0)
            || self.max_id.is_some_and(|v| v < 0)
        {
            return Err(bad("Use a positive cursor and a page size of 1–100"));
        }
        Ok(n)
    }
}
pub async fn copies(
    State(s): State<App>,
    Path(id): Path<String>,
    Query(page): Query<PageQuery>,
) -> ApiResult {
    agent::load(&s, &id)?;
    let limit = page.limit()?;
    let db = s.db.lock().unwrap();
    let latest: i64 = db
        .query_row(
            "SELECT COALESCE(MAX(rowid),0) FROM client_review_copies WHERE room_id=?",
            [&id],
            |r| r.get(0),
        )
        .map_err(internal)?;
    let ceiling = page.max_id.unwrap_or(latest).min(latest);
    let total: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM client_review_copies WHERE room_id=? AND rowid<=?",
            params![id, ceiling],
            |r| r.get(0),
        )
        .map_err(internal)?;
    let mut q=db.prepare("SELECT rowid,id,revision,created_at,json_extract(payload,'$.reviewCopy.label'),json_extract(payload,'$.reviewCopy.reviewer') FROM client_review_copies WHERE room_id=?1 AND rowid<=?2 AND (?3 IS NULL OR rowid<?3) ORDER BY rowid DESC LIMIT ?4").map_err(internal)?;
    let mut rows=q.query_map(params![id,ceiling,page.before,(limit+1) as i64],|r|Ok((r.get::<_,i64>(0)?,json!({"id":r.get::<_,String>(1)?,"revision":r.get::<_,i64>(2)?,"createdAt":r.get::<_,String>(3)?,"label":r.get::<_,String>(4)?,"reviewer":r.get::<_,String>(5)?})))).map_err(internal)?.collect::<Result<Vec<_>,_>>().map_err(internal)?;
    let more = rows.len() > limit;
    rows.truncate(limit);
    let next = if more { rows.last().map(|r| r.0) } else { None };
    Ok(Json(
        json!({"copies":rows.into_iter().map(|r|r.1).collect::<Vec<_>>(),"nextCursor":next,"maxId":ceiling,"totalStored":total}),
    ))
}
pub async fn copy(State(s): State<App>, Path((id, cid)): Path<(String, String)>) -> ApiResult {
    let payload: String =
        s.db.lock()
            .unwrap()
            .query_row(
                "SELECT payload FROM client_review_copies WHERE room_id=? AND id=?",
                params![id, cid],
                |r| r.get(0),
            )
            .map_err(|_| bad("Review copy not found in this workroom"))?;
    Ok(Json(parse(payload)))
}

pub async fn history(State(s): State<App>, Path((id, revision)): Path<(String, i64)>) -> ApiResult {
    let payload: String =
        s.db.lock()
            .unwrap()
            .query_row(
                "SELECT payload FROM client_revisions WHERE room_id=? AND revision=?",
                params![id, revision],
                |r| r.get(0),
            )
            .map_err(|_| bad("Archived revision not found in this workroom"))?;
    Ok(Json(parse(payload)))
}
