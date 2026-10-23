//! Local login connectors. Never read credential files or persist secrets.
use super::*;
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Settings {
    pub model_profile: String,
    pub source_ids: Vec<String>,
}
pub fn sources() -> Value {
    json!([
     {"id":"sec","name":"SEC EDGAR company facts","description":"Live public XBRL connector; retains a dated pool version on network refusal."},
     {"id":"issuer_reports","name":"Issuer annual reports","description":"Live Apple 2025 annual-report HTML mapping; additional document mappings must be reviewed."},
     {"id":"treasury","name":"U.S. Treasury yields","description":"Live daily USD par-yield curve."},
     {"id":"bund","name":"Bundesbank German yields","description":"Live 2/5/10-year German Federal reference securities; separate EUR context."},
     {"id":"sector","name":"NYU Stern industry multiples","description":"Public, dated US sector lookup; valuation context, not current company quotes."},
     {"id":"credit","name":"Issuer credit disclosures","description":"Dated public issuance terms and ratings; current secondary spreads remain a separate evidence requirement."},
     {"id":"equity","name":"Delayed equity market data","description":"Public Cboe delayed price observations. Local prototype only; current access and reuse rights remain explicit."},
     {"id":"bank","name":"Rabobank public proposition","description":"Public bank capability references; no private credentials or mandate claims."}
    ])
}
pub fn load(s: &App) -> Settings {
    let db = s.db.lock().unwrap();
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS director_settings(id INTEGER PRIMARY KEY,payload TEXT);",
    )
    .unwrap();
    let raw: Option<String> = db
        .query_row(
            "SELECT payload FROM director_settings WHERE id=1",
            [],
            |r| r.get(0),
        )
        .ok();
    let mut c = raw
        .and_then(|r| serde_json::from_str::<Settings>(&r).ok())
        .unwrap_or(Settings {
            model_profile: "codex_high".into(),
            source_ids: vec![
                "sec".into(),
                "issuer_reports".into(),
                "treasury".into(),
                "bund".into(),
                "sector".into(),
                "bank".into(),
                "credit".into(),
                "equity".into(),
            ],
        });
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS director_source_schema(version INTEGER PRIMARY KEY);",
    )
    .unwrap();
    let migrated: bool = db
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM director_source_schema WHERE version=2)",
            [],
            |r| r.get(0),
        )
        .unwrap();
    if !migrated {
        if c.source_ids.len() == 6
            && [
                "sec",
                "issuer_reports",
                "treasury",
                "bund",
                "sector",
                "bank",
            ]
            .iter()
            .all(|id| c.source_ids.iter().any(|v| v == id))
        {
            c.source_ids
                .extend(["credit".to_string(), "equity".to_string()]);
            db.execute(
                "INSERT OR REPLACE INTO director_settings VALUES(1,?)",
                [serde_json::to_string(&c).unwrap()],
            )
            .unwrap();
        }
        db.execute("INSERT OR IGNORE INTO director_source_schema VALUES(2)", [])
            .unwrap();
    }
    c
}
pub fn validate(c: &Settings) -> Result<(), ApiError> {
    if !["codex_high", "claude_opus_medium"].contains(&c.model_profile.as_str()) {
        return Err(bad("Choose Codex 6.1 Sol High or Claude Code Opus Medium"));
    }
    let ids = sources()
        .as_array()
        .unwrap()
        .iter()
        .map(|x| x["id"].as_str().unwrap().to_string())
        .collect::<Vec<_>>();
    if c.source_ids.len() > ids.len() || c.source_ids.iter().any(|x| !ids.contains(x)) {
        return Err(bad("Unknown public source selection"));
    }
    Ok(())
}
pub async fn save(State(s): State<App>, Json(c): Json<Settings>) -> ApiResult {
    validate(&c)?;
    load(&s);
    s.db.lock()
        .unwrap()
        .execute(
            "INSERT OR REPLACE INTO director_settings VALUES(1,?)",
            [serde_json::to_string(&c).unwrap()],
        )
        .map_err(internal)?;
    Ok(Json(json!(c)))
}
pub async fn status(State(s): State<App>) -> ApiResult {
    let check = |exe: String, args: Vec<&'static str>| async move {
        let result = tokio::time::timeout(
            Duration::from_secs(8),
            tokio::process::Command::new(exe).args(args).output(),
        )
        .await;
        matches!(result,Ok(Ok(ref o)) if o.status.success())
    };
    let (codex, claude) = tokio::join!(
        check(
            std::env::var("CODEX_BIN").unwrap_or("codex".into()),
            vec!["login", "status"]
        ),
        check(
            std::env::var("CLAUDE_BIN").unwrap_or("claude".into()),
            vec!["auth", "status"]
        )
    );
    Ok(Json(
        json!({"installed":codex,"enabled":director::enabled(),"model":"gpt-6.1-sol","settings":load(&s),"sources":sources(),"profiles":[{"id":"codex_high","name":"Codex 6.1 Sol · High","provider":"codex_local","model":"gpt-6.1-sol","effort":"high","authenticated":codex},{"id":"claude_opus_medium","name":"Claude Code Opus · Medium","provider":"claude_local","model":"opus","effort":"medium","authenticated":claude}],"authentication":"Local CLI login connectors. Credentials remain owned by Codex/Claude Code; quota and model access are verified on each actual run."}),
    ))
}
pub fn profile(c: &Settings) -> Value {
    if c.model_profile == "claude_opus_medium" {
        json!({"id":c.model_profile,"provider":"claude_local","model":"opus","effort":"medium"})
    } else {
        json!({"id":c.model_profile,"provider":"codex_local","model":"gpt-6.1-sol","effort":"high"})
    }
}
pub async fn infer(
    s: &App,
    run: &str,
    c: &Settings,
    context: Value,
    schema: Value,
    instructions: &str,
) -> Result<Value, ApiError> {
    let dir = std::env::temp_dir().join(format!("banking-director-{}", new_id()));
    std::fs::create_dir_all(&dir).map_err(internal)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700)).map_err(internal)?;
    }
    let schema_path = dir.join("schema.json");
    std::fs::write(&schema_path, schema.to_string()).map_err(internal)?;
    let claude = c.model_profile == "claude_opus_medium";
    let mut cmd = tokio::process::Command::new(if claude {
        std::env::var("CLAUDE_BIN").unwrap_or("claude".into())
    } else {
        std::env::var("CODEX_BIN").unwrap_or("codex".into())
    });
    if claude {
        cmd.args([
            "--safe-mode",
            "-p",
            "--tools",
            "",
            "--strict-mcp-config",
            "--mcp-config",
            "{\"mcpServers\":{}}",
            "--setting-sources",
            "",
            "--settings",
            "{\"disableAllHooks\":true}",
            "--disable-slash-commands",
            "--no-session-persistence",
            "--output-format",
            "json",
            "--model",
            "opus",
            "--effort",
            "medium",
            "--max-turns",
            "3",
            "--json-schema",
        ])
        .arg(schema.to_string());
    } else {
        cmd.args([
            "exec",
            "--ignore-user-config",
            "--ephemeral",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "--model",
            "gpt-6.1-sol",
            "-c",
            "features.shell_tool=false",
            "-c",
            "web_search=\"disabled\"",
            "-c",
            "model_reasoning_effort=\"high\"",
            "--output-schema",
        ])
        .arg(&schema_path)
        .arg("-");
    }
    cmd.current_dir(&dir)
        .env_remove("OPENAI_API_KEY")
        .env_remove("CODEX_API_KEY")
        .env_remove("ANTHROPIC_API_KEY")
        .env_remove("CLAUDECODE")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true);
    agent::event(
        s,
        run,
        "model_started",
        json!({"connection":profile(c),"at":now()}),
    )?;
    let result=async {
  let mut child=cmd.spawn().map_err(|_|bad("Could not start the selected local model connector. Check its installation and local login."))?;let mut input=child.stdin.take().unwrap();input.write_all(format!("{instructions}\n\n{context}").as_bytes()).await.map_err(internal)?;drop(input);
  let wait=child.wait_with_output();tokio::pin!(wait);let limit=tokio::time::sleep(Duration::from_secs(600));tokio::pin!(limit);let mut tick=tokio::time::interval(Duration::from_secs(5));
  let output=loop{tokio::select!{out=&mut wait=>break out.map_err(internal)?,_=&mut limit=>return Err(bad("The model exceeded its ten-minute stage limit. This run stopped; saved financial work remains inspectable.")),_ = tick.tick()=>{let db=s.db.lock().unwrap();let state:String=db.query_row("SELECT status FROM agent_runs WHERE id=?",[run],|r|r.get(0)).map_err(internal)?;if state!="running"{return Err(bad("Assignment cancelled; previous saved work retained"));}db.execute("UPDATE agent_runs SET payload=json_set(payload,'$.heartbeatAt',?,'$.modelProfile',?) WHERE id=?",params![now(),c.model_profile,run]).map_err(internal)?;}}};
  let envelope:Value=serde_json::from_slice(&output.stdout).map_err(|_|bad("Selected model returned no structured output. Check local login, quota or connection availability."))?;
  if envelope["api_error"]=="usage_limit_reached" || (envelope["is_error"]==true && envelope["result"].as_str().unwrap_or("").to_lowercase().contains("limit")) {return Err(bad("Claude Code is signed in but its subscription usage limit has been reached. Choose Codex High or retry after the account limit resets. Previous saved work is preserved."));}
  if !output.status.success() || envelope["is_error"]==true {return Err(bad("The selected local model refused or failed this request (login, quota or model access). No generated presentation was claimed. Try the other connected profile."));}
  let answer=if claude {envelope.get("structured_output").cloned().or_else(||envelope["result"].as_str().and_then(|x|serde_json::from_str(x).ok())).ok_or_else(||bad("Claude returned no schema-validated answer"))?}else{envelope};
  agent::event(s,run,"model_completed",json!({"connection":profile(c),"at":now()}))?;Ok(answer)
 }.await;
    let _ = std::fs::remove_dir_all(dir);
    result
}
