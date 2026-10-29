/**
 * Which store a directory looks like, judged only from the names one delimiter
 * listing of it returns: its direct objects and child prefixes, both relative to
 * the directory and without trailing slashes. Every store announces itself at
 * its own root, so this needs no requests beyond the listing and can run on any
 * directory at any depth. A hit is only a hint — `probeStore` still decides
 * whether the store is renderable.
 *
 * The result is the extension `probeStore` expects.
 */
export function storeFormatFromListing({
  objects,
  directories,
}: {
  objects: string[];
  directories: string[];
}): "icechunk" | "zarr" | null {
  const has = (name: string) => objects.includes(name);
  const hasDir = (name: string) => directories.includes(name);

  // Icechunk 2.x keeps a `repo` info object at the root; the legacy layout has
  // only `refs/`. Both keep snapshots under `snapshots/`.
  if (hasDir("snapshots") && (has("repo") || hasDir("refs"))) {
    return "icechunk";
  }
  if (has("zarr.json") || has(".zmetadata") || has(".zgroup") || has(".zarray")) {
    return "zarr";
  }
  return null;
}
