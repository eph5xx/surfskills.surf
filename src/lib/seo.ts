/** Strip trailing slash (except root) for canonical URLs and sitemap entries. */
export const normalizePath = (pathname: string): string =>
  pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

export const absoluteUrl = (site: URL | string, pathname: string): string =>
  new URL(normalizePath(pathname), site).href;
