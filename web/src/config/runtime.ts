function normalizeBasePath(basePath: string | null | undefined): string {
  const value = (basePath ?? "").trim();

  if (!value || value === "/") {
    return "";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function readBasePath(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const value = document
    .querySelector<HTMLMetaElement>('meta[name="gowa-base-path"]')
    ?.getAttribute("content");

  return normalizeBasePath(value);
}

export const appBasePath = readBasePath();

export function withBasePath(path: string): string {
  if (!appBasePath) {
    return path;
  }

  if (path === "/") {
    return `${appBasePath}/`;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appBasePath}${normalizedPath}`;
}
