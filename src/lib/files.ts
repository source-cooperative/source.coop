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
