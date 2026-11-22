// Navigation controls: live reading progress, scroll-spy, desktop vernier ruler,
// mobile translucent scrub dial + full-screen translucent overlay, and keyboard shortcuts.

const navDataEl = document.getElementById("site-nav-data");
const NAV = navDataEl ? JSON.parse(navDataEl.textContent || "{}") : null;

// -------------------------------------------- 1. Live Scroll Trace & Spy
const spySections = [...document.querySelectorAll("[data-spy-section]")];
const spyLinks = [...document.querySelectorAll("[data-spy-target]")];

function updateScrollSpy() {
  if (!spySections.length || !spyLinks.length) return;
  const atBottom =
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40;
  let activeId = spySections[0].getAttribute("data-spy-section");
  if (atBottom) {
    activeId = spySections[spySections.length - 1].getAttribute("data-spy-section");
  } else {
    const threshold = window.innerHeight * 0.38;
    for (const sec of spySections) {
      if (sec.getBoundingClientRect().top <= threshold) {
        activeId = sec.getAttribute("data-spy-section");
      }
    }
  }
  for (const link of spyLinks) {
    if (link.getAttribute("data-spy-target") === activeId) {
      link.setAttribute("data-spy-active", "true");
    } else {
      link.removeAttribute("data-spy-active");
    }
  }
}

function updateScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 8 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  document.documentElement.style.setProperty("--scroll-progress", ratio.toFixed(4));
  updateScrollSpy();
}

updateScrollProgress();
window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress, { passive: true });

// ------------------------------- 2. Mobile Translucent Dial & Overlay Menu
const dialNav = document.querySelector(".dial");
const dialCore = document.getElementById("dial-core");
const dialPreview = document.getElementById("dial-preview");
const dialPreviewLabel = document.getElementById("dial-preview-label");
const dialVernier = document.getElementById("dial-vernier");
const navOverlay = document.getElementById("nav-overlay");
const ovClose = document.getElementById("ov-close");

function openOverlay() {
  if (!(navOverlay instanceof HTMLDialogElement)) return;
  if (!navOverlay.open) {
    navOverlay.showModal();
    dialCore?.setAttribute("aria-expanded", "true");
  }
}

function closeOverlay() {
  if (!(navOverlay instanceof HTMLDialogElement)) return;
  if (navOverlay.open) {
    navOverlay.close();
    dialCore?.setAttribute("aria-expanded", "false");
  }
}

if (navOverlay instanceof HTMLDialogElement) {
  ovClose?.addEventListener("click", closeOverlay);
  navOverlay.addEventListener("close", () => {
    dialCore?.setAttribute("aria-expanded", "false");
  });
  // Close when tapping in-page anchor links
  navOverlay.querySelectorAll('a[href*="#"]').forEach((anchor) => {
    anchor.addEventListener("click", closeOverlay);
  });
}

if (dialCore && NAV && Array.isArray(NAV.stops) && NAV.stops.length > 0) {
  const stops = NAV.stops;
  const baseIndex = Math.min(Math.max(0, Number(NAV.activeIndex) || 0), stops.length - 1);
  const majorTicks = dialVernier ? [...dialVernier.querySelectorAll(".v-major")] : [];

  const highlightTick = (idx) => {
    majorTicks.forEach((tick, i) => {
      tick.classList.toggle("is-active", i === idx);
    });
  };

  let dragging = false;
  let scrubbed = false;
  let startX = 0;
  let targetIndex = baseIndex;

  dialCore.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    dragging = true;
    scrubbed = false;
    startX = event.clientX;
    targetIndex = baseIndex;
    dialCore.setPointerCapture(event.pointerId);
  });

  dialCore.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    if (!scrubbed && Math.abs(dx) >= 10) {
      scrubbed = true;
      dialCore.classList.add("is-scrubbing");
      dialNav?.classList.add("is-scrubbing");
    }
    if (!scrubbed) return;

    // Gentle damped physical shift of the vernier scale under the thumb
    const clampedShift = Math.max(-14, Math.min(14, dx * 0.14));
    document.documentElement.style.setProperty("--vernier-shift", `${clampedShift.toFixed(1)}px`);

    const stepPx = 40;
    const offset = Math.round(dx / stepPx);
    const nextIdx = Math.min(stops.length - 1, Math.max(0, baseIndex + offset));

    if (nextIdx !== targetIndex) {
      targetIndex = nextIdx;
      highlightTick(targetIndex);
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(6);
      }
    }

    const stop = stops[targetIndex];
    if (dialPreview && dialPreviewLabel && stop) {
      dialPreviewLabel.textContent = stop.label || "";
      dialPreview.hidden = false;
    }
  });

  const finishScrub = (commit) => {
    if (!dragging) return;
    dragging = false;
    dialCore.classList.remove("is-scrubbing");
    dialNav?.classList.remove("is-scrubbing");
    document.documentElement.style.setProperty("--vernier-shift", "0px");
    if (dialPreview) dialPreview.hidden = true;

    if (scrubbed) {
      scrubbed = false;
      if (commit && targetIndex !== baseIndex && stops[targetIndex]) {
        window.location.assign(stops[targetIndex].href);
      } else {
        highlightTick(baseIndex);
      }
    } else if (commit) {
      openOverlay();
    }
  };

  dialCore.addEventListener("pointerup", () => finishScrub(true));
  dialCore.addEventListener("pointercancel", () => finishScrub(false));

  dialCore.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openOverlay();
    }
  });
}

// ------------------------------------------------ 4. Keyboard Browsing
const KEYNAV_TS_KEY = "mj-cv-keynav-at";
let navigating = false;

document.addEventListener("keydown", (event) => {
  if (
    navigating ||
    event.repeat ||
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return;
  }
  if (navOverlay instanceof HTMLDialogElement && navOverlay.open) return;

  try {
    const lastNav = Number(sessionStorage.getItem(KEYNAV_TS_KEY) || "0");
    if (Date.now() - lastNav < 250) return;
  } catch {}

  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest("input, textarea, select, video"))
  ) {
    return;
  }

  const rel = { ArrowLeft: "prev", ArrowRight: "next", Escape: "up" }[event.key];
  if (!rel) return;

  const link = document.querySelector(`a[data-key-nav="${rel}"]`);
  if (link instanceof HTMLAnchorElement) {
    event.preventDefault();
    navigating = true;
    try {
      sessionStorage.setItem(KEYNAV_TS_KEY, String(Date.now()));
    } catch {}
    window.location.assign(link.href);
  }
});
