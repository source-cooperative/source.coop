export const getExtension = (object_path: string): string | undefined => {
  const parts = object_path.split(".");
  if (parts.length > 1) {
    return parts.pop()?.toLowerCase();
  }
  return undefined;
};
