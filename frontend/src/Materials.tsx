import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  Bold,
  Check,
  ChevronDown,
  Download,
  FileText,
  Italic,
  LayoutTemplate,
  List,
  Plus,
  Presentation,
  Quote,
  Save,
  Type,
  Undo2,
} from "lucide-react";
import type { Brief, Data, Material, Section } from "./types";
import { format, LABELS, number } from "./types";
import { Chart, CompanyTable, Metrics } from "./Analysis";
import { richHTML } from "./export";

function RichEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (body: Section["body"]) => void;
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          link: false,
          codeBlock: false,
        }),
      ],
      content: section.body,
      onUpdate: ({ editor }) => onChange(editor.getJSON()),
      editorProps: {
        attributes: {
          "aria-label": "Client narrative editor",
          class: "client-editor",
        },
      },
    },
    [section.id],
  );
  useEffect(() => {
    if (
      editor &&
      !editor.isDestroyed &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(section.body)
    )
      editor.commands.setContent(section.body, { emitUpdate: false });
  }, [section.body, editor]);
  if (!editor) return null;
  return (
    <div className="rich-editor">
      <div className="format-toolbar">
        <button
          title="Paragraph"
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Type size={15} />
          <ChevronDown size={11} />
        </button>
        <span />
        <button
          title="Bold"
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </button>
        <button
          title="Italic"
          aria-pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </button>
        <button
          title="Heading"
          aria-pressed={editor.isActive("heading")}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </button>
        <button
          title="Bullet list"
          aria-pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </button>
        <button
          title="Block quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </button>
        <span />
        <button
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </button>
        <small>Tiptap editor</small>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
export function BoundContent({
  section,
  analyses,
  data,
  onSource,
}: {
  section: Section;
  analyses: Brief[];
  data: Data;
  onSource?: () => void;
}) {
  const linked = section.linkedAnalyses
    .map((id) => analyses.find((a) => a.id === id))
    .filter((a): a is Brief => !!a);
  if (section.layout === "companies")
    return (
      <div className="bound-content">
        <div className="binding-label">
          <span className="binding-dot" />
          Reported financials · SEC EDGAR{" "}
          <button onClick={onSource}>Inspect evidence ↗</button>
        </div>
        <CompanyTable data={data} />
        <p className="bound-footnote">
          Fiscal years differ; not calendarized. Click Sources for definitions
          and filing references.
        </p>
      </div>
    );
  if (section.layout === "sources")
    return (
      <div className="material-sources">
        <div>
          <span>01</span>
          <p>
            <strong>Reported company financials</strong>SEC EDGAR annual filings
            for PepsiCo, Campbell’s and General Mills. Each fact retains its
            tag, period and filing reference.
          </p>
        </div>
        <div>
          <span>02</span>
          <p>
            <strong>Dated market benchmark</strong>U.S. Treasury par yield
            curve, {data.curve.date}. Issuer credit spreads and equity prices
            are analyst assumptions.
          </p>
        </div>
        <div>
          <span>03</span>
          <p>
            <strong>Financial conventions</strong>Unadjusted EBITDA proxy;
            historical full-period EPS exercises; no LTM, PPA or
            transaction-execution assessment.
          </p>
        </div>
      </div>
    );
  if (!linked.length) return null;
  if (section.layout === "comparison")
    return (
      <div className="comparison-block">
        {linked.map((a) => (
          <div className="comparison-item" key={a.id}>
            <span>{LABELS[a.kind]}</span>
            <strong>
              {format(a.model.metrics[0].value, a.model.metrics[0].unit)}
            </strong>
            <small>{a.model.metrics[0].label}</small>
            <p>{a.model.summary}</p>
            <div className="binding-label">
              <span className="binding-dot" />
              Linked to analysis v{a.version}
            </div>
          </div>
        ))}
      </div>
    );
  return (
    <div className="bound-content">
      {linked.map((a) => (
        <div key={a.id}>
          <div className="binding-label">
            <span className="binding-dot" />
            {LABELS[a.kind]} · linked analysis v{a.version}
            <span>Figures update from the financial model</span>
          </div>
          <p className="linked-summary">{a.model.summary}</p>
          <Metrics brief={a} />
          <div className="material-analysis">
            <div>
              <h4>{a.model.chart.label}</h4>
              <Chart brief={a} />
            </div>
            <div>
              <h4>Discussion points</h4>
              {a.model.conclusions.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Materials({
  material,
  analyses,
  data,
  page,
  setPage,
  onChange,
  onSave,
  onSource,
  saving,
  dirty,
  present,
  setPresent,
  readonly = false,
}: {
  material: Material;
  analyses: Brief[];
  data: Data;
  page: number;
  setPage: (i: number) => void;
  onChange: (m: Material) => void;
  onSave: () => void;
  onSource: () => void;
  saving: boolean;
  dirty: boolean;
  present: boolean;
  setPresent: (b: boolean) => void;
  readonly?: boolean;
}) {
  const section = material.sections[page];
  const update = (part: Partial<Section>) =>
    onChange({
      ...material,
      sections: material.sections.map((s, i) =>
        i === page ? { ...s, ...part } : s,
      ),
    });
  useEffect(() => {
    if (!present) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresent(false);
      if (e.key === "ArrowRight") setPage(Math.min(5, page + 1));
      if (e.key === "ArrowLeft") setPage(Math.max(0, page - 1));
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [present, page, setPage, setPresent]);
  return (
    <div className={`materials-layout ${present ? "presentation-mode" : ""}`}>
      {present && <button className="btn preview-exit" onClick={() => setPresent(false)}><ArrowLeft size={14}/>Back to workspace</button>}
      <aside className="material-outline">
        <div className="section-heading">
          <span>CLIENT MATERIALS</span>
          <span>6 sections</span>
        </div>
        {material.sections.map((s, i) => (
          <button
            key={s.id}
            className={`outline-item ${i === page ? "selected" : ""}`}
            onClick={() => setPage(i)}
          >
            <span className={`page-thumb thumb-${s.layout}`}>
              <i />
              {s.layout !== "narrative" && <b />}
            </span>
            <span>
              <small>{String(i + 1).padStart(2, "0")}</small>
              {s.title}
              <em>
                {s.linkedAnalyses.length
                  ? `${s.linkedAnalyses.length} linked ${s.linkedAnalyses.length === 1 ? "analysis" : "analyses"}`
                  : s.layout === "companies"
                    ? "Reported financials"
                    : s.layout === "sources"
                      ? "Evidence & conventions"
                      : "Narrative"}
              </em>
            </span>
          </button>
        ))}
        <div className="outline-help">
          <LayoutTemplate size={16} />
          <p>
            Firm-style digital briefing
            <br />
            <strong>Myriad typography · navy / orange</strong>
          </p>
        </div>
      </aside>
      <div className="material-canvas">
        <div className="material-toolbar">
          <span>
            <span className="binding-dot" />
            {readonly
              ? "Saved review copy"
              : dirty
                ? "Unsaved narrative changes"
                : "All changes saved"}
            <small> · {page + 1} of 6</small>
          </span>
          <div>
            {!readonly && (
              <button
                className="btn small-btn"
                disabled={!dirty || saving}
                onClick={onSave}
              >
                <Save size={13} />
                {saving ? "Saving…" : "Save draft"}
              </button>
            )}
            <button
              className="btn small-btn"
              onClick={() => setPresent(!present)}
            >
              {present ? <AlignLeft size={14} /> : <Presentation size={14} />}{" "}
              {present ? "Exit preview" : "Preview"}
            </button>
          </div>
        </div>
        <article className="material-paper">
          <div className="paper-eyebrow">
            PEPSICO · STRATEGIC ADVISORY <span>Rabobank</span>
          </div>
          {readonly || present ? (
            <h2>{section.title}</h2>
          ) : (
            <input
              className="editable-title"
              aria-label="Material section title"
              value={section.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          )}
          <div className="paper-rule" />
          {readonly || present ? (
            <div
              className="rich-read"
              dangerouslySetInnerHTML={{ __html: richHTML(section.body) }}
            />
          ) : (
            <RichEditor
              section={section}
              onChange={(body) => update({ body })}
            />
          )}
          <BoundContent
            section={section}
            analyses={analyses}
            data={data}
            onSource={onSource}
          />
          {!present && !readonly && (
            <div className="block-options">
              <label>
                Content block
                <select
                  aria-label="Material content block"
                  value={section.layout}
                  onChange={(e) =>
                    update({ layout: e.target.value as Section["layout"] })
                  }
                >
                  <option value="comparison">Scenario comparison</option>
                  <option value="analysis">Financial analysis</option>
                  <option value="companies">Company financials</option>
                  <option value="sources">Sources & conventions</option>
                  <option value="narrative">Narrative only</option>
                </select>
              </label>
              {["comparison", "analysis"].includes(section.layout) && (
                <div className="link-options">
                  {analyses.map((a) => (
                    <label key={a.id}>
                      <input
                        type="checkbox"
                        checked={section.linkedAnalyses.includes(a.id)}
                        onChange={(e) =>
                          update({
                            linkedAnalyses: e.target.checked
                              ? [...section.linkedAnalyses, a.id]
                              : section.linkedAnalyses.filter(
                                  (id) => id !== a.id,
                                ),
                          })
                        }
                      />
                      {LABELS[a.kind]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="paper-footer">
            <span>
              {String(page + 1).padStart(2, "0")} · {material.title}
            </span>
            <span>Public-source discussion · indicative scenarios</span>
          </div>
        </article>
        <div className="paper-navigation">
          <span>
            {present
              ? "Esc returns to the workspace"
              : "Narrative is editable. Linked figures are calculated from the financial model."}
          </span>
          <div>
            <button
              aria-label="Previous material section"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ArrowLeft size={15} />
            </button>
            <span>{page + 1} / 6</span>
            <button
              aria-label="Next material section"
              disabled={page === 5}
              onClick={() => setPage(page + 1)}
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
