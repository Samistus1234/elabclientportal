import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { shouldUsePortalUserPersonId } from "./resolveIdentitySource.ts";

Deno.test("shouldUsePortalUserPersonId: active row with a person_id is authoritative", () => {
  assertEquals(shouldUsePortalUserPersonId({ person_id: "abc-123", is_active: true }), true);
});

Deno.test("shouldUsePortalUserPersonId: no portal_users row falls back to email", () => {
  assertEquals(shouldUsePortalUserPersonId(null), false);
});

Deno.test("shouldUsePortalUserPersonId: inactive row falls back to email even with a person_id", () => {
  assertEquals(shouldUsePortalUserPersonId({ person_id: "abc-123", is_active: false }), false);
});

Deno.test("shouldUsePortalUserPersonId: institutional_contact row (null person_id) falls back to email", () => {
  assertEquals(shouldUsePortalUserPersonId({ person_id: null, is_active: true }), false);
});
