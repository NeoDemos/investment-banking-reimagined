//! Workflow state and local blueprints. The model port is explicitly deferred.
use super::*;
use serde::Deserialize;
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Preview {
    kind: String,
    issuer: String,
    target: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Brief {
    room_id: Option<String>,
    expected_revision: Option<i64>,
    prompt: String,
}
fn empty(title: &str) -> Value {
    json!({"id":new_id(),"title":title,"revision":0,"messages":[],"sources":{},"analyses":{},"draft":null,"scene":null,"contextPacket":null,"history":[],"phase":"architecture"})
}
fn insert(s: &App, r: &Value) -> Result<(), ApiError> {
    s.db.lock()
        .unwrap()
        .execute(
            "INSERT INTO agent_rooms VALUES(?,?,?,?,?)",
            params![
                r["id"].as_str(),
                r["title"].as_str(),
                r["revision"].as_i64(),
                r.to_string(),
                now()
            ],
        )
        .map_err(internal)?;
    Ok(())
}
pub(crate) fn commit(s: &App, mut r: Value, expected: i64, kind: &str) -> Result<Value, ApiError> {
    r["revision"] = json!(expected + 1);
    let snap = json!({"revision":expected+1,"draft":r["draft"],"scene":r["scene"],"sources":r["sources"],"analyses":r["analyses"],"contextPacket":r["contextPacket"],"at":now(),"type":kind});
    r["history"].as_array_mut().unwrap().push(snap);
    let n =
        s.db.lock()
            .unwrap()
            .execute(
                "UPDATE agent_rooms SET revision=?,title=?,payload=? WHERE id=? AND revision=?",
                params![
                    expected + 1,
                    r["title"].as_str(),
                    r.to_string(),
                    r["id"].as_str(),
                    expected
                ],
            )
            .map_err(internal)?;
    if n != 1 {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "Workroom changed. Reload before saving.".into(),
        ));
    }
    Ok(r)
}
pub async fn capture(State(s): State<App>, Json(b): Json<Brief>) -> ApiResult {
    let text = b.prompt.trim();
    if text.is_empty() || text.len() > 8000 {
        return Err(bad("Brief must contain 1–8000 characters"));
    }
    let mut r = if let Some(id) = b.room_id.as_deref() {
        let r = agent::load(&s, id)?;
        if b.expected_revision != r["revision"].as_i64() {
            return Err(ApiError(
                StatusCode::CONFLICT,
                "Workroom changed. Reload before adding the brief.".into(),
            ));
        }
        r
    } else {
        let r = empty(&text.chars().take(72).collect::<String>());
        insert(&s, &r)?;
        r
    };
    let rev = r["revision"].as_i64().unwrap();
    r["messages"]
        .as_array_mut()
        .unwrap()
        .push(json!({"role":"banker","text":text,"at":now()}));
    r["messages"].as_array_mut().unwrap().push(json!({"role":"system","text":"Brief saved for the next model-enabled phase. No interpretation or generated draft is claimed. The local workflow blueprints exercise the MCP, evidence, financial and slide architecture now.","at":now()}));
    r["modelPort"] = json!({"state":"deferred","pendingInstruction":text,"requiredCapabilities":["structured tool decisions","clarification","narrative drafting","scoped document patches"]});
    Ok(Json(commit(&s, r, rev, "brief_capture")?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Patch {
    expected_revision: i64,
    operations: Vec<materials::Operation>,
}
pub async fn patch(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Patch>,
) -> ApiResult {
    let mut room = agent::load(&s, &id)?;
    if room["revision"] != b.expected_revision {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "Draft changed. Reload before applying the edit.".into(),
        ));
    }
    let mut d: materials::Draft =
        serde_json::from_value(room["draft"].clone()).map_err(|_| bad("No material draft yet"))?;
    materials::patch(&mut d, b.operations)?;
    room["scene"] = materials::compile(&d, &room)?;
    room["draft"] = json!(d);
    Ok(Json(commit(
        &s,
        room,
        b.expected_revision,
        "document_patch",
    )?))
}
fn text(t: &str) -> Value {
    json!({"type":"text","text":t})
}
fn linked(t: &str) -> Value {
    json!({"type":t,"analysisId":"base_case"})
}
fn page(id: &str, title: &str, layout: &str, blocks: Vec<Value>) -> Value {
    json!({"id":id,"title":title,"layout":layout,"blocks":blocks})
}
fn storyboard(kind: &str, issuer: &str, target: &str) -> Value {
    let name = connectors::CATALOG
        .iter()
        .find(|c| c.0 == issuer)
        .unwrap()
        .2;
    let target_name = connectors::CATALOG
        .iter()
        .find(|c| c.0 == target)
        .map(|c| c.2)
        .unwrap_or("");
    let mut slides = vec![page(
        "decision",
        match kind {
            "bond" => "Frame the financing decision",
            "buyback" => "Evaluate returning capital to shareholders",
            _ => "Frame the hypothetical acquisition",
        },
        "split",
        vec![
            text(match kind {
                "bond" => {
                    "Assess financing flexibility, cash cost and sensitivity before selecting an issuance structure."
                }
                "buyback" => {
                    "Consider the trade-off between distributing cash, earnings per share and retained financial flexibility."
                }
                _ => {
                    "Test consideration, funding and leverage before developing the strategic investment case."
                }
            }),
            linked("metrics"),
        ],
    )];
    match kind {
        "bond" => {
            slides.push(page(
                "evidence",
                "Ground the discussion in reported financials and rates",
                "split",
                vec![json!({"type":"facts","symbol":issuer}), linked("chart")],
            ));
            slides.push(page(
                "economics",
                "Separate transaction terms from observed data",
                "split",
                vec![linked("assumptions"), linked("workings")],
            ));
            slides.push(page("downside","Test the sensitivity of issue economics","split",vec![text("A Treasury par-yield reference plus an assumed spread supports an indicative discussion. Confirm issuer spread, execution window, funding needs and credit capacity before proceeding."),linked("sensitivity")]));
        }
        "buyback" => {
            slides.push(page(
                "financial-context",
                "Assess the starting balance sheet and share base",
                "split",
                vec![json!({"type":"facts","symbol":issuer}), linked("chart")],
            ));
            slides.push(page(
                "repurchase-scenarios",
                "Test the execution-price assumptions",
                "split",
                vec![linked("assumptions"), linked("sensitivity")],
            ));
        }
        _ => {
            slides.push(page(
                "companies",
                &format!("Review {name} and {target_name}"),
                "split",
                vec![
                    json!({"type":"facts","symbol":issuer}),
                    json!({"type":"facts","symbol":target}),
                ],
            ));
            slides.push(page(
                "funding",
                "Distinguish reported accounts from proposed terms",
                "split",
                vec![linked("assumptions"), linked("chart")],
            ));
            slides.push(page(
                "consideration",
                "Inspect purchase economics and financing",
                "full",
                vec![linked("workings")],
            ));
            slides.push(page("downside","Challenge the acquisition premium and synergy case","split",vec![text("The exercise does not calendarize annual accounts and excludes purchase accounting, transaction costs and integration timing. Historical diluted shares are not assumed target deal shares."),linked("sensitivity")]));
            slides.push(page("judgement","Define the outstanding investment questions","full",vec![text("Assess strategic fit, the quality of earnings, execution feasibility, diligence findings and downside resilience. Financial scenario outputs support banker judgement; they do not establish fair value or a recommended transaction.")]));
        }
    }
    slides.push(page(
        "sources",
        "Evidence, assumptions and review requirements",
        "full",
        vec![json!({"type":"sources"})],
    ));
    json!({"title":format!("{name} — {}",match kind{"bond"=>"Financing discussion","buyback"=>"Capital returns review",_=>"Hypothetical acquisition"}),"slides":slides})
}
pub async fn preview(State(s): State<App>, Json(b): Json<Preview>) -> ApiResult {
    if !["bond", "buyback", "acquisition"].contains(&b.kind.as_str())
        || !connectors::CATALOG.iter().any(|c| c.0 == b.issuer)
    {
        return Err(bad("Choose a supported local workflow and entity"));
    }
    let target = b.target.as_deref().unwrap_or("CPB");
    if b.kind == "acquisition"
        && (target == b.issuer || !connectors::CATALOG.iter().any(|c| c.0 == target))
    {
        return Err(bad("Choose a distinct covered target"));
    }
    let _gate = s
        .agent_gate
        .clone()
        .try_acquire_owned()
        .map_err(|_| bad("Another local workflow is running"))?;
    let mut room = empty("Local financial workflow");
    room["executionMode"] = json!("local_blueprint");
    room["messages"] = json!([{"role":"banker","text":format!("Explore the {} workflow for {} using the frozen public archive.",b.kind,b.issuer),"at":now()},{"role":"system","text":"Local blueprint preview — no model or external API is connected. This run executes the actual MCP tools, builds a bounded evidence context, calculates in Rust and compiles a versioned dynamic document. Narrative and illustrative assumptions come from an explicit blueprint.","at":now()}]);
    insert(&s, &room)?;
    let rid = room["id"].as_str().unwrap().to_string();
    let run = new_id();
    s.db.lock()
        .unwrap()
        .execute(
            "INSERT INTO agent_runs VALUES(?,?,'running','{}',?)",
            params![run, rid, now()],
        )
        .map_err(internal)?;
    room["lastRunId"] = json!(run);
    let outcome=async{
  let session=mcp::Session::new(s.clone(),room,false).await?;agent::event(&s,&run,"started",json!({"mode":"local_blueprint","network":"disabled","model":"deferred"}))?;agent::event(&s,&run,"mcp_discovery",json!({"tools":session.tools().await?,"transport":"in-process JSON-RPC","sdk":"rmcp 3.7.0"}))?;
  let mut calls=vec![("company_catalog",json!({})),("fetch_company_facts",json!({"symbol":b.issuer}))];let mut symbols=vec![b.issuer.clone()];if b.kind=="acquisition"{calls.push(("fetch_company_facts",json!({"symbol":target})));symbols.push(target.to_string());}
  calls.push(("fetch_treasury_curve",json!({})));calls.push(("search_evidence",json!({"query":"revenue cash debt operatingIncome","symbol":b.issuer})));
  calls.push(("calculate_finance",json!({"analysisId":"base_case","kind":b.kind,"issuer":b.issuer,"target":if b.kind=="acquisition"{Some(target)}else{None},"params":finance::defaults(&b.kind),"rationale":"Explicit local-blueprint assumptions for an illustrative public-company scenario. Stock prices, credit spreads, issue terms, target deal shares, tax, synergies and financing percentages are not retrieved market facts. All terms are shown for banker review."})));
  calls.push(("build_context",json!({"task":format!("Prepare the {} client discussion with traceable financial evidence and illustrative terms.",b.kind),"symbols":symbols,"maxChars":24000})));
  calls.push(("compose_materials",storyboard(&b.kind,&b.issuer,target)));
  for(name,args)in calls{agent::event(&s,&run,"tool_call",json!({"tool":name,"arguments":args,"protocol":"MCP tools/call"}))?;let v=session.call(name,args).await?;agent::event(&s,&run,"tool_result",json!({"tool":name,"result":v,"protocol":"MCP structuredContent"}))?;}
  let mut r=session.server.snapshot().await;r["modelPort"]=json!({"state":"deferred"});r["workflow"]=json!({"definition":b.kind,"version":"local-blueprint/1","stages":[{"id":"discover","label":"Discover tools and sources","state":"complete"},{"id":"evidence","label":"Select canonical evidence","state":"complete"},{"id":"analyze","label":"Calculate financial scenario","state":"complete"},{"id":"context","label":"Assemble bounded context","state":"complete"},{"id":"compose","label":"Compile branded materials","state":"complete"},{"id":"review","label":"Banker review","state":"ready"},{"id":"model","label":"Model integration","state":"deferred"}]});let r=commit(&s,r,0,"local_blueprint")?;s.db.lock().unwrap().execute("UPDATE agent_runs SET status='completed',payload=? WHERE id=?",params![json!({"roomId":rid,"mode":"local_blueprint","message":"Local workflow complete. No model inference or external connection used."}).to_string(),run]).map_err(internal)?;Ok::<Value,ApiError>(r)
 }.await;
    match outcome {
        Ok(r) => Ok(Json(r)),
        Err(e) => {
            s.db.lock()
                .unwrap()
                .execute(
                    "UPDATE agent_runs SET status='failed',payload=? WHERE id=?",
                    params![json!({"error":e.1}).to_string(), run],
                )
                .map_err(internal)?;
            Err(e)
        }
    }
}
