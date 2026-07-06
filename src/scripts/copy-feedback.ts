// Copy-to-clipboard with unmistakable feedback. Shared by the skill and collection
// pages so both behave identically.
//
// Why this exists: the previous inline handlers copied via navigator.clipboard and
// swallowed any failure (`catch { return }`), so when the Clipboard API was blocked
// (unfocused document, denied permission, privacy browsers, non-secure context) the
// copy AND every trace of feedback vanished — users saw nothing, rage-clicked, left.
//
// Fixes:
//   1. Robust copy with an execCommand fallback, so copy works even when the async
//      Clipboard API is unavailable.
//   2. A prominent global "Copied!" toast on real success — the primary signal —
//      on top of the existing in-place icon-swap / label feedback.
//   3. A distinct error toast when a copy genuinely fails, instead of silence.
//
// Contract (unchanged markup):
//   [data-copy-cmd]  — icon button; on success flips the DaisyUI swap (copy→check).
//   [data-paste-cta] — CTA button; on success swaps its [data-paste-label] text.
//   both carry data-copy="<text to copy>".
//   [data-copy-target] — element whose ID is passed to the toast for a11y (optional).

/** Copy text to the clipboard, returning true only if a copy actually happened. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the execCommand fallback
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// --- Toast ---------------------------------------------------------------------

let toastEl: HTMLElement | null = null;
let toastTimer = 0;

/** Lazily build the single fixed toast container appended to <body>. */
function ensureToast(): HTMLElement {
  if (toastEl) return toastEl;
  const container = document.createElement("div");
  container.className = "toast toast-center toast-bottom z-50";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  container.style.pointerEvents = "none";
  document.body.appendChild(container);
  toastEl = container;
  return container;
}

const CHECK_ICON = `<svg viewBox="0 0 24 24" class="size-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>`;
const WARN_ICON = `<svg viewBox="0 0 24 24" class="size-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>`;

/** Show a toast; re-triggers cleanly on rapid clicks. */
function showToast(message: string, variant: "success" | "error" = "success"): void {
  const container = ensureToast();
  const alertClass = variant === "success" ? "alert-success" : "alert-error";
  const icon = variant === "success" ? CHECK_ICON : WARN_ICON;
  container.innerHTML = `<div class="alert ${alertClass} gap-2 rounded-[12px] px-4 py-3 text-[14px] font-semibold shadow-lg">${icon}<span>${message}</span></div>`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (toastEl) toastEl.innerHTML = "";
  }, 2200);
}

// --- Bindings ------------------------------------------------------------------

const COPY_FAIL_MSG = "Couldn’t copy — select the command and press ⌘/Ctrl+C";

// Icon buttons: keep the DaisyUI swap (copy→check) on success, add the toast.
for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-copy-cmd]")) {
  btn.addEventListener("click", async () => {
    const text = btn.getAttribute("data-copy");
    if (!text) return;
    if (!(await copyText(text))) {
      showToast(COPY_FAIL_MSG, "error");
      return;
    }
    btn.classList.add("swap-active");
    window.clearTimeout(Number(btn.dataset.copyTimer));
    btn.dataset.copyTimer = String(
      window.setTimeout(() => btn.classList.remove("swap-active"), 1500),
    );
    showToast("Copied!");
  });
}

// "Copy install command" CTA: keep the label swap on success, add the toast.
for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-paste-cta]")) {
  btn.addEventListener("click", async () => {
    const text = btn.getAttribute("data-copy");
    if (!text) return;
    if (!(await copyText(text))) {
      showToast(COPY_FAIL_MSG, "error");
      return;
    }
    const label = btn.querySelector<HTMLElement>("[data-paste-label]");
    if (label) {
      if (!btn.dataset.pasteLabel) btn.dataset.pasteLabel = label.textContent ?? "";
      label.textContent = "Copied — now paste it into your agent";
      window.clearTimeout(Number(btn.dataset.pasteTimer));
      btn.dataset.pasteTimer = String(
        window.setTimeout(() => {
          label.textContent = btn.dataset.pasteLabel ?? "";
        }, 2200),
      );
    }
    showToast("Copied!");
  });
}

// PostHog capture for install CTAs (no-op where such elements are absent).
for (const el of document.querySelectorAll<HTMLElement>(".ph-install-cta")) {
  el.addEventListener("click", () => {
    window.posthog?.capture("skill_repo_clicked", {
      skill_slug: el.dataset.skillSlug,
      kind: el.dataset.skillKind,
    });
  });
}
