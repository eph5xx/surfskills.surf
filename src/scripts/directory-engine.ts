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
  const clearEls = Array.from(el.querySelectorAll<HTMLElement>("[data-dir-clear]"));

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

  function matchText(item: HTMLElement, q: string): boolean {
    if (!q) return true;
    const hay = `${item.dataset.title ?? ""} ${item.dataset.blurb ?? ""} ${
      item.dataset.author ?? ""
    } ${item.dataset.collection ?? ""}`.toLowerCase();
    return hay.includes(q);
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
    return (a, b) => {
      if (sort === "title")
        return (a.dataset.title ?? "").localeCompare(b.dataset.title ?? "");
      if (sort === "stars")
        return Number(b.dataset.stars ?? 0) - Number(a.dataset.stars ?? 0);
      return (Date.parse(b.dataset.updated ?? "") || 0) - (Date.parse(a.dataset.updated ?? "") || 0);
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
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    for (const [key, set] of active) if (set.size) p.set(key, [...set].join(","));
    if (sort !== "newest") p.set("sort", sort);
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  function recompute(): void {
    const q = (search?.value ?? "").trim().toLowerCase();
    const active = new Map(facetKeys.map((k) => [k, activeValues(k)] as const));
    const sort = currentSort();
    const cmp = comparator(sort);
    let visible = 0;

    lists.forEach((list, i) => {
      const sorted = itemsByList[i].slice().sort(cmp);
      for (const it of sorted) list.appendChild(it);
      for (const it of sorted) {
        const ok = itemMatches(it, q, active);
        it.toggleAttribute("hidden", !ok);
        if (ok) visible += 1;
      }
    });

    for (const g of groups)
      g.toggleAttribute("hidden", !g.querySelector("[data-dir-item]:not([hidden])"));

    if (countEl) countEl.textContent = String(visible);
    if (emptyEl) emptyEl.toggleAttribute("hidden", visible !== 0);
    updateFacetCounts(q, active);
    renderChips(active);
    syncURL(q, active, sort);
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
    const sort = p.get("sort");
    if (sort && sortSel) sortSel.value = sort;

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
  el.addEventListener("click", (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>("[data-dir-chip]");
    if (chip && el.contains(chip)) {
      selectValue(chip.dataset.key ?? "", chip.dataset.value ?? "", false);
      recompute();
      return;
    }
    const facet = (e.target as HTMLElement).closest<HTMLElement>("[data-dir-facet]");
    if (!facet || !el.contains(facet) || isInput(facet)) return;
    e.preventDefault();
    const key = facet.getAttribute("data-dir-facet") ?? "";
    const v = facet.getAttribute("data-value") ?? "";
    if (modeFor(key) === "single") selectValue(key, v, true);
    else setControlActive(facet, !controlActive(facet));
    recompute();
  });

  el.addEventListener("change", (e) => {
    const t = e.target as HTMLElement;
    if ((t.matches("[data-dir-facet]") && isInput(t)) || t === sortSel) recompute();
  });

  search?.addEventListener("input", recompute);

  // Filter a facet group's options by typed text (appears only when a group is long).
  for (const fs of el.querySelectorAll<HTMLInputElement>("[data-dir-facet-search]")) {
    const key = fs.getAttribute("data-dir-target") ?? fs.getAttribute("data-dir-facet-search") ?? "";
    fs.addEventListener("input", () => {
      const needle = fs.value.trim().toLowerCase();
      for (const c of controlsFor(key)) {
        const v = (c.getAttribute("data-value") ?? "").toLowerCase();
        if (!v) continue;
        const wrap = isInput(c) ? c.closest("label") ?? c : c;
        wrap.toggleAttribute("hidden", needle !== "" && !v.includes(needle));
      }
    });
  }

  for (const b of clearEls)
    b.addEventListener("click", () => {
      resetAll();
      recompute();
    });

  applyInitialState();
  recompute();
}

for (const node of document.querySelectorAll<HTMLElement>("[data-directory]"))
  initDirectory(node);
