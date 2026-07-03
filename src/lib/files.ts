export const getExtension = (object_path: string): string | undefined => {
  const parts = object_path.split('/').pop()?.split(".");
  if (parts && parts.length > 1) {
    const extension = parts.pop()
    if (extension) {
      // extension is a non-empty string, return it in lowercase
      return extension.toLowerCase();
    }
  }
  return undefined;
};

// Directory-shaped datasets (object-key prefixes, not single files) that have an
// external viewer. A path whose last segment carries one of these suffixes —
// e.g. `gfs.icechunk`, `foo/bar.zarr` — is previewed like a file rather than
// listed as a directory of its internal chunk objects.
export const STORE_EXTENSIONS = ["zarr", "icechunk"] as const;

export const isViewableStorePath = (object_path: string): boolean => {
  // A store prefix is often addressed with a trailing slash (e.g. `store.zarr/`),
  // which would otherwise leave getExtension inspecting an empty last segment.
  const ext = getExtension(object_path.replace(/\/$/, ""));
  return ext ? (STORE_EXTENSIONS as readonly string[]).includes(ext) : false;
};
