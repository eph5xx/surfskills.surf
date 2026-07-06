// Shared, framework-free engine for the Discover directory shells.
//
// It is FACET-AGNOSTIC: it discovers facet groups from the DOM rather than knowing
// about "audience" / "kind" / "task" by name. Adding a new field is therefore a data
// change (one line in FACET_REGISTRY in directory.ts) — never an engine change.
//
// Contract
//   root        [data-directory]
//   items       [data-dir-item] inside one or more [data-dir-list]; each carries
//               data-facet-<key> (comma-joined values) for every facet, plus
//               data-title/-blurb/-author/-collection/-stars/-updated.
//               (Legacy shells using data-audiences/-kind/-tasks still work.)
//   groups      [data-dir-group] — optional section wrapper, hidden when it has no
//               visible items.
//   controls    [data-dir-search] (input), [data-dir-sort] (select),
//               [data-dir-facet="<key>"][data-value] (button OR input;
//               data-dir-mode="single|multi", default multi), [data-dir-clear].
//   facet UX    [data-dir-facet-count] inside a control → live "result count" text;
//               [data-dir-facet-search][data-dir-target="<key>"] → filter that
//               group's options by text.
//   feedback    [data-dir-count] (visible items), [data-dir-empty], [data-dir-active]
//               (engine renders removable chips here for every active value).

type SortKey = "newest" | "stars" | "title";

const ACTIVE_CLASS = "is-active";

// Results are paged client-side (the engine already holds the full sorted/filtered
// set, so paging is just a window over it). Overridable per shell via
// [data-directory][data-dir-page-size].
const PER_PAGE_DEFAULT = 12;

// Fallback for shells that predate the generic data-facet-<key> convention.
const LEGACY: Record<string, string> = {
  audience: "audiences",
  kind: "kind",
  task: "tasks",
};

const isInput = (el: Element): el is HTMLInputElement => el instanceof HTMLInputElement;

const splitAttr = (v: string | undefined): string[] =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const normText = (s: string): string =>
  s.toLowerCase().replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim();

const camelFacet = (key: string): string =>
  `facet${key.charAt(0).toUpperCase()}${key.slice(1)}`;

const controlActive = (el: Element): boolean =>
  isInput(el)
    ? el.checked
    : el.getAttribute("aria-pressed") === "true" ||
      el.getAttribute("aria-selected") === "true" ||
      el.hasAttribute("data-active");

function setControlActive(el: Element, active: boolean): void {
  if (isInput(el)) {
    el.checked = active;
    return;
  }
  el.classList.toggle(ACTIVE_CLASS, active);
  if (el.hasAttribute("aria-selected")) el.setAttribute("aria-selected", String(active));
  else el.setAttribute("aria-pressed", String(active));
  el.toggleAttribute("data-active", active);
}

