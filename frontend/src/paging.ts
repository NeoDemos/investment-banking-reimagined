import { api } from "./api";
type J = Record<string, any>;
/** Collect a fixed local snapshot in bounded pages; never call a partial log complete. */
export async function completeSnapshot(
  path: string,
  key: "observations" | "copies",
) {
  let before: number | undefined,
    maxId: number | undefined,
    first: J | undefined;
  const records: J[] = [];
  const seen = new Set<string>();
  while (true) {
    const query = new URLSearchParams({ limit: "100" });
    if (maxId !== undefined) query.set("maxId", String(maxId));
    if (before !== undefined) query.set("before", String(before));
    const page = await api<J>(`${path}?${query}`);
    if (!first) {
      first = page;
      maxId = page.maxId;
    } else if (page.maxId !== maxId)
      throw new Error(
        "The export snapshot changed; no incomplete export was created.",
      );
    for (const row of page[key]) {
      if (seen.has(row.id))
        throw new Error(
          "A duplicate row interrupted export; refresh and retry.",
        );
      seen.add(row.id);
      records.push(row);
    }
    if (page.nextCursor == null) break;
    if (before !== undefined && page.nextCursor >= before)
      throw new Error("Invalid cursor; export stopped.");
    before = page.nextCursor;
  }
  const total =
    key === "observations" ? first!.summary.enteredPairs : first!.totalStored;
  if (records.length !== total)
    throw new Error(
      "The full count could not be reconciled; no partial export was created.",
    );
  return {
    ...first,
    [key]: records,
    exportScope: "Complete fixed snapshot, including quality failures",
    exportedCount: records.length,
    nextCursor: null,
  };
}
