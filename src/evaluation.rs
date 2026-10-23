//! User-entered paired observations; no fabricated baselines or inferred client economics.
use super::*;
use serde::Deserialize;
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Observation {
    copy_id: String,
    task_label: String,
    reviewer: String,
    baseline_method: String,
    order: String,
    baseline_minutes: std::collections::BTreeMap<String, f64>,
    assisted_minutes: std::collections::BTreeMap<String, f64>,
    baseline_elapsed_minutes: f64,
    assisted_elapsed_minutes: f64,
    baseline_accepted: bool,
    assisted_accepted: bool,
    baseline_critical_errors: u32,
    assisted_critical_errors: u32,
    same_scope_confirmed: bool,
    all_staff_and_setup_included: bool,
    questions: Vec<String>,
    questions_predefined: bool,
    baseline_resolved: u32,
    assisted_resolved: u32,
    evidence_notes: String,
}
const PHASES: [&str; 6] = [
    "setup",
    "research",
    "calculation",
    "materials",
    "qualityReview",
    "rework",
];
fn total(phases: &std::collections::BTreeMap<String, f64>) -> Result<f64, ApiError> {
    if phases.len() != PHASES.len()
        || PHASES.iter().any(|p| !phases.contains_key(*p))
        || phases
            .values()
            .any(|v| !v.is_finite() || *v < 0. || *v > 100000.)
    {
        return Err(bad(
            "Record all six nonnegative staff-time components, in minutes",
        ));
    }
    let total = phases.values().sum::<f64>();
    if total <= 0. {
        return Err(bad("Both methods require positive total staff time"));
    }
    Ok(total)
}
fn ratios(
    b: f64,
    a: f64,
    quality: bool,
    predefined: bool,
    total: u32,
    baseline: u32,
    assisted: u32,
) -> Value {
    json!({"qualityGatePassed":quality,"enteredStaffTimeRatio":if quality{Some(b/a)}else{None},"baselineQuestionCoverage":if total>0{Some(baseline as f64/total as f64)}else{None},"assistedQuestionCoverage":if total>0{Some(assisted as f64/total as f64)}else{None},"enteredQuestionCoverageRatio":if quality&&predefined&&total>0&&baseline>0{Some(assisted as f64/baseline as f64)}else{None},"productivityClaim":"Unproven as a general staff-productivity claim; arithmetic uses unverified user-entered observations","clientImpactClaim":"Unproven; question coverage is a simulated-meeting proxy, not realized client economics"})
}
pub async fn record(
    State(s): State<App>,
    Path(id): Path<String>,
    Json(b): Json<Observation>,
) -> ApiResult {
    for (label, v, min, max) in [
        ("Task label", b.task_label.as_str(), 5, 180),
        ("Reviewer", b.reviewer.as_str(), 2, 100),
        ("Baseline method", b.baseline_method.as_str(), 10, 1000),
        (
            "Evidence and limitations",
            b.evidence_notes.as_str(),
            30,
            4000,
        ),
    ] {
        if !(min..=max).contains(&v.trim().chars().count()) {
            return Err(bad(format!("{label} requires {min}–{max} characters")));
        }
    }
    if !["baseline_first", "assisted_first", "matched_cases"].contains(&b.order.as_str()) {
        return Err(bad("Record the order / matched-case design"));
    }
    for value in [b.baseline_elapsed_minutes, b.assisted_elapsed_minutes] {
        if !value.is_finite() || value <= 0. || value > 100000. {
            return Err(bad(
                "Record positive elapsed minutes separately from aggregate active staff time",
            ));
        }
    }
    if b.questions.len() > 30
        || b.questions
            .iter()
            .any(|q| !(5..=300).contains(&q.trim().chars().count()))
        || b.baseline_resolved as usize > b.questions.len()
        || b.assisted_resolved as usize > b.questions.len()
    {
        return Err(bad(
            "Define up to 30 comparable questions; resolved counts cannot exceed the denominator",
        ));
    }
    let baseline = total(&b.baseline_minutes)?;
    let assisted = total(&b.assisted_minutes)?;
    let distinct: std::collections::HashSet<String> = b
        .questions
        .iter()
        .map(|q| {
            q.split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
                .to_lowercase()
        })
        .collect();
    if distinct.len() != b.questions.len() {
        return Err(bad(
            "Use distinct predefined questions; duplicated questions cannot inflate coverage",
        ));
    }
    let copy: String =
        s.db.lock()
            .unwrap()
            .query_row(
                "SELECT payload FROM client_review_copies WHERE room_id=? AND id=?",
                params![id, b.copy_id],
                |r| r.get(0),
            )
            .map_err(|_| bad("Select an exact discussion review copy from this workroom"))?;
    let copy = parse(copy);
    if copy["reviewCopy"]["renderContract"] != "client-decision/2" {
        return Err(bad("Select a complete current-contract discussion copy"));
    }
    let manifest:Vec<Value>=copy["workroom"]["sources"].as_object().unwrap().iter().map(|(key,v)|json!({"source":key,"provenance":v["provenance"],"periodEnd":v["periodEnd"],"date":v["date"]})).collect();
    let quality = b.baseline_accepted
        && b.assisted_accepted
        && b.baseline_critical_errors == 0
        && b.assisted_critical_errors == 0
        && b.same_scope_confirmed
        && b.all_staff_and_setup_included;
    let metrics = ratios(
        baseline,
        assisted,
        quality,
        b.questions_predefined,
        b.questions.len() as u32,
        b.baseline_resolved,
        b.assisted_resolved,
    );
    let entry = json!({"id":new_id(),"roomId":id,"schemaVersion":"banker-evaluation/1","createdAt":now(),"provenance":"User-entered; reviewer identity, qualification, timing, scope and acceptance are not independently verified by this prototype","copyId":b.copy_id,"copyRevision":copy["reviewCopy"]["revision"],"taskLabel":b.task_label.trim(),"reviewer":b.reviewer.trim(),"baselineMethod":b.baseline_method.trim(),"order":b.order,"baselineMinutes":b.baseline_minutes,"assistedMinutes":b.assisted_minutes,"baselineTotalStaffMinutes":baseline,"assistedTotalStaffMinutes":assisted,"baselineElapsedMinutes":b.baseline_elapsed_minutes,"assistedElapsedMinutes":b.assisted_elapsed_minutes,"baselineAccepted":b.baseline_accepted,"assistedAccepted":b.assisted_accepted,"baselineCriticalErrors":b.baseline_critical_errors,"assistedCriticalErrors":b.assisted_critical_errors,"sameScopeConfirmed":b.same_scope_confirmed,"allStaffAndSetupIncluded":b.all_staff_and_setup_included,"questions":b.questions,"questionsPredefined":b.questions_predefined,"baselineResolved":b.baseline_resolved,"assistedResolved":b.assisted_resolved,"evidenceNotes":b.evidence_notes.trim(),"evidenceManifest":manifest,"metrics":metrics});
    s.db.lock()
        .unwrap()
        .execute(
            "INSERT INTO client_evaluations VALUES(?,?,?,?)",
            params![entry["id"].as_str(), id, entry.to_string(), now()],
        )
        .map_err(internal)?;
    Ok(Json(entry))
}
pub async fn list(State(s): State<App>, Path(id): Path<String>) -> ApiResult {
    agent::load(&s, &id)?;
    let db = s.db.lock().unwrap();
    let mut q=db.prepare("SELECT payload FROM client_evaluations WHERE room_id=? ORDER BY created_at DESC LIMIT 100").map_err(internal)?;
    let rows = q
        .query_map([id], |r| r.get::<_, String>(0))
        .map_err(internal)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(internal)?
        .into_iter()
        .map(parse)
        .collect::<Vec<_>>();
    let mut values: Vec<f64> = rows
        .iter()
        .filter_map(|r| r["metrics"]["enteredStaffTimeRatio"].as_f64())
        .collect();
    values.sort_by(f64::total_cmp);
    let median = if values.is_empty() {
        None
    } else {
        let n = values.len();
        Some(if n % 2 == 1 {
            values[n / 2]
        } else {
            (values[n / 2 - 1] + values[n / 2]) / 2.
        })
    };
    Ok(Json(
        json!({"observations":rows,"summary":{"enteredPairs":rows.len(),"observationWindow":"Latest 100 entries; all earlier records remain stored","qualityQualifiedPairs":values.len(),"medianEnteredStaffTimeRatio":median,"productivityClaim":"Unproven; unverified entries do not establish a general 10× result","clientImpactClaim":"Unproven; no realized client-outcome evidence recorded"}}),
    ))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn quality_and_denominator_gates_suppress_invalid_ratios() {
        assert!(ratios(60., 6., false, true, 5, 1, 5)["enteredStaffTimeRatio"].is_null());
        assert!(ratios(60., 6., true, true, 5, 0, 5)["enteredQuestionCoverageRatio"].is_null());
        assert!(ratios(60., 6., true, false, 5, 1, 5)["enteredQuestionCoverageRatio"].is_null());
        assert_eq!(
            ratios(60., 6., true, true, 5, 1, 5)["enteredStaffTimeRatio"],
            10.
        );
    }
}