export function initDirectory(root: Element | Document): void {
  const el = (root instanceof Document ? root.documentElement : root) as HTMLElement;
  if (el.dataset.dirReady === "1") return;
  el.dataset.dirReady = "1";

  const search = el.querySelector<HTMLInputElement>("[data-dir-search]");
  const sortSel = el.querySelector<HTMLSelectElement>("[data-dir-sort]");
  const facetControls = Array.from(el.querySelectorAll<HTMLElement>("[data-dir-facet]"));
  const lists = Array.from(el.querySelectorAll<HTMLElement>("[data-dir-list]"));
  const groups = Array.from(el.querySelectorAll<HTMLElement>("[data-dir-group]"));
  const countEl = el.querySelector<HTMLElement>("[data-dir-count]");
  const emptyEl = el.querySelector<HTMLElement>("[data-dir-empty]");
  const activeEl = el.querySelector<HTMLElement>("[data-dir-active]");
  const pagesEl = el.querySelector<HTMLElement>("[data-dir-pages]");
  const clearEls = Array.from(el.querySelectorAll<HTMLElement>("[data-dir-clear]"));

  const perPage = Number(el.dataset.dirPageSize) || PER_PAGE_DEFAULT;
  let page = 1; // 1-based; clamped to the result set in recompute().

  const itemsByList = lists.map((l) =>
    Array.from(l.querySelectorAll<HTMLElement>("[data-dir-item]")),
  );
  const allItems = itemsByList.flat();

  // Distinct facet keys present, in DOM order.
  const facetKeys = [
    ...new Set(facetControls.map((c) => c.getAttribute("data-dir-facet") ?? "")),
  ].filter(Boolean);

  const controlsFor = (key: string) =>
    facetControls.filter((c) => c.getAttribute("data-dir-facet") === key);

  const modeCache = new Map<string, "single" | "multi">();
  function modeFor(key: string): "single" | "multi" {
    let m = modeCache.get(key);
    if (m) return m;
    const explicit = controlsFor(key)
      .map((c) => c.getAttribute("data-dir-mode"))
      .find(Boolean);
    m = (explicit as "single" | "multi") ?? (key === "audience" ? "single" : "multi");
    modeCache.set(key, m);
    return m;
  }

  const itemVals = (item: HTMLElement, key: string): string[] =>
    splitAttr(item.dataset[camelFacet(key)] ?? item.dataset[LEGACY[key] ?? ""]);

  function activeValues(key: string): Set<string> {
    const out = new Set<string>();
    for (const c of controlsFor(key)) {
      const v = c.getAttribute("data-value") ?? "";
      if (v && controlActive(c)) out.add(v);
    }
    return out;
  }

  const currentSort = (): SortKey => (sortSel?.value as SortKey) || "newest";

  // Search is separator-insensitive: "-", "_", "/" in queries and data (slugs,
  // ids) are treated as spaces, and every whitespace-separated token must match.
  function matchText(item: HTMLElement, q: string): boolean {
    const tokens = normText(q).split(" ").filter(Boolean);
    if (tokens.length === 0) return true;
    const hay = normText(
      `${item.dataset.title ?? ""} ${item.dataset.blurb ?? ""} ${
        item.dataset.author ?? ""
      } ${item.dataset.collection ?? ""} ${item.dataset.slug ?? ""}`,
    );
    return tokens.every((t) => hay.includes(t));
  }

  // Match an item against the active filters, optionally ignoring one facet key
  // (used to compute "if you picked this, you'd get N" facet counts).
  function itemMatches(
    item: HTMLElement,
    q: string,
    active: Map<string, Set<string>>,
    skip?: string,
  ): boolean {
    if (!matchText(item, q)) return false;
    for (const [key, set] of active) {
      if (key === skip || set.size === 0) continue;
      const vals = itemVals(item, key);
      if (![...set].some((v) => vals.includes(v))) return false;
    }
    return true;
  }

  function comparator(sort: SortKey): (a: HTMLElement, b: HTMLElement) => number {
    const ts = (v: string | undefined): number => Date.parse(v ?? "") || 0;
    return (a, b) => {
      if (sort === "title")
        return (a.dataset.title ?? "").localeCompare(b.dataset.title ?? "");
      if (sort === "stars")
        return Number(b.dataset.stars ?? 0) - Number(a.dataset.stars ?? 0);
      // "Newest": when the skill was added to the site; the collection's update
      // date breaks ties (bulk-seeded skills share one created_at instant).
      return (
        ts(b.dataset.created) - ts(a.dataset.created) ||
        ts(b.dataset.updated) - ts(a.dataset.updated)
      );
    };
  }

  const countElFor = (control: HTMLElement): HTMLElement | null =>
    isInput(control)
      ? control.closest("label")?.querySelector<HTMLElement>("[data-dir-facet-count]") ?? null
      : control.querySelector<HTMLElement>("[data-dir-facet-count]");

  function updateFacetCounts(q: string, active: Map<string, Set<string>>): void {
    for (const key of facetKeys) {
      const controls = controlsFor(key);
      if (!controls.some((c) => countElFor(c))) continue;
      const base = allItems.filter((it) => itemMatches(it, q, active, key));
      for (const c of controls) {
        const ce = countElFor(c);
        if (!ce) continue;
        const v = c.getAttribute("data-value") ?? "";
        const n = v ? base.filter((it) => itemVals(it, key).includes(v)).length : base.length;
        ce.textContent = String(n);
        const wrap = isInput(c) ? c.closest("label") ?? c : c;
        wrap.toggleAttribute("data-count-zero", v !== "" && n === 0);
      }
    }
  }

  function renderChips(active: Map<string, Set<string>>): void {
    if (!activeEl) return;
    activeEl.replaceChildren();
    let any = false;
    for (const [key, set] of active) {
      for (const v of set) {
        any = true;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.dataset.dirChip = "";
        chip.dataset.key = key;
        chip.dataset.value = v;
        chip.setAttribute("aria-label", `Remove filter ${v}`);
        const label = document.createElement("span");
        label.textContent = v;
        const x = document.createElement("span");
        x.setAttribute("aria-hidden", "true");
        x.textContent = "✕";
        chip.append(label, x);
        activeEl.appendChild(chip);
      }
    }
    activeEl.toggleAttribute("hidden", !any);
  }

  function syncURL(q: string, active: Map<string, Set<string>>, sort: SortKey): void {
    // Start from the live query string so params the engine doesn't own (?view=,
    // UTM tags) survive a recompute instead of being silently dropped.
    const p = new URLSearchParams(location.search);
    p.delete("q");
    p.delete("sort");
    p.delete("page");
    for (const key of facetKeys) p.delete(key);
    if (q) p.set("q", q);
    for (const [key, set] of active) if (set.size) p.set(key, [...set].join(","));
    if (sort !== "newest") p.set("sort", sort);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  // Build a windowed numeric pager (first · last · current±1, with "…" gaps) flanked
  // by labelled Prev/Next buttons into [data-dir-pages]. Hidden when there's one page.
  const SVG_NS = "http://www.w3.org/2000/svg";
  const chevron = (d: string): SVGSVGElement => {
    const svg = document.createElementNS(SVG_NS, "svg");
    for (const [k, v] of Object.entries({
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.25",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    }))
      svg.setAttribute(k, v);
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    return svg;
  };

  function renderPager(totalPages: number): void {
    if (!pagesEl) return;
    pagesEl.replaceChildren();
    if (totalPages <= 1) {
      pagesEl.toggleAttribute("hidden", true);
      return;
    }
    pagesEl.toggleAttribute("hidden", false);

    const mkNav = (target: "prev" | "next", aria: string, disabled: boolean): void => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.dirPage = target;
      b.className = "dir-pager-nav";
      b.setAttribute("aria-label", aria);
      const label = document.createElement("span");
      label.className = "dir-pager-label";
      label.textContent = target === "prev" ? "Prev" : "Next";
      const chev = chevron(target === "prev" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6");
      // prev → [chevron][label]; next → [label][chevron]
      b.append(...(target === "prev" ? [chev, label] : [label, chev]));
      if (disabled) b.disabled = true;
      pagesEl.appendChild(b);
    };

    // Number buttons + gaps live in their own wrapper, flanked by the nav buttons.
    const numsWrap = document.createElement("div");
    numsWrap.className = "dir-pager-nums";

    const mkNum = (n: number): void => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dir-pager-num";
      b.dataset.dirPage = String(n);
      b.textContent = String(n);
      b.setAttribute("aria-label", `Page ${n}`);
      if (n === page) {
        b.setAttribute("aria-current", "page");
        b.classList.add(ACTIVE_CLASS);
      }
      numsWrap.appendChild(b);
    };

    const mkGap = (): void => {
      const s = document.createElement("span");
      s.dataset.dirPageGap = "";
      s.setAttribute("aria-hidden", "true");
      s.textContent = "…";
      numsWrap.appendChild(s);
    };

    const nums = [...new Set([1, totalPages, page, page - 1, page + 1])]
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);

    mkNav("prev", "Previous page", page === 1);
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) mkGap();
      mkNum(n);
      prev = n;
    }
    pagesEl.appendChild(numsWrap);
    mkNav("next", "Next page", page === totalPages);
  }

  function recompute(): void {
    const q = (search?.value ?? "").trim().toLowerCase();
    const active = new Map(facetKeys.map((k) => [k, activeValues(k)] as const));
    const sort = currentSort();
    const cmp = comparator(sort);

    // Sort each list (so DOM order == sorted order) and gather the matching items
    // across all lists into one ordered set — the window we page over.
    const matched: HTMLElement[] = [];
    lists.forEach((list, i) => {
      const sorted = itemsByList[i].slice().sort(cmp);
      for (const it of sorted) list.appendChild(it);
      for (const it of sorted) if (itemMatches(it, q, active)) matched.push(it);
    });

    const total = matched.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    page = Math.min(Math.max(page, 1), totalPages);
    const start = (page - 1) * perPage;
    const onPage = new Set(matched.slice(start, start + perPage));

    // An item is visible only if it both matches AND falls in the current page.
    for (const it of allItems) it.toggleAttribute("hidden", !onPage.has(it));

    for (const g of groups)
      g.toggleAttribute("hidden", !g.querySelector("[data-dir-item]:not([hidden])"));

    if (countEl) countEl.textContent = String(total);
    if (emptyEl) emptyEl.toggleAttribute("hidden", total !== 0);
    renderPager(totalPages);
    updateFacetCounts(q, active);
    renderChips(active);
    syncURL(q, active, sort);
  }

  // Move to a page (a number, or "prev"/"next") and re-render. Upper bound is
  // clamped inside recompute(); we only guard the lower bound here.
  function goToPage(target: string): void {
    const next =
      target === "prev" ? page - 1 : target === "next" ? page + 1 : Number(target);
    if (!Number.isFinite(next)) return;
    page = Math.max(1, next);
    recompute();
    el.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  function selectValue(key: string, value: string, on: boolean): void {
    const controls = controlsFor(key);
    if (modeFor(key) === "single") {
      for (const c of controls)
        setControlActive(c, on ? (c.getAttribute("data-value") ?? "") === value : (c.getAttribute("data-value") ?? "") === "");
    } else {
      const target = controls.find((c) => (c.getAttribute("data-value") ?? "") === value);
      if (target) setControlActive(target, on);
    }
  }

  function resetAll(): void {
    if (search) search.value = "";
    for (const c of facetControls) {
      const key = c.getAttribute("data-dir-facet") ?? "";
      const v = c.getAttribute("data-value") ?? "";
      setControlActive(c, modeFor(key) === "single" ? v === "" : false);
    }
  }

  function applyInitialState(): void {
    const p = new URLSearchParams(location.search);
    const q = p.get("q");
    if (q && search) search.value = q;
    // Only accept a ?sort= value the select actually offers — assigning an
    // unknown value blanks the control (selectedIndex -1).
    const sort = p.get("sort");
    if (sort && sortSel && [...sortSel.options].some((o) => o.value === sort))
      sortSel.value = sort;
    const pg = Math.floor(Number(p.get("page")));
    if (pg >= 1) page = pg;

    for (const key of facetKeys) {
      const wanted = new Set(splitAttr(p.get(key) ?? ""));
      const controls = controlsFor(key);
      if (modeFor(key) === "single") {
        const matched = controls.some((c) => {
          const v = c.getAttribute("data-value") ?? "";
          return !!v && wanted.has(v);
        });
        for (const c of controls) {
          const v = c.getAttribute("data-value") ?? "";
          setControlActive(c, matched ? !!v && wanted.has(v) : v === "");
        }
      } else {
        for (const c of controls)
          setControlActive(c, wanted.has(c.getAttribute("data-value") ?? ""));
      }
    }
  }

  // Button-style facets are toggled by us; native inputs toggle themselves.
  // Changing the result set resets to page 1; the pager keeps its own page.
  el.addEventListener("click", (e) => {
    const pager = (e.target as HTMLElement).closest<HTMLElement>("[data-dir-page]");
    if (pager && el.contains(pager)) {
      goToPage(pager.dataset.dirPage ?? "");
      return;
    }
    const chip = (e.target as HTMLElement).closest<HTMLElement>("[data-dir-chip]");
    if (chip && el.contains(chip)) {
      page = 1;
      selectValue(chip.dataset.key ?? "", chip.dataset.value ?? "", false);
      recompute();
      return;
    }
    const facet = (e.target as HTMLElement).closest<HTMLElement>("[data-dir-facet]");
    if (!facet || !el.contains(facet) || isInput(facet)) return;
    e.preventDefault();
    page = 1;
    const key = facet.getAttribute("data-dir-facet") ?? "";
    const v = facet.getAttribute("data-value") ?? "";
    if (modeFor(key) === "single") selectValue(key, v, true);
    else setControlActive(facet, !controlActive(facet));
    recompute();
  });

  el.addEventListener("change", (e) => {
    const t = e.target as HTMLElement;
    if ((t.matches("[data-dir-facet]") && isInput(t)) || t === sortSel) {
      page = 1;
      recompute();
    }
  });

  search?.addEventListener("input", () => {
    page = 1;
    recompute();
  });

  // Filter a facet group's options by typed text (appears only when a group is long).
  for (const fs of el.querySelectorAll<HTMLInputElement>("[data-dir-facet-search]")) {
    const key = fs.getAttribute("data-dir-target") ?? fs.getAttribute("data-dir-facet-search") ?? "";
    fs.addEventListener("input", () => {
      const needle = normText(fs.value);
      for (const c of controlsFor(key)) {
        const v = normText(c.getAttribute("data-value") ?? "");
        if (!v) continue;
        const wrap = isInput(c) ? c.closest("label") ?? c : c;
        wrap.toggleAttribute("hidden", needle !== "" && !v.includes(needle));
      }
    });
  }

  for (const b of clearEls)
    b.addEventListener("click", () => {
      page = 1;
      resetAll();
      recompute();
    });

  applyInitialState();
  recompute();
}

for (const node of document.querySelectorAll<HTMLElement>("[data-directory]"))
  initDirectory(node);
