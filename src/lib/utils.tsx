export function humanFileSize(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
}

export function setCachedFeaturedRepositories(repositories?) {
  const now = Math.floor(Date.now() / 1000);
  if (repositories) {
    sessionStorage.setItem(
      "cached_featured",
      JSON.stringify({
        cached: now,
        repositories: repositories,
      })
    );
  } else {
    sessionStorage.removeItem("cached_featured");
  }
}

export function getCachedFeaturedRepositories() {
  const TTL = 60 * 5; // Refresh cache after 5 minutes

  if (!sessionStorage.getItem("cached_featured")) {
    return null;
  }

  const featured = JSON.parse(sessionStorage.getItem("cached_featured"));
  const now = Math.floor(Date.now() / 1000);
  if (now - featured.cached >= TTL) {
    setCachedFeaturedRepositories(null);
    return null;
  }

  return featured.repositories;
}

export function setCachedRepository(repository?) {
  const now = Math.floor(Date.now() / 1000);
  if (repository) {
    sessionStorage.setItem(
      "cached_repository",
      JSON.stringify({
        cached: now,
        repository: repository,
      })
    );
  } else {
    sessionStorage.removeItem("cached_repository");
  }
}

export function getCachedRepository() {
  const TTL = 60 * 10; // Refresh cache after 10 minutes

  if (!sessionStorage.getItem("cached_repository")) {
    return null;
  }

  const featured = JSON.parse(sessionStorage.getItem("cached_repository"));
  const now = Math.floor(Date.now() / 1000);
  if (now - featured.cached >= TTL) {
    setCachedRepository(null);
    return null;
  }

  return featured.repository;
}

export function getFormValues({ e, form }) {
  let body;

  if (form && form instanceof HTMLFormElement) {
    const formData = new FormData(form);

    // map the entire form data to JSON for the request body
    body = Object.fromEntries(formData);
    const method = e.currentTarget;
    body = {
      ...body,
      ...{ [method.name]: method.value },
    };
  }

  return body;
}

export function convertToNumber(input: string | string[]): number {
  if (typeof input === "string") {
    // If input is a string, directly parse it to a number
    return parseFloat(input);
  } else if (Array.isArray(input)) {
    // If input is an array, join it into a single string and then parse
    return parseFloat(input.join(""));
  } else {
    // If input is neither a string nor an array, throw an error
    throw new Error("Invalid input type");
  }
}
