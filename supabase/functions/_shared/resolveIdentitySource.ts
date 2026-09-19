export type PortalUserRow = { person_id: string | null; is_active: boolean } | null;

/**
 * M1: decide whether a portal_users row is authoritative for identity.
 *
 * portal_users.auth_user_id -> person_id is an unambiguous link when it
 * exists, is active, and actually names a person. Institutional-contact
 * rows have a null person_id by design (they aren't document-uploading
 * clients) and inactive rows must not authorize anything — both fall
 * through to the caller's email-merge fallback instead.
 */
export function shouldUsePortalUserPersonId(row: PortalUserRow): boolean {
  return !!(row && row.is_active && row.person_id);
}
