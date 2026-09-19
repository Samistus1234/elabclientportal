export type CaseRow = { id: string; status: string };

/**
 * Pick the case an upload belongs to, or null to leave it for staff to file.
 *
 * Only `active` cases count. With zero or several, return null: guessing
 * among a client's open applications files the document against the wrong one,
 * which is worse than leaving it unfiled.
 */
export function resolveCaseId(rows: CaseRow[]): string | null {
  if (!Array.isArray(rows)) return null;
  const active = rows.filter((r) => r.status === "active");
  return active.length === 1 ? active[0].id : null;
}
