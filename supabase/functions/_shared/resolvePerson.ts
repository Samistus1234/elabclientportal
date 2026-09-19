export type PersonRow = { id: string };

/**
 * Decide which person a client's email belongs to.
 *
 * Fails closed on ambiguity: with zero or several matches this returns null
 * and the caller must refuse the upload. Picking the first of several rows
 * would file a client's passport against a stranger's application.
 */
export function resolvePersonId(rows: PersonRow[]): string | null {
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  return rows[0].id ?? null;
}
