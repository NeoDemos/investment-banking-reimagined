import type { Brief, Data, Material, Section } from "./types";
import { format, LABELS, number } from "./types";
export function richHTML(node: Section["body"]): string {
  const esc = (v: unknown) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  if (node.type === "text") {
    let s = esc(node.text);
    for (const mark of node.marks || []) {
      const tag = (
        {
          bold: "strong",
          italic: "em",
          strike: "s",
          code: "code",
          underline: "u",
        } as Record<string, string>
      )[mark.type];
      if (tag) s = `<${tag}>${s}</${tag}>`;
    }
    return s;
  }
  const tag =
    (
      {
        doc: "div",
        paragraph: "p",
        heading: node.attrs?.level === 2 ? "h2" : "h3",
        bulletList: "ul",
        orderedList: "ol",
        listItem: "li",
        blockquote: "blockquote",
        hardBreak: "br",
        horizontalRule: "hr",
      } as Record<string, string>
    )[node.type || ""] || "div";
  return `<${tag}>${(node.content || []).map(richHTML).join("")}</${tag}>`;
}

export async function exportMaterial(
  projectTitle: string,
  material: Material,
  analyses: Brief[],
  data: Data,
  revision: number,
) {
  const esc = (s: unknown) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const sourceTables = `<table><thead><tr><th>Company</th><th>Metric</th><th>Reported value</th><th>Period / filed</th><th>Source</th></tr></thead><tbody>${data.companies.flatMap((c) => Object.entries(c.facts).map(([k, f]) => `<tr><td>${esc(c.name)}</td><td>${esc(k)}</td><td>${esc(f.value)} ${esc(f.unit)}</td><td>${esc(f.periodEnd)} / ${esc(f.filed)}</td><td><a href="${esc(f.sourceUrl)}">${esc(f.tag)}</a></td></tr>`)).join("")}</tbody></table>`;
  const sections = material.sections
    .map(
      (s, i) =>
        `<section><span class="eyebrow">${String(i + 1).padStart(2, "0")} · CLIENT DISCUSSION</span><h2>${esc(s.title)}</h2>${richHTML(s.body)}${
          s.layout === "companies"
            ? sourceTables
            : s.layout === "sources"
              ? `<p>SEC annual filings and <a href="${esc(data.curve.sourceUrl)}">Treasury curve ${esc(data.curve.date)}</a>. Financial and transaction assumptions require review.</p>`
              : s.linkedAnalyses
                  .map((id) => {
                    const a = analyses.find((a) => a.id === id)!;
                    return `<div class="model"><h3>${esc(LABELS[a.kind])} · analysis v${a.version}</h3><p>${esc(a.model.summary)}</p><div class="metrics">${a.model.metrics
                      .slice(0, 3)
                      .map(
                        (m) =>
                          `<div><strong>${esc(format(m.value, m.unit))}</strong><small>${esc(m.label)}</small></div>`,
                      )
                      .join(
                        "",
                      )}</div><table>${a.model.workings.map((w) => `<tr><td>${esc(w.label)}</td><td>${esc(format(w.value, w.unit))}</td><td>${esc(w.formula)}</td></tr>`).join("")}</table></div>`;
                  })
                  .join("")
        }<footer>${i + 1} · ${esc(projectTitle)} · material revision ${revision}<span>Rabobank · External prototype</span></footer></section>`,
    )
    .join("");
  const audit = analyses
    .map(
      (a) =>
        `<h3>${esc(LABELS[a.kind])} · v${a.version}</h3><table>${Object.entries(
          a.params,
        )
          .map(
            ([k, v]) => `<tr><td>${esc(k)}</td><td>${number(v, 2)}</td></tr>`,
          )
          .join(
            "",
          )}</table>${a.model.warnings.map((w) => `<p>${esc(w)}</p>`).join("")}`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(material.title)}</title><style>@font-face{font-family:Brand;src:local('Myriad')}@font-face{font-family:Brand;src:local('Myriad Light');font-weight:300}*{box-sizing:border-box}body{font:16px/1.6 Brand,'Source Sans 3',Arial,sans-serif;margin:0;background:#f1f2f5;color:#454653}header,section,.audit{max-width:1120px;margin:24px auto;background:white;padding:52px 64px}header{background:#000099;color:white}h1{font-size:44px;font-weight:300}h2{font-size:36px;font-weight:300;color:#000099}h3{font-weight:500;color:#000099}.eyebrow{font:11px Arial;letter-spacing:2px;color:#0058ff}.metrics{display:flex;gap:40px;margin:28px 0}.metrics>div{flex:1}.metrics strong{font-size:36px;color:#ff6500;font-weight:300;display:block}.metrics small{display:block;font-size:12px;color:#0058ff}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:10px;border-bottom:1px solid #eee;vertical-align:top;overflow-wrap:anywhere}td:last-child{max-width:350px;color:#83858e}footer{display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:20px;margin-top:40px;font-size:11px;color:#888}.model{margin:30px 0}a{color:#0058ff}@media print{body{background:white}header,section,.audit{margin:0;max-width:none;break-after:page}section{padding:30px}table{font-size:10px}@page{size:A4 landscape;margin:15mm}}@media(max-width:600px){header,section,.audit{padding:24px;margin:12px}.metrics{display:block}.metrics>div{margin:20px 0}table{font-size:10px}h2{font-size:28px}}</style><header><span class="eyebrow" style="color:#b7cbff">RABOBANK · BANKING STUDIO</span><h1>${esc(material.title)}</h1><p>Public-data client discussion · material revision ${revision} · source snapshot ${esc(data.asOf)}</p><small>External prototype. Financial outputs are indicative scenarios, not approved client advice or executable prices.</small></header>${sections}<div class="audit"><h2>Source & assumption audit</h2>${sourceTables}${audit}</div></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-r${revision}.html`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
