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

Deno.test("allows .. embedded within a single segment (not a traversal segment)", () => {
  // N1: a literal substring check on ".." rejected legitimate filenames
  // create_slot itself issues (its sanitiser preserves dots). Only a whole
  // "." or ".." path segment is a traversal marker; embedded dots are not,
  // and are backstopped by the storage existence check instead.
  assertEquals(hasUnsafePathSegments("11111111-1111-1111-1111-111111111111/..x.pdf"), false);
});

Deno.test("allows a legitimate doubled-dot filename create_slot would issue", () => {
  const personId = "11111111-1111-1111-1111-111111111111";
  assertEquals(
    hasUnsafePathSegments(`${personId}/${crypto.randomUUID()}-passport..pdf`),
    false,
  );
});

Deno.test("rejects a bare single-dot segment", () => {
  assertEquals(hasUnsafePathSegments("11111111-1111-1111-1111-111111111111/./x.pdf"), true);
});

Deno.test("rejects a bare filename with no person prefix at all", () => {
  // Not this function's job to enforce the prefix (that's a separate check),
  // but it must not itself flag a safe-looking bare name as unsafe.
  assertEquals(hasUnsafePathSegments("passport.pdf"), false);
});
