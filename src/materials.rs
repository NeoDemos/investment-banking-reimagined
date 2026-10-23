//! Canonical semantic document and deterministic scene compiler.
use super::*;
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Block {
    pub r#type: String,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default, rename = "analysisId")]
    pub analysis_id: Option<String>,
    #[serde(default)]
    pub symbol: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Slide {
    pub id: String,
    pub title: String,
    pub layout: String,
    pub blocks: Vec<Block>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Draft {
    pub title: String,
    pub slides: Vec<Slide>,
}

pub fn validate_draft(d: &Draft, room: &Value) -> Result<(), String> {
    if d.title.is_empty() || d.title.len() > 180 || !(2..=16).contains(&d.slides.len()) {
        return Err("Use a title and 2–16 pages".into());
    }
    let mut ids = std::collections::HashSet::new();
    let mut has_sources = false;
    let mut assumptions = std::collections::HashSet::new();
    let mut used = std::collections::HashSet::new();
    for p in &d.slides {
        if p.id.is_empty()
            || p.id.len() > 64
            || !ids.insert(p.id.clone())
            || p.title.is_empty()
            || p.title.len() > 130
            || !["cover", "split", "full", "grid"].contains(&p.layout.as_str())
            || !(1..=4).contains(&p.blocks.len())
        {
            return Err("Invalid page identity, headline, layout or density".into());
        }
        if p.blocks.len() > 1
            && ["full", "cover"].contains(&p.layout.as_str())
            && p.blocks.iter().any(|b| b.r#type != "text")
        {
            return Err("Use split composition for paired financial blocks, or put one data block on a full page".into());
        }
        if p.blocks.len() > 2
            && p.blocks
                .iter()
                .any(|b| b.r#type != "text" || b.text.as_deref().unwrap_or("").len() > 280)
        {
            return Err("Multi-row compositions require concise narrative blocks. Give financial data full-height frames.".into());
        }
        let mut chars = 0;
        for b in &p.blocks {
            match b.r#type.as_str() {
                "text" => {
                    let t = b.text.as_deref().unwrap_or("");
                    chars += t.len();
                    if t.is_empty() || t.len() > 650 || t.chars().any(|c| c.is_ascii_digit()) {
                        return Err("Narrative must be concise; numeric figures belong in bound data blocks".into());
                    }
                }
                "metrics" | "chart" | "workings" | "sensitivity" | "assumptions" | "schedule" => {
                    let id = b
                        .analysis_id
                        .as_deref()
                        .ok_or("Analysis reference required")?;
                    if room["analyses"].get(id).is_none() {
                        return Err("Unknown analysis reference".into());
                    }
                    used.insert(id.to_string());
                    if b.r#type == "assumptions" {
                        assumptions.insert(id.to_string());
                    }
                }
                "facts" => {
                    let symbol = b.symbol.as_deref().ok_or("Company required")?;
                    if room["sources"].get(format!("sec:{symbol}")).is_none() {
                        return Err("Retrieve company before using facts".into());
                    }
                }
                "market_context" => {
                    if room["sources"]["bund:EUR"]["points"].is_null() {
                        return Err(
                            "Retrieve Bundesbank data before using a market-context frame".into(),
                        );
                    }
                }
                "sector_benchmark" => {
                    if room["sources"]["sector:US"]["rows"].is_null() {
                        return Err("A retained sector reference is required".into());
                    }
                }
                "peer_position" => {
                    if room["peerPosition"].as_array().is_none_or(|a| a.is_empty()) {
                        return Err("Retrieve peer evidence before using this frame".into());
                    }
                }
                "bank_proposition" => {
                    if room["sources"]["bank:rabobank"]["claims"].is_null() {
                        return Err("A sourced bank proposition is required".into());
                    }
                }
                "sources" => has_sources = true,
                "client_decision" | "client_view" | "client_conditions" => {
                    if room["mandate"]["question"].as_str().is_none() {
                        return Err("A saved client decision is required".into());
                    }
                }
                "decision_comparison" => {
                    let options = room["options"]
                        .as_array()
                        .ok_or("Active client actions are required")?;
                    if options.len() != 2 {
                        return Err("Compare two active client actions".into());
                    }
                    for option in options {
                        let id = option["analysisId"]
                            .as_str()
                            .ok_or("Active analysis required")?;
                        if room["analyses"].get(id).is_none() {
                            return Err("Calculate the active actions first".into());
                        }
                        used.insert(id.to_string());
                    }
                }
                _ => return Err("Unsupported block type".into()),
            }
        }
        if chars > 1300 {
            return Err("Too much narrative on one page".into());
        }
    }
    if room["mandate"]["documentContract"] == "client-decision/2" {
        for required in [
            "client_decision",
            "client_view",
            "client_conditions",
            "decision_comparison",
        ] {
            if !d
                .slides
                .iter()
                .flat_map(|p| &p.blocks)
                .any(|b| b.r#type == required)
            {
                return Err(format!(
                    "Client materials must retain the complete {required} section"
                ));
            }
        }
    }
    if !has_sources || !used.is_subset(&assumptions) {
        return Err("Include actual sources and assumption blocks for every analysis used".into());
    }
    Ok(())
}

pub fn brand() -> Value {
    serde_json::from_str(include_str!("../data/brand-rabobank.json")).unwrap()
}
pub fn compile(d: &Draft, room: &Value) -> Result<Value, ApiError> {
    validate_draft(d, room).map_err(bad)?;
    let mut pages = vec![];
    let mut index = serde_json::Map::new();
    let mut quality = vec![];
    for page in &d.slides {
        let n = page.blocks.len();
        let frames=page.blocks.iter().enumerate().map(|(i,b)|{
   let (x,y,w,h)=match(page.layout.as_str(),n){(_,1)=>(0.,0.,1.,1.),("full",_)|("cover",_) if n==2=>(0.,i as f64*0.5,1.,0.46),("split",2)=>(i as f64*0.52,0.,0.48,1.),(_,_) =>((i%2) as f64*0.52,(i/2) as f64*0.52,0.48,if n<=2{1.}else{0.46})};
   let fid=format!("{}:block:{i}",page.id);let mut bindings=vec![];let mut citations=vec![];
   if ["client_decision","client_view","client_conditions"].contains(&b.r#type.as_str()) {bindings.push(json!({"kind":"banker_authored_decision","path":"mandate","scope":"Exact workroom revision; not a model recommendation"}));}
   if b.r#type=="decision_comparison" {for option in room["options"].as_array().into_iter().flatten(){bindings.push(json!({"kind":"active_decision_analysis","id":option["analysisId"],"path":format!("analyses/{}/lineage",option["analysisId"].as_str().unwrap())}));}}
   if let Some(aid)=&b.analysis_id {let a=&room["analyses"][aid];bindings.push(json!({"kind":"analysis","id":aid,"path":format!("analyses/{aid}/model"),"sourceSnapshot":"pinned at calculation"}));
    for c in a["sourceSnapshot"]["companies"].as_array().into_iter().flatten(){for(k,f)in c["facts"].as_object().into_iter().flat_map(|f|f.iter()){let ev=evidence::id(c["symbol"].as_str().unwrap(),k,f);citations.push(ev.clone());index.entry(ev).or_insert(json!({"entity":c["symbol"],"metric":k,"periodEnd":f["periodEnd"],"filed":f["filed"],"unit":f["unit"],"sourceUrl":f["sourceUrl"],"tag":f["tag"]}));}}
    let snapshot=&a["sourceSnapshot"]["curve"];if !snapshot.is_null(){let cid=format!("curve:USD:{}",snapshot["date"].as_str().unwrap_or("unknown"));citations.push(cid.clone());index.entry(cid).or_insert(json!({"date":snapshot["date"],"sourceUrl":snapshot["sourceUrl"],"basis":"Treasury par curve; not issuer spread"}));}
   }
   if let Some(symbol)=&b.symbol {let c=&room["sources"][format!("sec:{symbol}")];for(k,f)in c["facts"].as_object().into_iter().flat_map(|f|f.iter()){let ev=evidence::id(symbol,k,f);citations.push(ev.clone());index.entry(ev.clone()).or_insert(json!({"entity":symbol,"metric":k,"periodEnd":f["periodEnd"],"filed":f["filed"],"unit":f["unit"],"sourceUrl":f["sourceUrl"],"tag":f["tag"]}));bindings.push(json!({"kind":"evidence","id":ev,"path":format!("sources/sec:{symbol}/facts/{k}")}));}}
   if b.r#type=="peer_position" {for peer in room["peerPosition"].as_array().into_iter().flatten(){let symbol=peer["symbol"].as_str().unwrap();let c=&room["sources"][format!("sec:{symbol}")];for(k,f)in c["facts"].as_object().unwrap(){let id=evidence::id(symbol,k,f);citations.push(id.clone());index.entry(id.clone()).or_insert(json!({"entity":symbol,"metric":k,"periodEnd":f["periodEnd"],"sourceUrl":f["sourceUrl"],"tag":f["tag"]}));bindings.push(json!({"kind":"evidence","id":id,"path":format!("sources/sec:{symbol}/facts/{k}")}));}}}
   if b.r#type=="bank_proposition" {for (n,claim) in room["sources"]["bank:rabobank"]["claims"].as_array().into_iter().flatten().enumerate(){let id=format!("bank:rabobank:claim:{n}");citations.push(id.clone());index.insert(id.clone(),json!({"sourceUrl":claim["sourceUrl"],"basis":"Public bank description; client-specific relevance requires review"}));bindings.push(json!({"kind":"public_bank_proposition","id":id,"path":format!("sources/bank:rabobank/claims/{n}")}));}}
   if b.r#type=="sector_benchmark" {let id="sector:US:ev-ebitda".to_string();citations.push(id.clone());index.insert(id.clone(),json!({"sourceUrl":room["sources"]["sector:US"]["sourceUrl"],"basis":room["sources"]["sector:US"]["definition"]}));bindings.push(json!({"kind":"sector_reference","id":id,"path":"sources/sector:US/rows"}));}
   if b.r#type=="market_context" {for (n,p) in room["sources"]["bund:EUR"]["points"].as_array().into_iter().flatten().enumerate(){let id=format!("bund:EUR:{}:{}",p["years"],p["date"]);citations.push(id.clone());index.insert(id.clone(),json!({"sourceUrl":p["sourceUrl"],"date":p["date"],"series":p["series"],"currency":"EUR","basis":"German Federal reference yield; not an issuer quote or USD pricing input"}));bindings.push(json!({"kind":"market_reference","id":id,"path":format!("sources/bund:EUR/points/{n}")}));}}
   let mut problems=vec![];if n>2&&["facts","assumptions","workings","sources"].contains(&b.r#type.as_str()){problems.push("Dense data block in a multi-row layout; split the page if it does not fit.")}
   for problem in problems {quality.push(json!({"severity":"review","pageId":page.id,"frameId":fid,"message":problem}));}
   json!({"id":fid,"kind":b.r#type,"blockIndex":i,"bounds":{"x":x,"y":y,"width":w,"height":h},"bindings":bindings,"citationIds":citations})
  }).collect::<Vec<_>>();
        pages.push(
            json!({"id":page.id,"headline":page.title,"composition":page.layout,"frames":frames}),
        );
    }
    Ok(
        json!({"schemaVersion":"banking.scene/1","brand":brand(),"pages":pages,"citationIndex":index,"quality":quality,"rendering":"Deterministic scene from semantic document; HTML and future Office exporters share this representation."}),
    )
}
#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "snake_case", deny_unknown_fields)]
pub enum Operation {
    SetHeadline {
        #[serde(rename = "pageId")]
        page_id: String,
        text: String,
    },
    SetLayout {
        #[serde(rename = "pageId")]
        page_id: String,
        layout: String,
    },
    MovePage {
        #[serde(rename = "pageId")]
        page_id: String,
        to: usize,
    },
}
pub fn patch(d: &mut Draft, ops: Vec<Operation>) -> Result<(), ApiError> {
    if ops.is_empty() || ops.len() > 12 {
        return Err(bad("Use 1–12 document operations"));
    }
    for op in ops {
        match op {
            Operation::SetHeadline { page_id, text } => {
                d.slides
                    .iter_mut()
                    .find(|p| p.id == page_id)
                    .ok_or_else(|| bad("Page not found"))?
                    .title = text;
            }
            Operation::SetLayout { page_id, layout } => {
                d.slides
                    .iter_mut()
                    .find(|p| p.id == page_id)
                    .ok_or_else(|| bad("Page not found"))?
                    .layout = layout;
            }
            Operation::MovePage { page_id, to } => {
                if to >= d.slides.len() {
                    return Err(bad("Destination outside document"));
                }
                let from = d
                    .slides
                    .iter()
                    .position(|p| p.id == page_id)
                    .ok_or_else(|| bad("Page not found"))?;
                let p = d.slides.remove(from);
                d.slides.insert(to, p);
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod scene_tests {
    use super::*;
    #[test]
    fn operations_preserve_bindings_and_compiler_references() {
        let room = json!({"sources":{},"analyses":{"case":{"sourceSnapshot":{"companies":[],"curve":null}}}});
        let mut d:Draft=serde_json::from_value(json!({"title":"Discussion","slides":[{"id":"a","title":"Decision","layout":"split","blocks":[{"type":"metrics","analysisId":"case"}]},{"id":"b","title":"Terms and source context","layout":"split","blocks":[{"type":"assumptions","analysisId":"case"},{"type":"sources"}]}]})).unwrap();
        patch(
            &mut d,
            vec![
                Operation::MovePage {
                    page_id: "a".into(),
                    to: 1,
                },
                Operation::SetLayout {
                    page_id: "b".into(),
                    layout: "grid".into(),
                },
            ],
        )
        .unwrap();
        let s = compile(&d, &room).unwrap();
        assert_eq!(s["pages"][0]["id"], "b");
        assert_eq!(s["pages"][1]["frames"][0]["bindings"][0]["id"], "case");
        assert!(
            patch(
                &mut d,
                vec![Operation::MovePage {
                    page_id: "missing".into(),
                    to: 0
                }]
            )
            .is_err()
        );
    }
}
