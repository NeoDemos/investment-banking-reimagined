//! Typed source ports. External providers are descriptors with explicit deferred errors.
use super::*;
use serde::Serialize;
use std::{future::Future, pin::Pin};
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Descriptor {
    pub id: &'static str,
    pub name: &'static str,
    pub state: &'static str,
    pub mode: &'static str,
    pub capabilities: Vec<&'static str>,
    pub url: Option<&'static str>,
    pub as_of: Option<String>,
    pub rights: &'static str,
}
pub type SourceFuture<'a> = Pin<Box<dyn Future<Output = Result<Value, ApiError>> + Send + 'a>>;
pub trait FinancialSource: Send + Sync {
    fn descriptor(&self) -> Descriptor;
    fn company<'a>(&'a self, symbol: &'a str) -> SourceFuture<'a>;
    fn curve(&self) -> SourceFuture<'_>;
}
struct Archive {
    data: Value,
}
impl FinancialSource for Archive {
    fn descriptor(&self) -> Descriptor {
        Descriptor {
            id: "public-archive",
            name: "SEC / U.S. Treasury archive",
            state: "ready",
            mode: "local archive → MCP",
            capabilities: vec![
                "company discovery",
                "annual facts",
                "Treasury par curve",
                "evidence search",
            ],
            url: None,
            as_of: self.data["asOf"].as_str().map(str::to_string),
            rights: "Public source observations; dates and original provenance retained",
        }
    }
    fn company<'a>(&'a self, symbol: &'a str) -> SourceFuture<'a> {
        Box::pin(async move { evidence::archive_company(&self.data, symbol) })
    }
    fn curve(&self) -> SourceFuture<'_> {
        Box::pin(async { Ok(evidence::archive_curve(&self.data)) })
    }
}
struct PoolSource {
    app: App,
}
impl FinancialSource for PoolSource {
    fn descriptor(&self) -> Descriptor {
        Descriptor {
            id: "public-archive",
            name: "Versioned public data pool",
            state: "ready",
            mode: "ingestion receipts → canonical evidence → MCP",
            capabilities: vec![
                "annual company facts",
                "Treasury par curve",
                "retained source versions",
            ],
            url: None,
            as_of: None,
            rights: "Public sources and dated archive. No licensed market data or executable quotes.",
        }
    }
    fn company<'a>(&'a self, symbol: &'a str) -> SourceFuture<'a> {
        Box::pin(async move { pool::company(&self.app, symbol) })
    }
    fn curve(&self) -> SourceFuture<'_> {
        Box::pin(async { pool::curve(&self.app) })
    }
}
struct Deferred {
    descriptor: Descriptor,
}
impl FinancialSource for Deferred {
    fn descriptor(&self) -> Descriptor {
        self.descriptor.clone()
    }
    fn company<'a>(&'a self, _: &'a str) -> SourceFuture<'a> {
        Box::pin(async {
            Err(ApiError(
                StatusCode::CONFLICT,
                format!(
                    "{} is a planned contract. Authentication, entitlements and actual tools are next-phase work.",
                    self.descriptor.name
                ),
            ))
        })
    }
    fn curve(&self) -> SourceFuture<'_> {
        Box::pin(async {
            Err(ApiError(
                StatusCode::CONFLICT,
                "External source connections are deferred".into(),
            ))
        })
    }
}
pub struct Registry {
    sources: Vec<Box<dyn FinancialSource>>,
}
impl Registry {
    pub fn with_pool(app: App) -> Self {
        let mut r = Self::new(app.data.clone());
        r.sources[0] = Box::new(PoolSource { app });
        r
    }
    pub fn new(data: Value) -> Self {
        let mut sources: Vec<Box<dyn FinancialSource>> = vec![Box::new(Archive { data })];
        for (id, name, mode, url, caps) in [
            (
                "sec-live",
                "SEC EDGAR / Treasury refresh",
                "API adapter → MCP",
                "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
                vec!["annual facts", "Treasury par curve"],
            ),
            (
                "factset",
                "FactSet AI-ready data",
                "provider-native MCP",
                "https://developer.factset.com/mcp/factset-ai-ready-data-mcp",
                vec!["fundamentals", "prices", "debt", "estimates"],
            ),
            (
                "spglobal",
                "S&P Global / Kensho",
                "provider-native MCP",
                "https://docs.kensho.com/llmreadyapi/mcp",
                vec!["financials", "market data", "transactions"],
            ),
            (
                "daloopa",
                "Daloopa",
                "provider-native MCP",
                "https://docs.daloopa.com/docs/daloopa-mcp",
                vec![
                    "series discovery",
                    "fundamentals",
                    "documents",
                    "daily stock prices",
                ],
            ),
        ] {
            sources.push(Box::new(Deferred{descriptor:Descriptor{id,name,state:if id=="sec-live"{"deferred"}else{"planned"},mode,capabilities:caps,url:Some(url),as_of:None,rights:"Unverified: inspect entitled tool schemas, licence and permitted processing before activating"}}));
        }
        Self { sources }
    }
    pub fn descriptors(&self) -> Vec<Descriptor> {
        self.sources.iter().map(|s| s.descriptor()).collect()
    }
    fn get(&self, id: &str) -> Result<&dyn FinancialSource, ApiError> {
        self.sources
            .iter()
            .find(|s| s.descriptor().id == id)
            .map(|s| s.as_ref())
            .ok_or_else(|| bad("Unknown data provider"))
    }
    pub async fn company(&self, id: &str, symbol: &str) -> Result<Value, ApiError> {
        self.get(id)?.company(symbol).await
    }
    pub async fn curve(&self, id: &str) -> Result<Value, ApiError> {
        self.get(id)?.curve().await
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn planned_connections_cannot_execute() {
        let d = serde_json::from_str(include_str!("../data/public-snapshot.json")).unwrap();
        let r = Registry::new(d);
        assert_eq!(r.descriptors().len(), 5);
        assert!(r.company("factset", "PEP").await.is_err());
        assert!(r.company("missing", "PEP").await.is_err());
        assert_eq!(
            r.company("public-archive", "PEP").await.unwrap()["provenance"]["mode"],
            "archive"
        );
    }
}
