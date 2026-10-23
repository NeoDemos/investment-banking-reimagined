//! Real MCP client/server boundary using the official SDK, in-process and stdio.
use super::*;
use rmcp::{
    ErrorData as McpError, RoleClient, RoleServer, ServerHandler, ServiceExt,
    model::*,
    service::{RequestContext, RunningService},
};
use serde::Deserialize;
#[derive(Clone)]
pub struct BankingServer {
    app: App,
    stage: Arc<tokio::sync::Mutex<Value>>,
    live: bool,
    allow_cached: bool,
    providers: Arc<providers::Registry>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Company {
    symbol: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Search {
    query: String,
    symbol: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Context {
    task: String,
    symbols: Vec<String>,
    max_chars: usize,
}
pub fn catalog() -> Vec<Tool> {
    let mut v = vec![];
    let empty = json!({"type":"object","properties":{},"additionalProperties":false});
    for t in agent::tools().as_array().unwrap() {
        let name = t["name"].as_str().unwrap();
        let schema = match name {
            "fetch_company_facts" => {
                json!({"type":"object","properties":{"symbol":{"type":"string","enum":["PEP","CPB","GIS"]}},"required":["symbol"],"additionalProperties":false})
            }
            "calculate_finance" => {
                json!({"type":"object","properties":{"analysisId":{"type":"string","minLength":1,"maxLength":64},"kind":{"type":"string","enum":["bond","buyback","acquisition"]},"issuer":{"type":"string","enum":["PEP","CPB","GIS"]},"target":{"type":["string","null"]},"params":{"type":"object","additionalProperties":{"type":"number"}},"rationale":{"type":"string","minLength":20,"maxLength":2500}},"required":["analysisId","kind","issuer","target","params","rationale"],"additionalProperties":false})
            }
            "compose_materials" => {
                json!({"type":"object","properties":{"title":{"type":"string"},"slides":{"type":"array","minItems":2,"maxItems":12,"items":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"layout":{"type":"string","enum":["cover","split","full","grid"]},"blocks":{"type":"array","minItems":1,"maxItems":4,"items":{"type":"object","properties":{"type":{"type":"string","enum":["text","metrics","chart","workings","sensitivity","facts","assumptions","sources"]},"text":{"type":["string","null"]},"analysisId":{"type":["string","null"]},"symbol":{"type":["string","null"]}},"required":["type"],"additionalProperties":false}}},"required":["id","title","layout","blocks"],"additionalProperties":false}}},"required":["title","slides"],"additionalProperties":false})
            }
            "ask_banker" => {
                json!({"type":"object","properties":{"question":{"type":"string","minLength":1,"maxLength":2000}},"required":["question"],"additionalProperties":false})
            }
            _ => empty.clone(),
        };
        let write = ["calculate_finance", "compose_materials", "ask_banker"].contains(&name);
        let mut tool = Tool::new(
            name.to_string(),
            t["description"].as_str().unwrap().to_string(),
            schema.as_object().unwrap().clone(),
        )
        .with_annotations(
            ToolAnnotations::new()
                .read_only(!write)
                .destructive(false)
                .open_world(false),
        );
        tool.meta=Some(MetaObject(json!({"banking/domain":match name{"calculate_finance"=>"finance","compose_materials"=>"materials","ask_banker"=>"workflow",_=>"evidence"},"banking/authority":"session-scoped public archive; no external credentials or network access by default"}).as_object().unwrap().clone()));
        v.push(tool);
    }
    for (name, description, schema) in [
        (
            "search_evidence",
            "Find company/metric records in the canonical archive with source citations. Bounded keyword search, not web search.",
            json!({"type":"object","properties":{"query":{"type":"string","minLength":1,"maxLength":200},"symbol":{"type":["string","null"]}},"required":["query","symbol"],"additionalProperties":false}),
        ),
        (
            "build_context",
            "Select retrieved evidence and derived outputs for a bounded model context packet; no complete database dump.",
            json!({"type":"object","properties":{"task":{"type":"string","maxLength":8000},"symbols":{"type":"array","minItems":1,"maxItems":3,"items":{"type":"string","enum":["PEP","CPB","GIS"]}},"maxChars":{"type":"integer","minimum":4000,"maximum":48000}},"required":["task","symbols","maxChars"],"additionalProperties":false}),
        ),
    ] {
        v.push(
            Tool::new(name, description, schema.as_object().unwrap().clone()).with_annotations(
                ToolAnnotations::new()
                    .read_only(true)
                    .destructive(false)
                    .open_world(false),
            ),
        );
    }
    v
}
impl BankingServer {
    pub fn new(app: App, room: Value, live: bool) -> Self {
        Self {
            providers: Arc::new(providers::Registry::with_pool(app.clone())),
            app,
            stage: Arc::new(tokio::sync::Mutex::new(room)),
            live,
            allow_cached: true,
        }
    }
    pub async fn snapshot(&self) -> Value {
        self.stage.lock().await.clone()
    }
    async fn invoke(&self, name: &str, args: Value) -> Result<Value, ApiError> {
        match name {
            "search_evidence" => {
                let a: Search =
                    serde_json::from_value(args).map_err(|_| bad("Invalid evidence search"))?;
                evidence::search(&self.app.db.lock().unwrap(), &a.query, a.symbol.as_deref())
            }
            "build_context" => {
                let a: Context =
                    serde_json::from_value(args).map_err(|_| bad("Invalid context selection"))?;
                let mut room = self.stage.lock().await;
                let p = evidence::packet(&room, &a.task, &a.symbols, a.max_chars)?;
                room["contextPacket"] = p.clone();
                Ok(p)
            }
            "fetch_company_facts" if !self.live => {
                let a: Company = serde_json::from_value(args)
                    .map_err(|_| bad("Only a covered symbol is accepted"))?;
                let symbol = a.symbol.as_str();
                let c = self.providers.company("public-archive", symbol).await?;
                self.stage.lock().await["sources"][format!("sec:{symbol}")] = c.clone();
                Ok(c)
            }
            "fetch_treasury_curve" if !self.live => {
                if args != json!({}) {
                    return Err(bad("No arguments expected"));
                }
                let c = self.providers.curve("public-archive").await?;
                self.stage.lock().await["sources"]["treasury:USD"] = c.clone();
                Ok(c)
            }
            _ => {
                let mut room = self.stage.lock().await;
                let result =
                    agent::execute_tool(&self.app, name, &args, &mut room, self.allow_cached)
                        .await?;
                if name == "compose_materials" {
                    let d: materials::Draft =
                        serde_json::from_value(room["draft"].clone()).map_err(internal)?;
                    room["scene"] = materials::compile(&d, &room)?;
                }
                Ok(result)
            }
        }
    }
    fn resource_list(&self) -> Vec<Resource> {
        vec![
            Resource::new(
                "banking://catalog",
                "Covered entities and provider contracts",
            )
            .with_mime_type("application/json"),
            Resource::new(
                "banking://brand/rabobank-public",
                "Corporate presentation grammar",
            )
            .with_mime_type("application/json"),
            Resource::new(
                "banking://methodology/finance",
                "Financial conventions and exclusions",
            )
            .with_mime_type("text/markdown"),
            Resource::new(
                "banking://session/context",
                "Selected session context packet",
            )
            .with_mime_type("application/json"),
        ]
    }
}
impl ServerHandler for BankingServer {
    fn get_info(&self) -> ServerConfig {
        let mut c = ServerConfig::new(
            ServerCapabilities::builder()
                .enable_tools()
                .enable_resources()
                .build(),
        );
        c.instructions=Some("Banking Studio public-archive tools. No live provider/model connection is activated. Financial outputs are deterministic and assumptions are explicit. Session state is isolated; tools cannot access arbitrary files or URLs.".into());
        c
    }
    fn get_tool(&self, name: &str) -> Option<Tool> {
        catalog().into_iter().find(|t| t.name == name)
    }
    async fn list_tools(
        &self,
        _: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, McpError> {
        let mut r = ListToolsResult::default();
        r.tools = catalog();
        Ok(r)
    }
    async fn call_tool(
        &self,
        r: CallToolRequestParams,
        _: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, McpError> {
        if self.get_tool(&r.name).is_none() {
            return Err(McpError::invalid_params(
                "Tool not exposed by this server",
                None,
            ));
        }
        match self
            .invoke(&r.name, json!(r.arguments.unwrap_or_default()))
            .await
        {
            Ok(v) => Ok(CallToolResult::structured(v).into()),
            Err(e) => Ok(CallToolResult::error(vec![ContentBlock::text(e.1)]).into()),
        }
    }
    async fn list_resources(
        &self,
        _: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> Result<ListResourcesResult, McpError> {
        let mut r = ListResourcesResult::default();
        r.resources = self.resource_list();
        Ok(r)
    }
    async fn read_resource(
        &self,
        r: ReadResourceRequestParams,
        _: RequestContext<RoleServer>,
    ) -> Result<ReadResourceResponse, McpError> {
        let value=match r.uri.as_str(){
  "banking://catalog"=>json!({"companies":connectors::CATALOG.iter().map(|c|json!({"symbol":c.0,"entityId":format!("sec:{}",c.1),"name":c.2})).collect::<Vec<_>>(),"asOf":self.app.data["asOf"],"mode":"public archive"}).to_string(),
  "banking://brand/rabobank-public"=>materials::brand().to_string(),
  "banking://methodology/finance"=>include_str!("../docs/FINANCIAL_METHODS.md").into(),
  "banking://session/context"=>self.stage.lock().await["contextPacket"].to_string(),
  uri if uri.starts_with("banking://evidence/")=>{let db=self.app.db.lock().unwrap();evidence::read(&db,uri.trim_start_matches("banking://evidence/")).map_err(|_|McpError::invalid_params("Unknown evidence resource",None))?.to_string()},
  _=>return Err(McpError::invalid_params("Resource not exposed by this server",None))};
        Ok(ReadResourceResult::new(vec![
            ResourceContents::text(value, r.uri.clone()).with_mime_type(
                if r.uri == "banking://methodology/finance" {
                    "text/markdown"
                } else {
                    "application/json"
                },
            ),
        ])
        .into())
    }
}
pub struct Session {
    pub server: BankingServer,
    client: RunningService<RoleClient, ()>,
    _service: RunningService<RoleServer, BankingServer>,
}
impl Session {
    pub async fn new(app: App, room: Value, live: bool) -> Result<Self, ApiError> {
        Self::with_policy(app, room, live, true).await
    }
    pub async fn with_policy(
        app: App,
        room: Value,
        live: bool,
        allow_cached: bool,
    ) -> Result<Self, ApiError> {
        let mut server = BankingServer::new(app, room, live);
        server.allow_cached = allow_cached;
        let service = server.clone();
        let (a, b) = tokio::io::duplex(128 * 1024);
        let task = tokio::spawn(async move { service.serve(a).await });
        let client = ().serve(b).await.map_err(internal)?;
        let service = task.await.map_err(internal)?.map_err(internal)?;
        Ok(Self {
            server,
            client,
            _service: service,
        })
    }
    pub async fn tools(&self) -> Result<Value, ApiError> {
        Ok(json!(self.client.list_all_tools().await.map_err(internal)?))
    }
    pub async fn call(&self, name: &str, args: Value) -> Result<Value, ApiError> {
        let map = args
            .as_object()
            .cloned()
            .ok_or_else(|| bad("Tool arguments must be an object"))?;
        let r = self
            .client
            .call_tool(CallToolRequestParams::new(name.to_string()).with_arguments(map))
            .await
            .map_err(|_| bad("MCP rejected tool name or input schema"))?;
        if r.is_error == Some(true) {
            let msg = r
                .content
                .iter()
                .filter_map(|c| c.as_text().map(|t| t.text.clone()))
                .collect::<Vec<_>>()
                .join("; ");
            return Err(bad(msg));
        }
        r.structured_content
            .ok_or_else(|| bad("MCP tool returned no structured observation"))
    }
}
pub async fn stdio(app: App) -> Result<(), ApiError> {
    let room = json!({"id":"stdio-public","sources":{},"analyses":{},"draft":null,"history":[],"messages":[]});
    let service = BankingServer::new(app, room, false)
        .serve(rmcp::transport::stdio())
        .await
        .map_err(internal)?;
    service.waiting().await.map_err(internal)?;
    Ok(())
}
pub fn external_enabled() -> bool {
    std::env::var("BANKING_STUDIO_EXTERNAL_CONNECTIONS").as_deref() == Ok("1")
}
pub async fn architecture(State(s): State<App>) -> ApiResult {
    let session = Session::new(s.clone(), json!({"sources":{},"analyses":{}}), false).await?;
    let tools = session.tools().await?;
    Ok(Json(
        json!({"phase":"Architecture and local public archive","mcp":{"sdk":"Official Rust SDK rmcp 3.7.0 / Apache-2.0","protocol":"SDK negotiated MCP; current and legacy discovery supported","transport":"JSON-RPC over in-process duplex; standalone stdio via --mcp","tools":tools,"resources":session.server.resource_list()},"providers":session.server.providers.descriptors(),"models":{"state":if director::enabled(){"local Codex agent enabled"}else if external_enabled(){"optional owner-enabled adapter"}else{"deferred"},"note":"The director workflow can use the laptop’s authenticated Codex CLI when explicitly enabled. Remote API/voice adapters remain separate. Structured local blueprints still run without inference."},"layers":["Source adapters","Canonical evidence and lineage","MCP tools and resources","Bounded context selection","Workflow and model port","Semantic document and scene compiler","React canvas and review"],"brand":materials::brand()}),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    pub(super) fn app() -> App {
        let data: Value =
            serde_json::from_str(include_str!("../data/public-snapshot.json")).unwrap();
        let db = Connection::open_in_memory().unwrap();
        agent::init(&db).unwrap();
        evidence::init(&db, &data).unwrap();
        pool::init(&db, &data).unwrap();
        Arc::new(AppState {
            db: Mutex::new(db),
            data,
            keys: RwLock::new(Keys {
                openai: String::new(),
                alpha: String::new(),
                text_model: String::new(),
                transcribe_model: String::new(),
                voice_model: String::new(),
            }),
            client: reqwest::Client::new(),
            token: "test".into(),
            port: 0,
            claude_available: false,
            agent_gate: Arc::new(tokio::sync::Semaphore::new(1)),
        })
    }
    fn room() -> Value {
        json!({"id":"isolated","sources":{},"analyses":{},"draft":null,"messages":[],"history":[]})
    }
    #[tokio::test]
    async fn real_sdk_discovery_calls_resources_and_isolation() {
        let app = app();
        let a = Session::new(app.clone(), room(), false).await.unwrap();
        let b = Session::new(app, room(), false).await.unwrap();
        let tools = a.tools().await.unwrap();
        assert_eq!(tools.as_array().unwrap().len(), 8);
        assert!(
            tools
                .as_array()
                .unwrap()
                .iter()
                .all(|t| t["inputSchema"]["type"] == "object")
        );
        let c = a
            .call("fetch_company_facts", json!({"symbol":"PEP"}))
            .await
            .unwrap();
        assert_eq!(c["provenance"]["mode"], "archive");
        assert!(
            b.server.snapshot().await["sources"]
                .as_object()
                .unwrap()
                .is_empty()
        );
        assert!(
            a.call(
                "fetch_company_facts",
                json!({"symbol":"PEP","url":"https://evil.example"})
            )
            .await
            .is_err()
        );
        assert!(
            a.call(
                "fetch_treasury_curve",
                json!({"url":"https://evil.example"})
            )
            .await
            .is_err()
        );
        assert!(a.call("not_a_tool", json!({})).await.is_err());
        let ev = c["facts"]["revenue"]["evidenceId"].as_str().unwrap();
        let uri = format!("banking://evidence/{ev}");
        let r = a
            .client
            .read_resource(ReadResourceRequestParams::new(&uri))
            .await
            .unwrap();
        let text = serde_json::to_value(r).unwrap();
        let record: Value =
            serde_json::from_str(text["contents"][0]["text"].as_str().unwrap()).unwrap();
        assert_eq!(record["id"], ev);
        assert_eq!(record["normalized"]["unit"], "USDm");
        assert!(
            a.client
                .read_resource(ReadResourceRequestParams::new("file:///etc/passwd"))
                .await
                .is_err()
        );
    }
    #[tokio::test]
    async fn bounded_context_and_calculation_use_same_evidence() {
        let a = Session::new(app(), room(), false).await.unwrap();
        a.call("fetch_company_facts", json!({"symbol":"PEP"}))
            .await
            .unwrap();
        a.call("fetch_treasury_curve", json!({})).await.unwrap();
        let r = a
            .call("search_evidence", json!({"query":"cash","symbol":"PEP"}))
            .await
            .unwrap();
        assert!(!r["records"].as_array().unwrap().is_empty());
        let m=a.call("calculate_finance",json!({"analysisId":"debt","kind":"bond","issuer":"PEP","target":null,"params":finance::defaults("bond"),"rationale":"Explicit illustrative terms from a local test blueprint."})).await.unwrap();
        assert_eq!(m["model"]["issuer"], "PEP");
        assert!(a.call("calculate_finance",json!({"analysisId":"broken","kind":"bond","issuer":"PEP","target":null,"params":{},"rationale":"No silently inserted financial assumptions are allowed."})).await.is_err());
        let p = a
            .call(
                "build_context",
                json!({"task":"Review financing terms","symbols":["PEP"],"maxChars":12000}),
            )
            .await
            .unwrap();
        assert!(p.to_string().chars().count() <= 12000);
        assert!(!p["observations"].as_array().unwrap().is_empty());
        for r in p["observations"].as_array().unwrap() {
            assert_eq!(
                p["citationManifest"][r["id"].as_str().unwrap()]["metric"],
                r["metric"]
            );
            let db = a.server.app.db.lock().unwrap();
            assert!(evidence::read(&db, r["id"].as_str().unwrap()).is_ok());
        }
    }
}
