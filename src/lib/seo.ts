/**
 * Normalize a path to its canonical, extensionless, no-trailing-slash form so that
 * canonical tags match the URL Cloudflare actually serves.
 *
 * `build.format: 'file'` makes `Astro.url.pathname` include the `.html` extension during
 * prerender (e.g. `/discover.html`), even though the deployed page is served at `/discover`.
 * Strip that extension, then strip any trailing slash (except root).
 */
export const normalizePath = (pathname: string): string => {
  const withoutHtml = pathname.endsWith(".html") ? pathname.slice(0, -".html".length) : pathname;
  return withoutHtml.length > 1 && withoutHtml.endsWith("/")
    ? withoutHtml.slice(0, -1)
    : withoutHtml;
};

export const absoluteUrl = (site: URL | string, pathname: string): string =>
  new URL(normalizePath(pathname), site).href;
