import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { hasUnsafePathSegments } from "./hasUnsafePathSegments.ts";

Deno.test("allows a normal issued path", () => {
  const personId = "11111111-1111-1111-1111-111111111111";
  assertEquals(hasUnsafePathSegments(`${personId}/${crypto.randomUUID()}-passport.pdf`), false);
});

Deno.test("rejects a parent-directory traversal segment", () => {
  const myId = "11111111-1111-1111-1111-111111111111";
  const victimId = "22222222-2222-2222-2222-222222222222";
  assertEquals(hasUnsafePathSegments(`${myId}/../${victimId}/x.pdf`), true);
});

Deno.test("rejects a doubled separator", () => {
  assertEquals(hasUnsafePathSegments("11111111-1111-1111-1111-111111111111//x.pdf"), true);
});

Deno.test("rejects .. embedded without surrounding slashes", () => {
  assertEquals(hasUnsafePathSegments("11111111-1111-1111-1111-111111111111/..x.pdf"), true);
});

Deno.test("rejects a bare filename with no person prefix at all", () => {
  // Not this function's job to enforce the prefix (that's a separate check),
  // but it must not itself flag a safe-looking bare name as unsafe.
  assertEquals(hasUnsafePathSegments("passport.pdf"), false);
});
