import type { JSONContent } from "@tiptap/react";
export type Kind = "bond" | "buyback" | "acquisition";
export type Working = {
  label: string;
  value: number;
  unit: string;
  formula: string;
};
export type Brief = {
  id: string;
  kind: Kind;
  title: string;
  version: number;
  currentVersion: number;
  params: Record<string, number>;
  model: {
    title: string;
    summary: string;
    engine: string;
    metrics: (Working & { key: string })[];
    workings: Working[];
    sensitivity: { label: string; value: number; secondary: number }[];
    chart: {
      type: string;
      label: string;
      points?: { years: number; yield: number }[];
      items?: { label: string; value: number }[];
    };
    warnings: string[];
    conclusions: string[];
  };
  notes: {
    id: string;
    slide: number;
    body: string;
    state: string;
    createdAt: string;
  }[];
  versions: { version: number; createdAt: string }[];
  editorial: Record<string, unknown>;
  frozen: boolean;
  createdAt: string;
};
export type Fact = {
  value: number;
  unit: string;
  periodEnd: string;
  periodStart?: string;
  filed: string;
  tag: string;
  sourceUrl: string;
  accession: string;
  basis: string;
};
export type Data = {
  asOf: string;
  companies: {
    symbol: string;
    name: string;
    fiscalYear: number;
    periodEnd: string;
    facts: Record<string, Fact>;
  }[];
  curve: {
    date: string;
    sourceUrl: string;
    points: { years: number; yield: number }[];
  };
};
export type Section = {
  id: string;
  title: string;
  body: JSONContent;
  layout: "comparison" | "companies" | "analysis" | "sources" | "narrative";
  linkedAnalyses: string[];
};
export type Material = {
  title: string;
  sections: Section[];
  generatedFrom: Record<string, number>;
};
export type Project = {
  id: string;
  title: string;
  client: string;
  objective: string;
  dueDate: string;
  createdAt: string;
  revision: number;
  document: Material;
  analyses: Brief[];
  history: { revision: number; createdAt: string }[];
  snapshots: { id: string; createdAt: string }[];
};
export type ReviewCopy = {
  id: string;
  projectId: string;
  title: string;
  client: string;
  revision: number;
  document: Material;
  analyses: Brief[];
  sourceAsOf: string;
  createdAt: string;
};
export type Capabilities = {
  ai: boolean;
  quotes: boolean;
  textModel: string;
  voiceModel: string;
};
export const LABELS: Record<Kind, string> = {
  bond: "Bond financing",
  buyback: "Share repurchase",
  acquisition: "Peer acquisition",
};
export const INPUTS: Record<string, [string, string, number]> = {
  amount: ["Transaction amount", "USDm", 50],
  tenor: ["Tenor", "years", 1],
  spread: ["Credit spread", "bps", 25],
  coupon: ["Annual coupon", "%", 0.25],
  fees: ["Issue fees", "bps", 5],
  sharePrice: ["Execution price", "USD / share", 5],
  tax: ["Marginal tax rate", "%", 1],
  targetPrice: ["Target share price", "USD / share", 1],
  targetShares: ["Deal share count", "million", 1],
  premium: ["Offer premium", "%", 5],
  synergies: ["Annual pre-tax synergies", "USDm", 25],
  debtPercent: ["Debt funding", "%", 5],
};
export const number = (v: number, d = 1) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export const format = (v: number, u: string) =>
  u === "USDm"
    ? Math.abs(v) >= 1000
      ? `$${number(v / 1000, 2)}bn`
      : `$${number(v, 1)}m`
    : u === "%"
      ? `${number(v, 2)}%`
      : u === "x"
        ? `${number(v, 2)}x`
        : u === "USD/share"
          ? `$${number(v, 2)}`
          : u === "m shares"
            ? `${number(v, 2)}m`
            : u === "bps"
              ? `${number(v, 0)} bps`
              : `${number(v, 2)}${u === "per 100" ? " / 100" : ""}`;
