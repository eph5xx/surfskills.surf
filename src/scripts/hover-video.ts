// YouTube-style previews for a grid of [data-hover-video] cards. Poster still at rest;
// the video crossfades in while active and returns to the still when it stops. Desktop
// plays on hover/focus; touch autoplays the card in view (IntersectionObserver).
// Reduced-motion keeps the poster on both. `.is-playing` (added on the `playing` event,
// so there's no black flash) drives the CSS crossfade. Mirrors the Discover engine's
// inline copy in components/discover/Directory.astro.
export function initHoverVideo(rootSelector: string): void {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const play = (v: HTMLVideoElement) => {
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };
  const stop = (v: HTMLVideoElement) => {
    v.classList.remove("is-playing");
    v.pause();
    try {
      v.currentTime = 0;
    } catch {}
  };

  const videos = root.querySelectorAll<HTMLVideoElement>("[data-hover-video]");
  // Only reveal the video once frames are actually decoding.
  for (const v of videos) v.addEventListener("playing", () => v.classList.add("is-playing"));

  if (window.matchMedia("(hover: hover)").matches) {
    for (const v of videos) {
      const card = v.closest(".dc-item") ?? v;
      card.addEventListener("pointerenter", () => play(v));
      card.addEventListener("pointerleave", () => stop(v));
      card.addEventListener("focusin", () => play(v));
      card.addEventListener("focusout", () => stop(v));
    }
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target.querySelector<HTMLVideoElement>("[data-hover-video]");
          if (!v) continue;
          if (e.isIntersecting) play(v);
          else stop(v);
        }
      },
      { threshold: 0.6, rootMargin: "-10% 0px -10% 0px" },
    );
    for (const v of videos) io.observe(v.closest(".dc-item") ?? v);
  }
}
