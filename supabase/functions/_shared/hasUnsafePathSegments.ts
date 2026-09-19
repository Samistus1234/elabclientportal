// F1: a committed storage path must be exactly what create_slot issued.
// A bare ".." or "." PATH SEGMENT (not just the substring "..") or an empty
// segment (from a doubled "//") can pass a naive startsWith(personId + "/")
// check while still normalising into another person's prefix.
//
// N1 (round 2): a literal substring check on ".." also rejected legitimate
// filenames create_slot itself issues, since its sanitiser preserves dots
// (e.g. "passport..pdf" -> issued, then rejected here at commit). Splitting
// on "/" and checking whole segments catches the traversal case
// ("myId/../victimId/x.pdf") and the doubled-separator case ("myId//x.pdf")
// without flagging a dotted filename that just happens to contain "..".
// Embedded ".." inside a single segment (e.g. "myId/foo..bar.pdf") is left
// to the storage existence check, which is the real backstop for anything
// that isn't an actual issued+uploaded object.
export function hasUnsafePathSegments(path: string): boolean {
  return path.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}
