import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { resolvePersonId } from "./resolvePerson.ts";

Deno.test("resolvePersonId: exactly one match returns its id", () => {
  assertEquals(resolvePersonId([{ id: "p1" }]), "p1");
});

Deno.test("resolvePersonId: no match returns null", () => {
  assertEquals(resolvePersonId([]), null);
});

Deno.test("resolvePersonId: multiple matches fail closed", () => {
  assertEquals(resolvePersonId([{ id: "p1" }, { id: "p2" }]), null);
});

Deno.test("resolvePersonId: null input fails closed", () => {
  assertEquals(resolvePersonId(null as unknown as { id: string }[]), null);
});
