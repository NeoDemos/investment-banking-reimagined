use rust_xlsxwriter::{Format, Formula, Workbook, XlsxError};
use serde_json::Value;
use std::collections::BTreeMap;
pub fn export(data: &Value, b: &Value) -> Result<Vec<u8>, XlsxError> {
    let mut w = Workbook::new();
    let header = Format::new()
        .set_bold()
        .set_font_color("FFFFFF")
        .set_background_color("000099");
    let number = Format::new().set_num_format("#,##0.000;[Red](#,##0.000)");
    {
        let sh = w.add_worksheet();
        sh.set_name("Read me")?;
        sh.set_column_width(0, 100)?;
        for(r,t)in ["Inspection copy of the Rust calculation engine", "Public financials and Treasury observations remain separate from analyst assumptions.","Amounts are USD millions. Shares are millions except EPS. No live corporate bond quotes are included.","This is an external demonstration, not approved client advice or an official Rabobank application.","EBITDA is an unadjusted proxy: reported operating income plus reported D&A.","The workbook is an inspection export, not the application's working database.","Illustrative EPS may differ from reported EPS due to share-class allocations and rounding.","Acquisition fiscal years are not calendarized. PPA, one-off costs, timing and other EV adjustments are excluded.","Formula cells include cached results from the engine. Treasury reference stays fixed to the exported tenor.","Do not interpret personal data-provider access or an Excel download as onward-use permission."].iter().enumerate(){sh.write_string(r as u32,0,*t)?;}
        sh.write_string(
            11,
            0,
            format!(
                "Brief: {} / version {} / engine {}",
                b["title"].as_str().unwrap(),
                b["version"],
                b["model"]["engine"].as_str().unwrap()
            ),
        )?;
    }
    let mut refs = BTreeMap::new();
    {
        let sh = w.add_worksheet();
        sh.set_name("Assumptions")?;
        sh.set_column_width(0, 28)?;
        sh.set_column_width(1, 20)?;
        sh.write_string_with_format(0, 0, "Analyst assumption", &header)?;
        sh.write_string_with_format(0, 1, "Value", &header)?;
        for (i, (k, v)) in b["params"].as_object().unwrap().iter().enumerate() {
            let r = i as u32 + 1;
            sh.write_string(r, 0, k)?;
            sh.write_number_with_format(r, 1, v.as_f64().unwrap(), &number)?;
            refs.insert(k.to_string(), format!("'Assumptions'!B{}", r + 1));
        }
    }
    let mut frefs = BTreeMap::new();
    {
        let sh = w.add_worksheet();
        sh.set_name("Public facts")?;
        for (i, h) in [
            "Company",
            "Metric",
            "Value",
            "Unit",
            "Period end",
            "Filed",
            "XBRL tag",
            "Source",
        ]
        .iter()
        .enumerate()
        {
            sh.write_string_with_format(0, i as u16, *h, &header)?;
        }
        sh.set_column_width(0, 15)?;
        sh.set_column_width(1, 25)?;
        sh.set_column_width(2, 20)?;
        sh.set_column_width(3, 15)?;
        sh.set_column_width(4, 15)?;
        sh.set_column_width(5, 15)?;
        sh.set_column_width(6, 55)?;
        sh.set_column_width(7, 65)?;
        let mut r = 1;
        for c in data["companies"].as_array().unwrap() {
            for (k, v) in c["facts"].as_object().unwrap() {
                let value = crate::finance::fact(data, c["symbol"].as_str().unwrap(), k);
                sh.write_string(r, 0, c["symbol"].as_str().unwrap())?;
                sh.write_string(r, 1, k)?;
                sh.write_number_with_format(r, 2, value, &number)?;
                sh.write_string(
                    r,
                    3,
                    if v["unit"] == "USD/shares" {
                        "USD/share"
                    } else if v["unit"] == "shares" {
                        "m shares"
                    } else {
                        "USDm"
                    },
                )?;
                for (col, key) in [(4, "periodEnd"), (5, "filed"), (6, "tag"), (7, "sourceUrl")] {
                    sh.write_string(r, col, v[key].as_str().unwrap_or(""))?;
                }
                frefs.insert(
                    format!("{}:{k}", c["symbol"].as_str().unwrap()),
                    format!("'Public facts'!C{}", r + 1),
                );
                r += 1;
            }
        }
    }
    {
        let sh = w.add_worksheet();
        sh.set_name("Treasury curve")?;
        sh.set_column_width(0, 20)?;
        sh.set_column_width(1, 20)?;
        sh.write_string_with_format(0, 0, "Maturity (years)", &header)?;
        sh.write_string_with_format(0, 1, "Par yield (%)", &header)?;
        for (i, p) in data["curve"]["points"]
            .as_array()
            .unwrap()
            .iter()
            .enumerate()
        {
            sh.write_number(i as u32 + 1, 0, p["years"].as_f64().unwrap())?;
            sh.write_number(i as u32 + 1, 1, p["yield"].as_f64().unwrap())?;
        }
        sh.write_string(11, 0, data["curve"]["date"].as_str().unwrap())?;
        sh.write_string(12, 0, data["curve"]["sourceUrl"].as_str().unwrap())?;
        sh.write_string(14, 0, "Selected reference (%)")?;
        sh.write_number(
            14,
            1,
            b["model"]["references"]["benchmark"].as_f64().unwrap(),
        )?;
        sh.write_string(15, 0, "1-year cash yield (%)")?;
        sh.write_number(
            15,
            1,
            b["model"]["references"]["cashYield"].as_f64().unwrap(),
        )?;
    }
    let a = |k: &str| refs[k].clone();
    let f = |sym: &str, k: &str| frefs[&format!("{sym}:{k}")].clone();
    let kind = b["kind"].as_str().unwrap();
    let mut formulas: BTreeMap<usize, String> = BTreeMap::new();
    if kind == "bond" {
        formulas.insert(2, format!("='Treasury curve'!B15+{}/100", a("spread")));
        formulas.insert(
            3,
            format!("=PV(B4/200,{}*2,-{}/2,-100)", a("tenor"), a("coupon")),
        );
        formulas.insert(4, format!("={}*B5/100", a("amount")));
        formulas.insert(5, format!("={}*{}/10000", a("amount"), a("fees")));
        formulas.insert(6, "=B6-B7".into());
        formulas.insert(7, format!("={}*{}/100", a("amount"), a("coupon")));
    }
    if kind == "buyback" {
        formulas.insert(
            2,
            format!("={}/{}", f("PEP", "netIncome"), f("PEP", "shares")),
        );
        formulas.insert(3, format!("={}/{}", a("amount"), a("sharePrice")));
        formulas.insert(
            4,
            format!(
                "={}*'Treasury curve'!B16/100*(1-{}/100)",
                a("amount"),
                a("tax")
            ),
        );
        formulas.insert(5, format!("={}-B6", f("PEP", "netIncome")));
        formulas.insert(6, format!("={}-B5", f("PEP", "shares")));
        formulas.insert(7, "=B7/B8".into());
        formulas.insert(8, "=(B9/B4-1)*100".into());
        formulas.insert(9, format!("={}-{}", f("PEP", "cash"), a("amount")));
    }
    if kind == "acquisition" {
        formulas.insert(
            0,
            format!(
                "={}*{}*(1+{}/100)",
                a("targetShares"),
                a("targetPrice"),
                a("premium")
            ),
        );
        formulas.insert(1, format!("=B2+{}-{}", f("CPB", "debt"), f("CPB", "cash")));
        formulas.insert(
            2,
            format!("=B3/({}+{})", f("CPB", "operatingIncome"), f("CPB", "da")),
        );
        formulas.insert(3, format!("=B2*{}/100", a("debtPercent")));
        formulas.insert(4, "=B2-B5".into());
        formulas.insert(5, format!("='Treasury curve'!B15+{}/100", a("spread")));
        formulas.insert(6, "=B5*B7/100".into());
        formulas.insert(
            7,
            format!(
                "={}+{}+({}-B8-B6*'Treasury curve'!B16/100)*(1-{}/100)",
                f("PEP", "netIncome"),
                f("CPB", "netIncome"),
                a("synergies"),
                a("tax")
            ),
        );
        formulas.insert(8, format!("=B9/{}", f("PEP", "shares")));
        formulas.insert(
            9,
            format!(
                "=(B10/({}/{})-1)*100",
                f("PEP", "netIncome"),
                f("PEP", "shares")
            ),
        );
        formulas.insert(10, format!("={}+{}-B6", f("PEP", "cash"), f("CPB", "cash")));
        formulas.insert(
            11,
            format!("={}+{}+B5-B12", f("PEP", "debt"), f("CPB", "debt")),
        );
        formulas.insert(
            12,
            format!(
                "=B13/({}+{}+{}+{}+{})",
                f("PEP", "operatingIncome"),
                f("PEP", "da"),
                f("CPB", "operatingIncome"),
                f("CPB", "da"),
                a("synergies")
            ),
        );
    }
    {
        let sh = w.add_worksheet();
        sh.set_name("Calculations")?;
        for (i, h) in ["Calculation", "Engine / formula value", "Unit", "Method"]
            .iter()
            .enumerate()
        {
            sh.write_string_with_format(0, i as u16, *h, &header)?;
        }
        sh.set_column_width(0, 36)?;
        sh.set_column_width(1, 26)?;
        sh.set_column_width(2, 18)?;
        sh.set_column_width(3, 100)?;
        for (i, r) in b["model"]["workings"]
            .as_array()
            .unwrap()
            .iter()
            .enumerate()
        {
            let row = i as u32 + 1;
            sh.write_string(row, 0, r["label"].as_str().unwrap())?;
            let v = r["value"].as_f64().unwrap();
            if let Some(formula) = formulas.get(&i) {
                sh.write_formula_with_format(
                    row,
                    1,
                    Formula::new(formula).set_result(v.to_string()),
                    &number,
                )?;
            } else {
                sh.write_number_with_format(row, 1, v, &number)?;
            }
            sh.write_string(row, 2, r["unit"].as_str().unwrap())?;
            sh.write_string(row, 3, r["formula"].as_str().unwrap())?;
        }
    }
    {
        let sh = w.add_worksheet();
        sh.set_name("Review notes")?;
        sh.set_column_width(0, 15)?;
        sh.set_column_width(1, 90)?;
        for (i, n) in b["notes"].as_array().unwrap().iter().enumerate() {
            sh.write_number(i as u32, 0, n["slide"].as_f64().unwrap() + 1.)?;
            sh.write_string(i as u32, 1, n["body"].as_str().unwrap())?;
            sh.write_string(i as u32, 2, n["state"].as_str().unwrap())?;
        }
    }
    w.save_to_buffer()
}
