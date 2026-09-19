// F1: a committed storage path must be exactly what create_slot issued.
// A ".." or a doubled "//" can pass a naive startsWith(personId + "/")
// check while still normalising into another person's prefix.
export function hasUnsafePathSegments(path: string): boolean {
  return path.includes("..") || path.includes("//");
}
