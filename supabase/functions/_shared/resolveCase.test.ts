import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { resolveCaseId } from "./resolveCase.ts";

Deno.test("resolveCaseId: exactly one active case attaches", () => {
  assertEquals(resolveCaseId([{ id: "c1", status: "active" }]), "c1");
});

Deno.test("resolveCaseId: two active cases leave it unfiled", () => {
  assertEquals(
    resolveCaseId([{ id: "c1", status: "active" }, { id: "c2", status: "active" }]),
    null,
  );
});

Deno.test("resolveCaseId: non-active statuses are ignored", () => {
  assertEquals(
    resolveCaseId([
      { id: "c1", status: "completed" },
      { id: "c2", status: "cancelled" },
      { id: "c3", status: "on_hold" },
      { id: "c4", status: "active" },
    ]),
    "c4",
  );
});

Deno.test("resolveCaseId: no active case leaves it unfiled", () => {
  assertEquals(resolveCaseId([{ id: "c1", status: "completed" }]), null);
});

Deno.test("resolveCaseId: empty input leaves it unfiled", () => {
  assertEquals(resolveCaseId([]), null);
});
